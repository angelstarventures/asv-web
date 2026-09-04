// Custom claims are set exclusively by functions/src/functions/users-onCreateProvision.ts —
// no other code path may set role/status (plan §3/§4).
export type Role = "admin" | "member" | "site_admin";
export type MemberStatus = "active" | "disabled";

export interface AsvCustomClaims {
  role: Role;
  status: MemberStatus;
  memberId: string; // the 5-digit legacy Member.id
  // Set when an admin (not the member) chose the current password — provisionMember and
  // adminSetTemporaryPassword both set this true; memberCompletePasswordChange clears it once
  // the member sets their own. Absent (not just false) once cleared.
  mustChangePassword?: boolean;
}
