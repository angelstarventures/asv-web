"use client";

// Thin wrapper around /api/auth/session — the client never sets the session cookie itself
// (it's httpOnly), it only triggers the exchange (plan §4).

export interface SessionResult {
  role: "admin" | "member" | "site_admin";
  status: "active" | "disabled";
}

export async function exchangeIdTokenForSession(idToken: string): Promise<SessionResult> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const body = (await res.json()) as SessionResult & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Sign-in failed.");
  }
  return body;
}

export async function clearSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
}

// Every signed-in user (admin or member) lands on their Portfolio view first — Admin View is
// now a secondary tab (moved to the end of AppHeader's nav) rather than an admin's default
// landing spot.
export function redirectPathForRole(): string {
  return "/member/dashboard";
}
