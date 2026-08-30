import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/firebase/session";

export interface CurrentMember {
  memberId: string;
  role: "admin" | "member";
  status: "active" | "disabled";
}

// proxy.ts already guarantees any /member/* or /admin/* request has a valid, active session
// (and role === 'admin' for /admin/*) — this just re-derives the same claims server-side so
// page code never has to trust a client-supplied memberId (plan §3, Data isolation).
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const claims = await verifySessionCookie(cookie, true);
  if (!claims?.memberId || !claims.role || !claims.status) return null;

  return { memberId: claims.memberId, role: claims.role, status: claims.status };
}
