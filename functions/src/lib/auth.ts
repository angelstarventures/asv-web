import { getAuth } from "firebase-admin/auth";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export interface CallerContext {
  uid: string;
  memberId: string;
  role: "admin" | "member" | "site_admin";
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

  return {
    uid: user.uid,
    memberId: claims.memberId,
    role: claims.role as "admin" | "member" | "site_admin",
    status: claims.status as "active" | "disabled",
  };
}

// site_admin is a strict superset of admin — every admin-gated function accepts it too, with
// no per-call-site changes needed. requireSiteAdmin is the separate, stricter gate for the
// handful of functions (Settings) that must stay site_admin-only.
export async function requireAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "admin" && caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
  return caller;
}

export async function requireSiteAdmin(request: CallableRequest): Promise<CallerContext> {
  const caller = await requireCaller(request);
  if (caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Site-admin role required.");
  }
  return caller;
}
