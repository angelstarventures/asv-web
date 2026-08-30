import type { Role } from "@/lib/auth/claims";

// Not part of the generated Data Connect SDK — no defined query/mutation selects a
// DocumentType field yet (documents aren't wired up until Milestone 4), so codegen never
// emits it. Mirrors the enum values in dataconnect/schema/schema.gql exactly.
export type DocumentType =
  | "PITCH_DECK"
  | "DD_REPORT"
  | "DATA_ROOM"
  | "COMPANY_UPDATE_DOC"
  | "SPA"
  | "ALLOCATION_SCHEDULE";

// Mirrors functions/src/lib/accessMatrix.ts's checkDocumentAccess exactly (plan §3) — this
// copy is pure/sync so page code can decide whether to render DocumentLink at all, without a
// round-trip. It is NOT the enforcement point: /api/documents/[id] re-derives this same
// decision server-side against the live Allocation/MemberValuation history before serving a
// single byte, per documents-getAccessUrl.ts's own comment to that effect.
export function canViewDocument(
  role: Role,
  docType: DocumentType,
  hasHeldAllocation: boolean
): boolean {
  if (role === "admin") return true;
  if (docType === "SPA" || docType === "ALLOCATION_SCHEDULE") return false;
  if (docType === "PITCH_DECK" || docType === "DD_REPORT") return true;
  return hasHeldAllocation; // DATA_ROOM / COMPANY_UPDATE_DOC
}
