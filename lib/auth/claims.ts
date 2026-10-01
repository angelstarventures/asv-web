// Custom claims are set exclusively by functions/src/functions/users-onCreateProvision.ts —
// no other code path may set role/status (plan §3/§4).
export type Role = "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";
export type MemberStatus = "active" | "disabled";

export interface AsvCustomClaims {
  role: Role;
  status: MemberStatus;
  memberId: string; // the 5-digit legacy Member.id
  // Set when an admin (not the member) chose the current password — provisionMember and
  // adminSetTemporaryPassword both set this true; memberCompletePasswordChange clears it once
  // the member sets their own. Absent (not just false) once cleared.
  mustChangePassword?: boolean;
  // Mode toggles — let a high-role user temporarily see a lower-role's perspective.
  // siteAdminMode: off means a site_admin sees what an admin sees; on reveals root surfaces.
  // devSiteAdminMode: off means a dev_site_admin sees what a developer sees; on reveals full.
  siteAdminMode?: boolean;
  devSiteAdminMode?: boolean;
}
