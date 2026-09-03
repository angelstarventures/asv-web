"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignDealTag, updateDealStage, deleteDeal, type DealStage } from "@/lib/functions/deals";
import type { DealTagOption } from "@/components/DealListTable";

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "OLD", label: "Old" },
  { value: "PASSED", label: "Passed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function DealAdminControls({
  dealId,
  stage,
  allTags,
  assignedTagIds,
}: {
  dealId: string;
  stage: string;
  allTags: DealTagOption[];
  assignedTagIds: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleStageChange(next: DealStage) {
    setError(null);
    setBusy(true);
    try {
      await updateDealStage({ dealId, stage: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stage.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTagToggle(tagId: string, assign: boolean) {
    setError(null);
    setBusy(true);
    try {
      await assignDealTag({ dealId, tagId, assign });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update tags.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    setError(null);
    setBusy(true);
    try {
      await deleteDeal({ dealId });
      router.push("/admin/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this deal.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <h2 className="text-sm font-medium">Admin controls</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Stage
        <select
          value={stage}
          disabled={busy}
          onChange={(e) => handleStageChange(e.target.value as DealStage)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {allTags.length > 0 && (
        <div>
          <span className="text-sm">Tags</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {allTags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={assignedTagIds.includes(tag.id)}
                  disabled={busy}
                  onChange={(e) => handleTagToggle(tag.id, e.target.checked)}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={busy}
          className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
        >
          Delete deal
        </button>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-base font-semibold">Delete this deal?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This permanently removes the deal, its documents, tags, and ratings. This cannot
              be undone.
            </p>
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              {/* "No" is styled as the primary action and autoFocused, so it's the visually and
                  functionally pre-selected/default choice (e.g. pressing Enter is the safe path). */}
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={busy}
                className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
