"use client";

import { useState } from "react";
import { createMember } from "@/lib/functions/adminMembers";

function AddMemberRow({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  // A raw dict-key reference is either a name the model couldn't resolve (typical: "Hussain
  // Dalal") or occasionally something ID-shaped it invented — only pre-fill the name field when
  // it actually looks like one.
  const looksLikeName = /^[a-zA-Z][a-zA-Z .'-]*$/.test(reference);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const { memberId } = await createMember({
        displayName: String(form.get("displayName")),
        email: String(form.get("email")),
        role: "user",
      });
      setAdded(memberId);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create member.");
    } finally {
      setBusy(false);
    }
  }

  if (added) {
    return (
      <li className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        &quot;{reference}&quot; added as member {added}. Re-analyze to pick them up.
      </li>
    );
  }

  return (
    <li className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <div className="flex items-center justify-between gap-2">
        <span>&quot;{reference}&quot; doesn&apos;t match any existing member.</span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full border border-current px-3 py-1 text-xs font-medium"
          >
            Add member
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <label className="flex flex-col gap-1 text-xs">
            Name
            <input
              type="text"
              name="displayName"
              required
              defaultValue={looksLikeName ? reference : ""}
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create member"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

// Shown in the AI document-review screen when a drafted record references someone who doesn't
// match a real member — either a genuinely new investor the document mentions, or a name the
// model failed to resolve against the member list it was given (see aiPrompts.ts's
// document_analysis prompt). Lets the admin add the member without leaving the page, then
// re-analyze the same file(s) so the new member list gets used.
export function UnknownMemberReferences({
  references,
  onReanalyze,
  reanalyzing,
}: {
  references: string[];
  onReanalyze: () => void;
  reanalyzing: boolean;
}) {
  if (references.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 p-4 dark:border-amber-900">
      <p className="text-sm font-medium">Unresolved investor(s)</p>
      <ul className="flex flex-col gap-2">
        {references.map((ref) => (
          <AddMemberRow key={ref} reference={ref} />
        ))}
      </ul>
      <button
        type="button"
        onClick={onReanalyze}
        disabled={reanalyzing}
        className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
      >
        {reanalyzing ? "Re-analyzing..." : "Re-analyze with the same file(s)"}
      </button>
    </div>
  );
}
