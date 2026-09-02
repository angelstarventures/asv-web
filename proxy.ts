import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/firebase/session";

// The only real enforcement point in the app — `useAuth` (client context) is UI polish
// only (spinners, conditional nav), never a security boundary. API routes are NOT covered
// by this matcher and must independently re-verify the session cookie (plan §4).
export const config = {
  matcher: ["/member/:path*", "/admin/:path*"],
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

  if (request.nextUrl.pathname.startsWith("/admin") && claims.role !== "admin") {
    return NextResponse.redirect(new URL("/member/dashboard", request.url));
  }

  return NextResponse.next();
}
