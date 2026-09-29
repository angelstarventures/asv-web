import { HttpsError } from "firebase-functions/v2/https";
import { query } from "./dataconnect-admin";
import type { CallerContext } from "./auth";

// Company-scoping helpers for the "admin" role. site_admin/dev_site_admin are global —
// never scoped to a single company — so every function here short-circuits for those roles
// rather than querying company_member at all. developer never reaches these (every caller
// of this file has already passed requireAdmin, which excludes developer).
//
// Critical rule for every call site: a client-supplied companyId from an admin caller must
// never be trusted directly — always run it through requireCompanyScopedAccess first. This
// is the exact bug class Phase 1 fixed in getCompanyFeatures/getMemberCompanyFeatures.

// Returns the company IDs the caller (an admin) is scoped to via their CompanyMember
// row(s). Empty array for an admin with no row yet (not backfilled), or for any non-admin
// role — callers should already know their own role, but returning [] here is a safe
// fallback either way (an empty scope denies everything downstream).
export async function getCallerCompanyIds(caller: CallerContext): Promise<string[]> {
  if (caller.role !== "admin") return [];
  const rows = await query<{ companyId: string }>(
    `SELECT "company_id" AS "companyId" FROM "company_member" WHERE "member_id" = $1`,
    [caller.memberId]
  );
  return rows.map((r) => r.companyId);
}

// Throws unless the caller is globally unscoped (site_admin/dev_site_admin) or is an admin
// whose company set includes resourceCompanyId.
export async function requireCompanyScopedAccess(
  caller: CallerContext,
  resourceCompanyId: string
): Promise<void> {
  if (caller.role === "site_admin" || caller.role === "dev_site_admin") return;
  const companyIds = await getCallerCompanyIds(caller);
  if (!companyIds.includes(resourceCompanyId)) {
    throw new HttpsError("permission-denied", "Not authorized for this company.");
  }
}

// For list/query endpoints: undefined means "no filter, caller is global" (site_admin/
// dev_site_admin) — the caller sees everything. Otherwise, the caller's own company-id
// list, to use as an `IN` filter so an admin's results are restricted to their company.
export async function getCompanyFilterForCaller(caller: CallerContext): Promise<string[] | undefined> {
  if (caller.role === "site_admin" || caller.role === "dev_site_admin") return undefined;
  return getCallerCompanyIds(caller);
}
