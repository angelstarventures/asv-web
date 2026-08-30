"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";

// Custom handler for Firebase Auth action links (password reset only, for V1) — the plan
// explicitly calls for custom login/reset/change forms over Firebase's own hosted pages.
function AuthActionForm() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  // Derivable straight from the URL params at render time — no effect needed for this branch,
  // only for the async verification below.
  const invalidParams = mode !== "resetPassword" || !oobCode;

  const [status, setStatus] = useState<"verifying" | "ready" | "invalid" | "done">(
    invalidParams ? "invalid" : "verifying"
  );
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invalidParams || !oobCode) return;
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        setEmail(verifiedEmail);
        setStatus("ready");
      })
      .catch(() => setStatus("invalid"));
  }, [invalidParams, oobCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!oobCode) return;

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "verifying") {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Verifying link...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Link expired or invalid</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Request a new password reset link.
        </p>
        <Link href="/reset-password" className="mt-6 inline-block text-sm underline underline-offset-2">
          Reset password
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You can now sign in with your new password.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm underline underline-offset-2">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      {email && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">for {email}</p>}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24">
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>}>
        <AuthActionForm />
      </Suspense>
    </div>
  );
}
