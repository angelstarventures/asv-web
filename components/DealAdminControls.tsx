"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignDealTag, updateDealStage, type DealStage } from "@/lib/functions/deals";
import type { DealTagOption } from "@/components/DealListTable";

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "LEAD", label: "Lead" },
  { value: "DUE_DILIGENCE", label: "Due diligence" },
  { value: "PRESENTING", label: "Presenting" },
  { value: "INVESTED", label: "Invested" },
  { value: "PASSED", label: "Passed" },
  { value: "INACTIVE", label: "Inactive" },
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
    </div>
  );
}
