import "server-only";
import { adminAuth } from "./admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Role } from "@/lib/auth/claims";

// Firebase Hosting only forwards a cookie named exactly `__session` to SSR functions —
// this name is not arbitrary (plan §4/§6).
export const SESSION_COOKIE_NAME = "__session";
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export type SessionClaims = DecodedIdToken & {
  role?: Role;
  status?: "active" | "disabled";
  memberId?: string;
  mustChangePassword?: boolean;
  siteAdminMode?: boolean;
  devSiteAdminMode?: boolean;
};

// checkRevoked=true is the whole point of a session cookie over a bare ID token here: it
// makes `adminSetTemporaryPassword` / `setMemberRole` / disabling a member take effect
// immediately rather than waiting out the ID token's own expiry.
export async function verifySessionCookie(
  cookie: string,
  checkRevoked = true
): Promise<SessionClaims | null> {
  try {
    return (await adminAuth.verifySessionCookie(cookie, checkRevoked)) as SessionClaims;
  } catch {
    return null;
  }
}
