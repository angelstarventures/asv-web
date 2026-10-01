"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createMember } from "@/lib/functions/adminMembers";

// Backs the "add a member" gap on app/admin/members/page.tsx — createMember only inserts the
// Member row (auto-generated id); linking a login is still the separate provisionMember step
// on the member's own detail page, same as every migrated member.
export function NewMemberForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const { memberId } = await createMember({
        displayName: String(form.get("displayName")),
        email: String(form.get("email")),
        role: form.get("role") === "admin" ? "admin" : "user",
      });
      router.push(`/admin/members/${memberId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create member.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
      >
        New member
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium">New member</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          name="displayName"
          required
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
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
      <div className="mt-1 flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create member"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
