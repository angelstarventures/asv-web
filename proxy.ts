import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/firebase/session";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";

// The only real enforcement point in the app — `useAuth` (client context) is UI polish
// only (spinners, conditional nav), never a security boundary. API routes are NOT covered
// by this matcher and must independently re-verify the session cookie (plan §4).
export const config = {
  matcher: ["/member/:path*", "/admin/:path*", "/change-password"],
};

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

  const isAdminTier = claims.role === "admin" || claims.role === "site_admin";
  if (request.nextUrl.pathname.startsWith("/admin") && !isAdminTier) {
    return NextResponse.redirect(new URL("/member/dashboard", request.url));
  }
  const rootSurfaces = ["/admin/settings", "/admin/portfolios", "/admin/costs"];
  if (
    rootSurfaces.some((p) => request.nextUrl.pathname.startsWith(p)) &&
    !isSiteAdminModeOn(claims.role, claims.siteAdminMode)
  ) {
    return NextResponse.redirect(new URL("/admin/members", request.url));
  }

  return NextResponse.next();
}
