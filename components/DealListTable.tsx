"use client";

import { useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDeal, setDealRanks } from "@/lib/functions/deals";

export interface DealRow {
  id: string;
  companyName: string;
  round: string;
  securityType: string;
  seekingAmount: number;
  preMoneyValuation: number;
  stage: string;
  rank?: number | null;
  createdAt: string;
}

export interface DealTagOption {
  id: string;
  name: string;
}

const STAGES = ["NEW", "PRESENTING", "OLD", "PASSED", "ARCHIVED"] as const;

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  PRESENTING: "Presenting",
  OLD: "Old",
  PASSED: "Passed",
  ARCHIVED: "Archived",
};

type SortKey = "rank" | "companyName" | "round" | "seekingAmount" | "preMoneyValuation" | "stage" | "createdAt";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "companyName", label: "Company" },
  { key: "round", label: "Round" },
  { key: "seekingAmount", label: "Seeking" },
  { key: "preMoneyValuation", label: "Pre-money" },
  { key: "stage", label: "Stage" },
  { key: "createdAt", label: "Submitted" },
];

function currency(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function sortValue(row: DealRow, key: SortKey): string | number {
  if (key === "seekingAmount" || key === "preMoneyValuation") return row[key];
  if (key === "createdAt") return new Date(row.createdAt).getTime();
  if (key === "rank") return row.rank ?? Number.MAX_SAFE_INTEGER;
  return row[key].toLowerCase();
}

// Shared by /admin/deals and /member/deals — same click-to-sort-column client pattern as
// MembersTable, plus a left filter panel (stage + admin-managed tags) matching the reference
// deal-list screenshot. Row click navigates to the shared detail route. isAdmin adds a
// per-row delete action, the "above the line" ranked-screening-queue view, and drag-to-reorder
// within it (member view never sees any of that).
export function DealListTable({
  deals,
  tags,
  dealTagIds,
  detailHrefBase,
  isAdmin,
}: {
  deals: DealRow[];
  tags: DealTagOption[];
  dealTagIds: Record<string, string[]>;
  detailHrefBase: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [aboveTheLineOnly, setAboveTheLineOnly] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function toggleSetMember(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function handleConfirmDelete() {
    if (!confirmingDeleteId) return;
    setError(null);
    setBusy(true);
    try {
      await deleteDeal({ dealId: confirmingDeleteId });
      setConfirmingDeleteId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this deal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToRankedList(dealId: string) {
    setError(null);
    setBusy(true);
    try {
      const maxRank = deals.reduce((max, d) => (d.rank != null && d.rank > max ? d.rank : max), 0);
      await setDealRanks({ updates: [{ dealId, rank: maxRank + 1 }] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this deal to the ranked list.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveFromRankedList(dealId: string) {
    setError(null);
    setBusy(true);
    try {
      await setDealRanks({ updates: [{ dealId, rank: null }] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this deal from the ranked list.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (aboveTheLineOnly && d.rank == null) return false;
      if (stageFilter.size > 0 && !stageFilter.has(d.stage)) return false;
      if (tagFilter.size > 0) {
        const dealTags = dealTagIds[d.id] ?? [];
        if (!dealTags.some((t) => tagFilter.has(t))) return false;
      }
      return true;
    });
  }, [deals, aboveTheLineOnly, stageFilter, tagFilter, dealTagIds]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  // Drag-and-drop reordering is only meaningful/enabled in exactly this view: admin, filtered
  // to the ranked queue, sorted by rank ascending — otherwise "drag to reorder" wouldn't map
  // onto anything coherent. Local order diverges from the server until "Save ranking" is
  // clicked, so dragging doesn't fire a request per row moved.
  const reorderable = Boolean(isAdmin) && aboveTheLineOnly && sort.key === "rank" && sort.dir === "asc";

  // Resets dragOrder whenever the underlying reorderable set changes, using React's "adjust
  // state during render" pattern (not an Effect) so it doesn't cause an extra commit/paint.
  const syncKey = reorderable ? sorted.map((d) => d.id).join(",") : "off";
  const [lastSyncKey, setLastSyncKey] = useState(syncKey);
  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    setDragOrder(reorderable ? sorted.map((d) => d.id) : null);
  }

  const displayRows = useMemo(() => {
    if (!reorderable || !dragOrder) return sorted;
    const byId = new Map(sorted.map((d) => [d.id, d]));
    return dragOrder.map((id) => byId.get(id)).filter((d): d is DealRow => Boolean(d));
  }, [reorderable, dragOrder, sorted]);

  const orderDirty =
    reorderable && dragOrder !== null && dragOrder.some((id, i) => id !== sorted[i]?.id);

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(e: DragEvent<HTMLTableRowElement>, overId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === overId || !dragOrder) return;
    const from = dragOrder.indexOf(draggingId);
    const to = dragOrder.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...dragOrder];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setDragOrder(next);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  async function handleSaveRanking() {
    if (!dragOrder) return;
    setError(null);
    setBusy(true);
    try {
      await setDealRanks({ updates: dragOrder.map((dealId, i) => ({ dealId, rank: i + 1 })) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the new ranking.");
    } finally {
      setBusy(false);
    }
  }

  const dealBeingDeleted = deals.find((d) => d.id === confirmingDeleteId) ?? null;

  return (
    <div className="flex gap-6">
      <aside className="flex w-52 flex-shrink-0 flex-col gap-6">
        {isAdmin && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Screening queue</h3>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={aboveTheLineOnly}
                onChange={(e) => setAboveTheLineOnly(e.target.checked)}
              />
              Above the line only
            </label>
          </div>
        )}
        <div>
          <h3 className="text-xs font-semibold uppercase text-zinc-500">Filter by stage</h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {STAGES.map((stage) => (
              <label key={stage} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={stageFilter.has(stage)}
                  onChange={() => toggleSetMember(stageFilter, setStageFilter, stage)}
                />
                {STAGE_LABELS[stage]}
              </label>
            ))}
          </div>
        </div>
        {tags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-zinc-500">Filter by label</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tagFilter.has(tag.id)}
                    onChange={() => toggleSetMember(tagFilter, setTagFilter, tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 overflow-x-auto rounded-lg border border-zinc-200 bg-card px-5 py-4">
        {error && (
          <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {reorderable && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-background px-3 py-2 text-sm dark:border-zinc-800">
            <span className="text-zinc-500">Drag rows to reorder by interest.</span>
            <button
              type="button"
              onClick={handleSaveRanking}
              disabled={busy || !orderDirty}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save ranking"}
            </button>
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th key={col.key} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
                    >
                      {col.label}
                      <span aria-hidden className="text-[10px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
              {isAdmin && <th className="py-2" />}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((d) => (
              <tr
                key={d.id}
                draggable={reorderable}
                onDragStart={() => handleDragStart(d.id)}
                onDragOver={(e) => handleDragOver(e, d.id)}
                onDragEnd={handleDragEnd}
                className={`border-b border-zinc-100 dark:border-zinc-900 ${reorderable ? "cursor-move" : ""} ${draggingId === d.id ? "opacity-50" : ""}`}
              >
                <td className="py-2 tabular-nums text-zinc-500">{d.rank ?? "—"}</td>
                <td className="py-2">
                  <Link href={`${detailHrefBase}/${d.id}`} className="font-medium underline-offset-2 hover:underline">
                    {d.companyName}
                  </Link>
                </td>
                <td className="py-2 text-zinc-500 dark:text-zinc-500">{d.round.replaceAll("_", " ")}</td>
                <td className="py-2 tabular-nums">{currency(d.seekingAmount)}</td>
                <td className="py-2 tabular-nums">{currency(d.preMoneyValuation)}</td>
                <td className="py-2">{STAGE_LABELS[d.stage] ?? d.stage}</td>
                <td className="py-2 text-zinc-500 dark:text-zinc-500">
                  {new Date(d.createdAt).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {d.rank == null ? (
                        <button
                          type="button"
                          onClick={() => handleAddToRankedList(d.id)}
                          disabled={busy}
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
                        >
                          Add to ranked list
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromRankedList(d.id)}
                          disabled={busy}
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
                        >
                          Remove from ranked list
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(d.id)}
                        className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 dark:border-red-900 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + (isAdmin ? 1 : 0)} className="py-6 text-center text-zinc-500">
                  No deals match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dealBeingDeleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-base font-semibold">Delete {dealBeingDeleted.companyName}?</h3>
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
                onClick={() => setConfirmingDeleteId(null)}
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
