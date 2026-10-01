import type { Role } from "@/lib/auth/claims";
import { DocumentType } from "@/lib/dataconnect/generated";

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
  if (role === "admin" || role === "site_admin" || role === "dev_site_admin") return true;
  if (docType === DocumentType.SPA || docType === DocumentType.ALLOCATION_SCHEDULE) return false;
  if (docType === DocumentType.PITCH_DECK || docType === DocumentType.DD_REPORT) return true;
  return hasHeldAllocation; // DATA_ROOM / COMPANY_UPDATE_DOC
}
