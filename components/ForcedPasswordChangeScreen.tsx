"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { exchangeIdTokenForSession, redirectPathForRole } from "@/lib/auth/session-client";
import { completePasswordChange } from "@/lib/functions/memberProfile";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { LogoutButton } from "@/components/LogoutButton";

// Reached only via proxy.ts's redirect when the session's mustChangePassword claim is set (an
// admin chose this account's current password). On success: clear the claim server-side, force
// a fresh ID token so the client picks up the cleared claim, re-mint the session cookie from it
// (same exchange the login form itself does), then move on — otherwise proxy.ts would just
// bounce the still-stale session cookie right back here.
export function ForcedPasswordChangeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSuccess() {
    setError(null);
    try {
      await completePasswordChange();
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in.");
      const idToken = await user.getIdToken(true);
      await exchangeIdTokenForSession(idToken);
      router.push(redirectPathForRole());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish updating your password.");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-zinc-500">
            You&apos;re signing in with a temporary password. Please set your own password to continue.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <ChangePasswordForm currentPasswordLabel="Temporary password" onSuccess={handleSuccess} />
        <LogoutButton />
      </div>
    </div>
  );
}
