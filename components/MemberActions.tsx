"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  provisionMember,
  deleteMember,
  adminSendPasswordReset,
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
  displayName,
  isLinked,
  status,
  role,
  viewerIsSiteAdmin,
}: {
  memberId: string;
  email: string;
  displayName?: string;
  isLinked: boolean;
  status: "active" | "disabled";
  role: "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";
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
        role: form.get("role") === "admin" ? "admin" : "user",
        displayName: String(form.get("displayName")),
      });
      setNotice(`Invitation sent to ${result.email}. They will receive an email to set their password.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendPasswordReset() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await adminSendPasswordReset({ memberId });
      setNotice("Password reset email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send password reset.");
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

  async function handleSetRole(next: "user" | "admin" | "site_admin" | "dev_site_admin" | "developer") {
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

  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDeleteMember() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await deleteMember({ memberId });
      // Navigate back to the members list since this member no longer exists
      router.push("/admin/members");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete member.");
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
          <h2 className="text-sm font-medium">Send invitation</h2>
          <p className="text-sm text-zinc-500">
            An email will be sent to the member with a link to set their password and sign in.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Display name
            <input
              type="text"
              name="displayName"
              required
              minLength={2}
              defaultValue={displayName}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
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
              defaultValue="user"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send invitation"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            {!settingPassword && (
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
              >
                {busy ? "Sending..." : "Send password reset"}
              </button>
            )}
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
                  onChange={(e) => handleSetRole(e.target.value as "user" | "admin" | "site_admin" | "dev_site_admin" | "developer")}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="site_admin">Site-admin</option>
                  <option value="dev_site_admin">Dev-site-admin</option>
                  <option value="developer">Developer</option>
                </select>
              </label>
            ) : role === "site_admin" ? (
              <p className="text-sm text-zinc-500">Site-admin — only a site-admin can change this.</p>
            ) : (
              <button
                type="button"
                onClick={() => handleSetRole(role === "admin" ? "user" : "admin")}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
              >
                {role === "admin" ? "Demote to user" : "Promote to admin"}
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
          <hr className="border-zinc-200 dark:border-zinc-800" />
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900">
            <h2 className="text-sm font-medium text-red-700 dark:text-red-400">Danger zone</h2>
            <p className="text-xs text-zinc-500">
              Delete this member and their account. Only possible if they have no investment history.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="self-start rounded-full border border-red-400 px-4 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50"
              >
                Delete member
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteMember}
                  disabled={busy}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy ? "Deleting..." : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
