import "server-only";
import { getDataConnect } from "firebase-admin/data-connect";
import { adminApp } from "@/lib/firebase/admin";
import { connectorConfig, DocumentType, LedgerEntryType, type Scenario } from "@/lib/dataconnect/generated";
import type { CurrentMember } from "@/lib/auth/currentMember";
import { canViewDocument } from "@/lib/auth/documentAccess";
import { listMemberAllocationsAllScenarios, listMemberValuationsAllScenarios } from "@/lib/dataconnect/client";
import { listDriveFolderFiles } from "@/lib/serverDrive";

export class RoundDocumentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

interface RoundSource {
  ledgerEntry: { type: LedgerEntryType; scenario: Scenario; company: { id: string } } | null;
  pricedRoundDetails: { driveFolderId: string | null }[];
  safeRoundDetails: { driveFolderId: string | null }[];
  nonParticipatingRoundDetails: { driveFolderId: string | null }[];
  member: { lockedScenario: Scenario | null } | null;
  organizationMembers: { id: string }[];
}

function dc() {
  return getDataConnect({ location: connectorConfig.location, serviceId: connectorConfig.service, connector: connectorConfig.connector }, adminApp);
}

// These server-only Admin SDK reads use the existing schema. No new public connector
// operations are needed; authorization is derived from the verified session below.
// Organization membership was introduced by SQL post-migrations and may not be in
// the deployed GraphQL schema. Use a parameterized read of that existing table.
export async function getRoundDocuments(ledgerEntryId: string, member: CurrentMember) {
  const { data } = await dc().executeGraphqlRead<RoundSource, { entryId: string; memberId: string }>(`
    query RoundDocumentSource($entryId: UUID!, $memberId: String!) {
      ledgerEntry(key: {id: $entryId}) { type scenario company { id } }
      pricedRoundDetails(where: {ledgerEntry: {id: {eq: $entryId}}}, limit: 1) { driveFolderId }
      safeRoundDetails(where: {ledgerEntry: {id: {eq: $entryId}}}, limit: 1) { driveFolderId }
      nonParticipatingRoundDetails(where: {ledgerEntry: {id: {eq: $entryId}}}, limit: 1) { driveFolderId }
      member(key: {id: $memberId}) { lockedScenario }
      organizationMembers: _select(
        sql: "SELECT id FROM organization_member WHERE member_id = $1 LIMIT 1"
        params: [$memberId]
      )
    }
  `, { variables: { entryId: ledgerEntryId, memberId: member.memberId } });
  const entry = data.ledgerEntry;
  if (!entry) throw new RoundDocumentError(404, "Round not found.");
  const details = entry.type === LedgerEntryType.PARTICIPATING_PRICED_ROUND ? data.pricedRoundDetails
    : entry.type === LedgerEntryType.PARTICIPATING_SAFE_ROUND ? data.safeRoundDetails
    : entry.type === LedgerEntryType.NON_PARTICIPATING_ROUND ? data.nonParticipatingRoundDetails : [];
  const folderId = details[0]?.driveFolderId;
  if (!folderId) throw new RoundDocumentError(404, "No document folder is linked to this round.");
  if ((member.role === "user" || member.role === "admin") && data.member?.lockedScenario && data.member.lockedScenario !== entry.scenario) {
    throw new RoundDocumentError(403, "This scenario is not available to your account.");
  }
  const isOrgMember = member.role !== "admin" || data.organizationMembers.length > 0;
  if (!isOrgMember) throw new RoundDocumentError(403, "Your account is not assigned to the organization.");

  let hasHeldAllocation = false;
  if (member.role !== "admin" && member.role !== "site_admin" && member.role !== "dev_site_admin") {
    const [{ allocations }, { memberValuations }] = await Promise.all([
      listMemberAllocationsAllScenarios(member.authUid), listMemberValuationsAllScenarios(member.authUid),
    ]);
    hasHeldAllocation = allocations.some((row) => row.ledgerEntry.company.id === entry.company.id)
      || memberValuations.some((row) => row.ledgerEntry.company.id === entry.company.id);
  }

  const files = await listDriveFolderFiles(folderId);
  type TrackedDocument = { id: string; driveFileId: string; docType: DocumentType; company: { id: string } };
  const trackedByFile = new Map<string, TrackedDocument>();
  for (let offset = 0; offset < files.length; offset += 100) {
    const { data: tracked } = await dc().executeGraphqlRead<{ documents: TrackedDocument[] }, { fileIds: string[] }>(`
      query RoundDocumentTypes($fileIds: [String!]!) {
        documents(where: {driveFileId: {in: $fileIds}}, limit: 100) { id driveFileId docType company { id } }
      }
    `, { variables: { fileIds: files.slice(offset, offset + 100).map((file) => file.id) } });
    for (const doc of tracked.documents) trackedByFile.set(doc.driveFileId, doc);
  }
  return files.filter((file) => {
    const tracked = trackedByFile.get(file.id);
    if (tracked && tracked.company.id !== entry.company.id) return false;
    // As in sync-from-Drive, unclassified files in round/data-room folders default
    // to DATA_ROOM (allocation-gated). Known SPA/allocation restrictions still apply.
    return canViewDocument(member.role, tracked?.docType ?? DocumentType.DATA_ROOM, hasHeldAllocation, isOrgMember);
  });
}
