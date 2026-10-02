import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/firebase/session";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";
import type { Role } from "@/lib/auth/claims";

// The only real enforcement point in the app — `useAuth` (client context) is UI polish
// only (spinners, conditional nav), never a security boundary. API routes are NOT covered
// by this matcher and must independently re-verify the session cookie (plan §4).
export const config = {
  matcher: ["/developer/:path*", "/member/:path*", "/admin/:path*", "/change-password"],
};

// Roles that are "admin-tier" — can access /admin/* routes.
const ADMIN_TIER_ROLES: Role[] = ["admin", "site_admin", "dev_site_admin"];

// Roles that can access /developer/* routes.
const DEVELOPER_TIER_ROLES: Role[] = ["developer", "dev_site_admin", "site_admin"];

export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const loginUrl = new URL("/login", request.url);

  if (!cookie) {
    return NextResponse.redirect(loginUrl);
  }

  const claims = await verifySessionCookie(cookie, true);
  if (!claims) {
    return NextResponse.redirect(loginUrl);
  }

  if (claims.status !== "active") {
    return NextResponse.redirect(loginUrl);
  }

  const onChangePasswordPage = request.nextUrl.pathname === "/change-password";
  if (claims.mustChangePassword && !onChangePasswordPage) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }
  if (!claims.mustChangePassword && onChangePasswordPage) {
    // Already changed (or never required) — nothing to do here.
    return NextResponse.redirect(new URL("/member/dashboard", request.url));
  }

  const role = claims.role as Role;

  // Developer routes — only developer, dev-site-admin, site-admin
  if (request.nextUrl.pathname.startsWith("/developer") && !DEVELOPER_TIER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/member/dashboard", request.url));
  }

  // Admin routes — admin-tier roles only
  if (request.nextUrl.pathname.startsWith("/admin") && !ADMIN_TIER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/member/dashboard", request.url));
  }

  // Root-mode surfaces — site_admin-only with siteAdminMode toggle ON
  const rootSurfaces = ["/admin/settings", "/admin/portfolios", "/admin/features"];
  if (
    rootSurfaces.some((p) => request.nextUrl.pathname.startsWith(p)) &&
    !isSiteAdminModeOn(claims.role, claims.siteAdminMode)
  ) {
    return NextResponse.redirect(new URL("/admin/members", request.url));
  }

  return NextResponse.next();
}
