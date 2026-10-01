"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { validatePasswordResetToken } from "@/lib/functions/adminMembers";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Validating your link…</h1>
          <p className="mt-2 text-sm text-zinc-500">Please wait.</p>
        </div>
      </div>
    }>
      <SetPasswordInner />
    </Suspense>
  );
}

function SetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"validating" | "redirecting" | "error">("validating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No token provided. Use the link from your email.");
      return;
    }

    validatePasswordResetToken({ token })
      .then(({ resetLink }) => {
        setStatus("redirecting");
        window.location.href = resetLink;
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Invalid or expired link.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        {status === "validating" && (
          <>
            <h1 className="text-xl font-semibold">Validating your link…</h1>
            <p className="mt-2 text-sm text-zinc-500">Please wait.</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <h1 className="text-xl font-semibold">Redirecting…</h1>
            <p className="mt-2 text-sm text-zinc-500">You&apos;ll be taken to the password set page.</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold">Link expired or invalid</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <p className="mt-4 text-sm text-zinc-500">
              Ask an admin to send you a new invitation or password reset email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}