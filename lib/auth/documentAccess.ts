import type { Role } from "@/lib/auth/claims";
import { DocumentType } from "@/lib/dataconnect/generated";

// Mirrors functions/src/lib/accessMatrix.ts's checkDocumentAccess exactly (plan §3) — this
// copy is pure/sync so page code can decide whether to render DocumentLink at all, without a
// round-trip. It is NOT the enforcement point: /api/documents/[id] re-derives this same
// decision server-side against the live Allocation/MemberValuation history before serving a
// single byte, per documents-getAccessUrl.ts's own comment to that effect.
//
// isOrgMember is only relevant for admin-role callers: an admin who hasn't been assigned to the
// organization (no organization_member row) is treated as non-admin for document access purposes,
// consistent with the org-gate rollout. Defaults to true so existing callers (pages that don't
// check org membership) see no behavior change — only the document API routes pass false when
// the admin has no membership.
export function canViewDocument(
  role: Role,
  docType: DocumentType,
  hasHeldAllocation: boolean,
  isOrgMember: boolean = true
): boolean {
  // Admin-tier roles get everything, but an admin without org membership is denied.
  if (role === "admin") {
    return isOrgMember;
  }
  if (role === "site_admin" || role === "dev_site_admin") return true;
  if (docType === DocumentType.SPA || docType === DocumentType.ALLOCATION_SCHEDULE) return false;
  if (docType === DocumentType.PITCH_DECK || docType === DocumentType.DD_REPORT) return true;
  return hasHeldAllocation; // DATA_ROOM / COMPANY_UPDATE_DOC
}
