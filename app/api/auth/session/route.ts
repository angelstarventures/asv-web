import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/firebase/session";

// API routes are NOT covered by proxy.ts's matcher — this route independently verifies the
// ID token itself before minting a session cookie (plan §4).
const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

export async function POST(request: Request) {
  const { idToken } = (await request.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid ID token." }, { status: 401 });
  }

  const claims = decoded as { role?: "admin" | "member" | "site_admin"; status?: "active" | "disabled" };
  if (!claims.role || !claims.status) {
    return NextResponse.json(
      { error: "Account is not fully provisioned. Contact an administrator." },
      { status: 403 }
    );
  }
  if (claims.status !== "active") {
    return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
  }

  const sessionCookie = await createSessionCookie(idToken);
  const response = NextResponse.json({ role: claims.role, status: claims.status });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
