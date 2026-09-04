"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  provisionMember,
  adminSetTemporaryPassword,
  setMemberStatus,
  setMemberRole,
} from "@/lib/functions/adminMembers";

// The provisionMember/adminTriggerPasswordReset/setMemberStatus/setMemberRole contract point
// (plan §4) — each is a real Cloud Functions callable, invoked with the signed-in admin's own
// Firebase ID token via the client SDK (never proxied through a Next.js API route), since the
// callable protocol needs that token to populate request.auth server-side.
export function MemberActions({
  memberId,
  email,
  isLinked,
  status,
  role,
  viewerIsSiteAdmin,
}: {
  memberId: string;
  email: string;
  isLinked: boolean;
  status: "active" | "disabled";
  role: "admin" | "member" | "site_admin";
  viewerIsSiteAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  async function handleProvision(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await provisionMember({
        memberId,
        email: String(form.get("email")),
        role: form.get("role") === "admin" ? "admin" : "member",
        temporaryPassword: String(form.get("temporaryPassword")),
      });
      setNotice(`Provisioned ${result.email} (${result.authUid}). Relay the temporary password out-of-band.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetTemporaryPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await adminSetTemporaryPassword({ memberId, temporaryPassword: String(form.get("temporaryPassword")) });
      setNotice("Temporary password set. The member will be asked to choose their own the next time they sign in.");
      setSettingPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set a temporary password.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus() {
    setError(null);
    setNotice(null);
    setBusy(true);
    const next = status === "active" ? "disabled" : "active";
    try {
      await setMemberStatus({ memberId, status: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetRole(next: "member" | "admin" | "site_admin") {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await setMemberRole({ memberId, role: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}

      {!isLinked ? (
        <form onSubmit={handleProvision} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
          <h2 className="text-sm font-medium">Provision account</h2>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              defaultValue={email}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Role
            <select
              name="role"
              defaultValue="member"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Temporary password
            <input
              type="text"
              name="temporaryPassword"
              required
              minLength={8}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Provisioning..." : "Provision"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {!settingPassword && (
              <button
                type="button"
                onClick={() => setSettingPassword(true)}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
              >
                Set temporary password
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={busy}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              {status === "active" ? "Disable member" : "Re-activate member"}
            </button>
            {viewerIsSiteAdmin ? (
              <label className="flex items-center gap-2 text-sm">
                Role
                <select
                  value={role}
                  disabled={busy}
                  onChange={(e) => handleSetRole(e.target.value as "member" | "admin" | "site_admin")}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="site_admin">Site-admin</option>
                </select>
              </label>
            ) : role === "site_admin" ? (
              <p className="text-sm text-zinc-500">Site-admin — only a site-admin can change this.</p>
            ) : (
              <button
                type="button"
                onClick={() => handleSetRole(role === "admin" ? "member" : "admin")}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
              >
                {role === "admin" ? "Demote to member" : "Promote to admin"}
              </button>
            )}
          </div>

          {settingPassword && (
            <form
              onSubmit={handleSetTemporaryPassword}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800"
            >
              <h2 className="text-sm font-medium">Set temporary password</h2>
              <p className="text-sm text-zinc-500">
                The member will be required to choose their own password the next time they sign in.
              </p>
              <label className="flex flex-col gap-1 text-sm">
                Temporary password
                <input
                  type="text"
                  name="temporaryPassword"
                  required
                  minLength={8}
                  autoFocus
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
                >
                  {busy ? "Setting..." : "Set password"}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingPassword(false)}
                  disabled={busy}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
