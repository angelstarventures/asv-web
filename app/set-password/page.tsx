"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordResetForm } from "@/components/PasswordResetForm";

function SetPasswordInner() {
  const token = useSearchParams().get("token");
  return <PasswordResetForm key={token} token={token} />;
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <Suspense fallback={<p className="text-sm text-zinc-500">Checking your reset link...</p>}>
        <SetPasswordInner />
      </Suspense>
    </div>
  );
}
