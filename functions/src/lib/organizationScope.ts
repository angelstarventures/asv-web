import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { query } from "./dataconnect-admin";
import { requireAdmin, type CallerContext } from "./auth";

// Organization-scoping helpers for the "admin" role. The Organization is the angel
// fund/tenant itself (see schema.gql's comment) — distinct from Company, a portfolio
// startup ASV has invested in. site_admin/dev_site_admin are global — never scoped to a
// single organization — so every function here short-circuits for those roles rather than
// querying organization_member at all. developer never reaches these (every caller of this
// file has already passed requireAdmin, which excludes developer).
//
// Critical rule for every call site: a client-supplied organizationId from an admin caller
// must never be trusted directly — always run it through requireOrganizationScopedAccess
// first. This is the exact bug class Phase 1 fixed in getCompanyFeatures/getMemberCompanyFeatures.

// Returns the organization IDs the caller (an admin) is scoped to via their
// OrganizationMember row(s). Empty array for an admin with no row yet (not backfilled), or
// for any non-admin role — callers should already know their own role, but returning []
// here is a safe fallback either way (an empty scope denies everything downstream).
export async function getCallerOrganizationIds(caller: CallerContext): Promise<string[]> {
  if (caller.role !== "admin") return [];
  const rows = await query<{ organizationId: string }>(
    `SELECT "organization_id" AS "organizationId" FROM "organization_member" WHERE "member_id" = $1`,
    [caller.memberId]
  );
  return rows.map((r) => r.organizationId);
}

// Throws unless the caller is globally unscoped (site_admin/dev_site_admin) or is an admin
// whose organization set includes resourceOrganizationId.
export async function requireOrganizationScopedAccess(
  caller: CallerContext,
  resourceOrganizationId: string
): Promise<void> {
  if (caller.role === "site_admin" || caller.role === "dev_site_admin") return;
  const organizationIds = await getCallerOrganizationIds(caller);
  if (!organizationIds.includes(resourceOrganizationId)) {
    throw new HttpsError("permission-denied", "Not authorized for this organization.");
  }
}

// For list/query endpoints: undefined means "no filter, caller is global" (site_admin/
// dev_site_admin) — the caller sees everything. Otherwise, the caller's own
// organization-id list, to use as an `IN` filter so an admin's results are restricted to
// their organization.
export async function getOrganizationFilterForCaller(caller: CallerContext): Promise<string[] | undefined> {
  if (caller.role === "site_admin" || caller.role === "dev_site_admin") return undefined;
  return getCallerOrganizationIds(caller);
}

// ── Central admin gate ──────────────────────────────────────────────────────
// Every admin-tier callable uses this instead of bare requireAdmin. For admin-role
// callers it additionally checks they have at least one organization_member row (i.e.
// they've been assigned to the org). site_admin/dev_site_admin bypass the check.
//
// Rollout is controlled by ORG_GATE_MODE env var:
//   "log"      — log would-be denials and allow (safe default during rollout)
//   "enforce"  — actually throw permission-denied
// Defaults to "log" so an incomplete backfill never silently locks someone out.
const ORG_GATE_MODE = (process.env.ORG_GATE_MODE ?? "log") === "enforce" ? "enforce" : "log";

export async function requireOrgAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireAdmin(request);

  // site_admin/dev_site_admin are always global — no org-scoping check needed.
  if (caller.role === "site_admin" || caller.role === "dev_site_admin") {
    return caller;
  }

  const orgIds = await getCallerOrganizationIds(caller);
  if (orgIds.length > 0) {
    return caller; // Has at least one org assignment — allowed.
  }

  // No org_member row found.
  if (ORG_GATE_MODE === "log") {
    console.warn(
      `[ORG_GATE] would-deny: memberId=${caller.memberId} role=${caller.role} ` +
      `uid=${caller.uid} — no organization_member row. Allowing in log mode. ` +
      `Set ORG_GATE_MODE=enforce once backfill is confirmed complete.`
    );
    return caller;
  }

  throw new HttpsError(
    "permission-denied",
    "Your account isn't assigned to the organization yet. Ask a dev-site-admin to add you."
  );
}
