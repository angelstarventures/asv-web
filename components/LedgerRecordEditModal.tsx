"use client";

import { useState } from "react";
import { ledgerUpdateRecord } from "@/lib/functions/massIO";

// Saving replaces the ledger entry entirely (delete-then-reinsert server-side — see
// ledger-updateRecord.ts's comment on why the append-only ledger has no in-place update
// primitive to build on). Same schema + consistency validation as recording a brand-new entry.
export function LedgerRecordEditModal({
  record,
  onClose,
  onSaved,
}: {
  record: Record<string, unknown> & { id: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { id, ...recordWithoutId } = record;
  const [text, setText] = useState(JSON.stringify(recordWithoutId, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Not valid JSON.");
      return;
    }
    setBusy(true);
    try {
      await ledgerUpdateRecord(id, parsed);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium">Edit ledger entry</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Saving replaces this entry entirely with the edited JSON below — validated against the
          ledger schema and cross-checked against existing ledger data before anything changes.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={20}
          className="rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
