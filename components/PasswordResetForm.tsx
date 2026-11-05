"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { validatePasswordResetToken, completePasswordReset } from "@/lib/functions/adminMembers";

export function PasswordResetForm({ token }: { token: string | null }) {
  const [status, setStatus] = useState<"validating" | "ready" | "invalid" | "unavailable" | "done">(token ? "validating" : "invalid");
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "Use the link in your latest reset email.");

  useEffect(() => {
    if (!token) return;
    let active = true;
    validatePasswordResetToken({ token }).then(result => {
      if (!active) return;
      // Allows a frontend-first rollout while the previous validator is still deployed.
      if (!result.email) { window.location.href = result.resetLink; return; }
      setEmail(result.email);
      setStatus("ready");
    }).catch(err => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not check this link.");
        const code = (err as { code?: string }).code;
        setStatus(code === "functions/failed-precondition" || code === "functions/invalid-argument" ? "invalid" : "unavailable");
      }
    });
    return () => { active = false; };
  }, [token, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true); setError(null);
    try { await completePasswordReset({ token, password }); setStatus("done"); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password. Please try again.");
      if ((err as { code?: string }).code === "functions/failed-precondition") setStatus("invalid");
    } finally { setBusy(false); }
  }

  if (status === "validating") return <p className="text-sm text-zinc-500">Checking your reset link...</p>;
  if (status === "unavailable") return <div className="w-full max-w-sm text-center"><h1 className="text-2xl font-semibold tracking-tight">Could not check your link</h1><p role="alert" className="mt-3 text-sm text-zinc-600">{error}</p><button onClick={() => { setError(null); setStatus("validating"); setAttempt(value => value + 1); }} className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-white">Try again</button></div>;
  if (status === "invalid") return <div className="w-full max-w-sm text-center"><h1 className="text-2xl font-semibold tracking-tight">Link expired or invalid</h1><p role="alert" className="mt-3 text-sm text-zinc-600">{error}</p><Link href="/reset-password" className="mt-6 inline-block text-sm underline underline-offset-2">Request a new reset link</Link></div>;
  if (status === "done") return <div className="w-full max-w-sm text-center"><h1 className="text-2xl font-semibold tracking-tight">Password updated</h1><p className="mt-3 text-sm text-zinc-600">You can now sign in with your new password.</p><Link href="/login" className="mt-6 inline-block text-sm underline underline-offset-2">Sign in</Link></div>;
  return <div className="w-full max-w-sm">
    <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
    <p className="mt-2 text-sm text-zinc-600">for {email}</p>
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">New password<input required type="password" minLength={8} maxLength={4096} autoComplete="new-password" disabled={busy} value={password} onChange={e => setPassword(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">Confirm new password<input required type="password" minLength={8} maxLength={4096} autoComplete="new-password" disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Updating..." : "Update password"}</button>
    </form>
  </div>;
}
