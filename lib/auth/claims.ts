// Custom claims are set exclusively by functions/src/functions/users-onCreateProvision.ts —
// no other code path may set role/status (plan §3/§4).
export type Role = "admin" | "member";
export type MemberStatus = "active" | "disabled";

export interface AsvCustomClaims {
  role: Role;
  status: MemberStatus;
  memberId: string; // the 5-digit legacy Member.id
}
