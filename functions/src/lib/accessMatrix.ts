import { query } from "./dataconnect-admin";
import type { Role } from "./auth";

export type DocumentType =
  | "PITCH_DECK"
  | "DD_REPORT"
  | "DATA_ROOM"
  | "COMPANY_UPDATE_DOC"
  | "SPA"
  | "ALLOCATION_SCHEDULE";

// Deliberately not filtered by company status or scenario — queries the immutable
// Allocation/MemberValuation history directly, so access survives a full exit, write-off,
// or company archival (plan §3, PRD §8.5).
export async function hasHeldAllocation(memberId: string, companyId: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM "allocation" a
       JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
       WHERE a."member_id" = $1 AND le."company_id" = $2
     ) OR EXISTS (
       SELECT 1 FROM "member_valuation" mv
       JOIN "ledger_entry" le ON le.id = mv."ledger_entry_id"
       WHERE mv."member_id" = $1 AND le."company_id" = $2
     ) AS exists`,
    [memberId, companyId]
  );
  return Boolean(rows[0]?.exists);
}

export interface AccessCheckResult {
  granted: boolean;
  reason: string;
}

// Admin / site_admin / dev_site_admin gets everything; PITCH_DECK/DD_REPORT are open to any
// active member; DATA_ROOM/COMPANY_UPDATE_DOC require having held an allocation;
// SPA/ALLOCATION_SCHEDULE are admin-only, unconditionally (plan §3).
export async function checkDocumentAccess(
  role: Role,
  memberId: string,
  companyId: string,
  docType: DocumentType
): Promise<AccessCheckResult> {
  if (role === "admin" || role === "site_admin" || role === "dev_site_admin") {
    return { granted: true, reason: "admin" };
  }

  if (docType === "SPA" || docType === "ALLOCATION_SCHEDULE") {
    return { granted: false, reason: "admin-only document type" };
  }

  if (docType === "PITCH_DECK" || docType === "DD_REPORT") {
    return { granted: true, reason: "open to any active member" };
  }

  // DATA_ROOM / COMPANY_UPDATE_DOC
  const held = await hasHeldAllocation(memberId, companyId);
  return held
    ? { granted: true, reason: "member held an allocation in this company" }
    : { granted: false, reason: "member never held an allocation in this company" };
}
