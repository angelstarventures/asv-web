import { getAuth } from "firebase-admin/auth";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { query } from "./dataconnect-admin";

// The full set of app-level roles. Stored on Member.role + Firebase Auth custom claims.
// Hierarchy (higher = more permissions): developer < dev_site_admin ≈ site_admin < admin < user
//   developer       — outside ASV, tech-only (deploy, migrate, maintain)
//   dev_site_admin  — outside ASV, full tech + user management
//   site_admin      — inside or outside ASV, full admin across the board
//   admin           — ASV member, company-scoped management
//   user            — ASV member, no special permissions
export type Role = "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";

export interface CallerContext {
  uid: string;
  memberId: string;
  role: Role;
  status: "active" | "disabled";
}

// Every Cloud Function starts here — never reads memberId/role from the request body.
// Independently re-checks the token on every call rather than trusting a previously cached
// claim (plan §3, Data isolation).
export async function requireCaller(request: CallableRequest): Promise<CallerContext> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }

  // Re-fetch the user record rather than trusting request.auth.token verbatim, so a claims
  // change (e.g. disabling a member) takes effect on the very next call.
  const user = await getAuth().getUser(request.auth.uid);
  const claims = user.customClaims as { role?: string; status?: string; memberId?: string } | undefined;

  if (!claims?.memberId || !claims.role || !claims.status) {
    throw new HttpsError("permission-denied", "Account is not fully provisioned.");
  }
  if (claims.status !== "active") {
    throw new HttpsError("permission-denied", "Account is disabled.");
  }

  const role = claims.role as Role;
  // Validate that the role is one of the known values
  const VALID_ROLES: readonly Role[] = ["developer", "dev_site_admin", "site_admin", "admin", "user"];
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("permission-denied", `Unknown role: ${role}`);
  }

  return {
    uid: user.uid,
    memberId: claims.memberId,
    role,
    status: claims.status as "active" | "disabled",
  };
}

// ── Permission checkers ────────────────────────────────────────────────────
// Each function checks the caller holds one of the named roles. developer/dev_site_admin/
// site_admin form the "technical" tier (deploy, migrate, maintain, full user management);
// admin/user are ASV-member-only roles and never satisfy a developer-tier check, regardless
// of any numeric ordering — explicit role lists here, not a hierarchy comparison, since a
// previous numeric-hierarchy version of requireDeveloper/requireDevSiteAdmin had a bug where
// >= comparisons against the wrong baseline let every role (including "user") pass.

// Any authenticated, active account — the baseline for every callable.
export function hasBasicAccess(caller: CallerContext): boolean {
  return caller.status === "active";
}

// developer, dev_site_admin, or site_admin — for deploy, migration, maintenance surfaces.
export async function requireDeveloper(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "developer" && caller.role !== "dev_site_admin" && caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Developer role required.");
  }
  return caller;
}

// dev_site_admin or site_admin — for user management, DB management, feature toggles.
export async function requireDevSiteAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "dev_site_admin" && caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Dev-site-admin role required.");
  }
  return caller;
}

// admin or site_admin — the previous requireAdmin equivalent, now explicitly
// excludes developer / dev_site_admin from admin-tier company management.
export async function requireAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "admin" && caller.role !== "site_admin" && caller.role !== "dev_site_admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
  return caller;
}

// Strict site_admin or dev_site_admin — for root surfaces (Settings, costs, portfolios).
// dev_site_admin is included here because the migration sets both devSiteAdminMode and
// siteAdminMode claims for dev_site_admin accounts that act as site admins.
export async function requireSiteAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "site_admin" && caller.role !== "dev_site_admin") {
    throw new HttpsError("permission-denied", "Site-admin role required.");
  }
  return caller;
}

// site_admin or dev_site_admin — for feature toggling and all-user management.
export async function requireAllUserManagement(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "site_admin" && caller.role !== "dev_site_admin") {
    throw new HttpsError("permission-denied", "Full user management requires site-admin or dev-site-admin role.");
  }
  return caller;
}

// EXACTLY the given role, not a tier — for boundaries narrower than any of the checkers
// above. OrganizationMember assignment is dev_site_admin-only by explicit product decision
// (not dev_site_admin-or-site_admin, unlike requireDevSiteAdmin's tier check) — do not swap
// this for requireDevSiteAdmin, that would silently widen who can assign org membership.
export async function requireExactRole(request: CallableRequest, role: Role): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== role) {
    throw new HttpsError("permission-denied", `${role} role required.`);
  }
  return caller;
}

// ── Organization/VentureDesk affiliation helpers ────────────────────────────
// Each deployment has two organizations: VentureDesk (the platform company) and the
// venture group (the angel fund). A member's organization determines which roles are valid:
//   VentureDesk → developer, dev_site_admin (and site_admin)
//   Venture group → admin, user (and site_admin)

export type AffiliationOrg = "venture_desk" | "venture_group";

// Returns which org a role belongs in. site_admin can be in either.
export function roleAffiliation(role: Role): AffiliationOrg | "either" {
  switch (role) {
    case "developer":
    case "dev_site_admin":
      return "venture_desk";
    case "admin":
    case "user":
      return "venture_group";
    case "site_admin":
      return "either";
  }
}

// Throws if a role cannot be held by someone in the given organization.
export function validateRoleForOrganization(role: Role, orgName: string): void {
  const expected = roleAffiliation(role);
  const isVentureDesk = orgName.toLowerCase().includes("venturedesk");
  if (expected === "venture_desk" && !isVentureDesk) {
    throw new HttpsError(
      "permission-denied",
      "The developer and dev-site-admin roles can only be assigned to VentureDesk members."
    );
  }
  if (expected === "venture_group" && isVentureDesk) {
    throw new HttpsError(
      "permission-denied",
      "The admin and user roles cannot be assigned to VentureDesk members."
    );
  }
  // site_admin is allowed in either org.
}

// ── Org lookup helper (for role × org validation) ────────────────────────────

let _orgNameCache: Record<string, string> = {};

// Returns the organization name for a given org ID. Uses a per-request module cache
// so repeated calls within the same request don't re-query the DB.
export async function getOrgName(orgId: string): Promise<string> {
  if (_orgNameCache[orgId]) return _orgNameCache[orgId];
  const rows = await query<{ name: string }>(`SELECT name FROM "organization" WHERE id = $1`, [orgId]);
  if (rows.length === 0) {
    throw new HttpsError("not-found", `No Organization row for id "${orgId}".`);
  }
  _orgNameCache[orgId] = rows[0].name;
  return rows[0].name;
}

// Clear the cache between requests (call at the start of each callable that uses it).
export function clearOrgNameCache(): void {
  _orgNameCache = {};
}

// developer or dev_site_admin — EXCLUDES site_admin, unlike every other tier checker above
// (which treats dev_site_admin/site_admin as interchangeable). This is the org-level
// feature-toggle boundary: developer/dev_site_admin control which features are enabled for
// the deployment at all; site_admin only gets to control per-member access within whatever
// developer/dev_site_admin has already made available (see requireAllUserManagement for the
// per-member-level checker, which does include site_admin).
export async function requireFeatureControl(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "developer" && caller.role !== "dev_site_admin") {
    throw new HttpsError("permission-denied", "Developer or dev-site-admin role required.");
  }
  return caller;
}
