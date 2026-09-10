import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/firebase/session";

export interface CurrentMember {
  memberId: string;
  authUid: string;
  role: "admin" | "member" | "site_admin";
  status: "active" | "disabled";
  mustChangePassword: boolean;
  siteAdminMode: boolean;
}

// proxy.ts already guarantees any /member/* or /admin/* request has a valid, active session
// (and role === 'admin' for /admin/*) — this just re-derives the same claims server-side so
// page code never has to trust a client-supplied memberId (plan §3, Data isolation).
//
// `authUid` (the verified Firebase Auth uid, i.e. `claims.uid`) is exposed alongside
// `memberId` so callers can pass it to lib/dataconnect/client.ts's member-scoped queries for
// Admin SDK impersonation (`impersonate: { authClaims: { sub: authUid } }`) — those queries
// filter via `member: { authUid: { eq_expr: "auth.uid" } }` rather than a client-suppliable
// memberId variable, closing a confirmed IDOR: memberId used to be a plain GraphQL variable
// gated only by @auth(level: USER) (any signed-in user, no ownership check), so any member
// could call the connector directly with the real client SDK and pass a different memberId
// to get another member's real allocations/valuations back (verified empirically).
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const claims = await verifySessionCookie(cookie, true);
  if (!claims?.memberId || !claims.role || !claims.status) return null;

  return {
    memberId: claims.memberId,
    authUid: claims.uid,
    role: claims.role,
    status: claims.status,
    mustChangePassword: claims.mustChangePassword ?? false,
    siteAdminMode: claims.siteAdminMode ?? false,
  };
}
