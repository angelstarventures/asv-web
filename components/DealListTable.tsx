"use client";

import { Fragment, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDeal, setDealRanks } from "@/lib/functions/deals";

export interface DealRow {
  id: string;
  companyName: string;
  round: string;
  securityType: string;
  seekingAmount: number;
  currency?: string;
  preMoneyValuation?: number | null;
  valuationCap?: number | null;
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

function currency(n: number, code?: string): string {
  if (code) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(
        n
      );
    } catch {
      // Fall through to the $-prefixed fallback for an invalid/unrecognized code.
    }
  }
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// A SAFE has no pre-money valuation — fall back to its valuation cap so the column still shows
// something meaningful, with a "(cap)" suffix to distinguish it from a priced round's figure.
function dealValuationDisplay(d: DealRow): string {
  if (d.preMoneyValuation != null) return currency(d.preMoneyValuation, d.currency);
  if (d.valuationCap != null) return `${currency(d.valuationCap, d.currency)} (cap)`;
  return "—";
}

function sortValue(row: DealRow, key: SortKey): string | number {
  if (key === "seekingAmount") return row.seekingAmount;
  if (key === "preMoneyValuation") return row.preMoneyValuation ?? row.valuationCap ?? 0;
  if (key === "createdAt") return new Date(row.createdAt).getTime();
  if (key === "rank") return row.rank ?? Number.MAX_SAFE_INTEGER;
  return row[key].toLowerCase();
}

function ScreeningLine() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-600">
      <span className="h-0.5 flex-1 bg-red-600" />
      Screening line
      <span className="h-0.5 flex-1 bg-red-600" />
    </div>
  );
}

// Shared by /admin/deals and /member/deals — same click-to-sort-column client pattern as
// MembersTable, plus a left filter panel (stage + admin-managed tags) matching the reference
// deal-list screenshot. Row click navigates to the shared detail route. isAdmin adds a per-row
// delete action and the screening-queue reorder controls (drag + up/down arrows), which appear
// once the list is sorted by Rank ascending — that's the one order where ranked deals group
// contiguously at the top, which is what makes a literal above/below-the-line divider (the
// "screening line") and up/down moves mean anything coherent.
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
  // Rank ascending by default — the screening queue (highest-ranked/most-interesting first,
  // with the screening line dividing "in consideration" from everything else) is the primary
  // view now, not something reached by clicking the Rank header first.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
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

  async function commitRankUpdates(updates: { dealId: string; rank: number | null }[]) {
    setError(null);
    setBusy(true);
    try {
      await setDealRanks({ updates });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the ranking.");
    } finally {
      setBusy(false);
    }
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

  // Global (unaffected by the stage/tag filters below), so "next available rank" and the
  // up/down arrows' neighbor lookups are always correct even when the visible list is filtered.
  const rankedDeals = useMemo(
    () => deals.filter((d): d is DealRow & { rank: number } => d.rank != null).sort((a, b) => a.rank - b.rank),
    [deals]
  );
  const rankedCount = rankedDeals.length;
  function findByRank(rank: number) {
    return rankedDeals.find((d) => d.rank === rank);
  }

  async function handlePromote(dealId: string) {
    await commitRankUpdates([{ dealId, rank: rankedCount + 1 }]);
  }

  async function handleRemoveFromRankedList(dealId: string) {
    await commitRankUpdates([{ dealId, rank: null }]);
  }

  async function handleMoveUp(d: DealRow) {
    if (d.rank == null || d.rank <= 1) return;
    const prev = findByRank(d.rank - 1);
    if (!prev) return;
    await commitRankUpdates([
      { dealId: d.id, rank: prev.rank },
      { dealId: prev.id, rank: d.rank },
    ]);
  }

  async function handleMoveDown(d: DealRow) {
    if (d.rank == null) return;
    const next = findByRank(d.rank + 1);
    if (next) {
      await commitRankUpdates([
        { dealId: d.id, rank: next.rank },
        { dealId: next.id, rank: d.rank },
      ]);
    } else {
      await handleRemoveFromRankedList(d.id);
    }
  }

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (stageFilter.size > 0 && !stageFilter.has(d.stage)) return false;
      if (tagFilter.size > 0) {
        const dealTags = dealTagIds[d.id] ?? [];
        if (!dealTags.some((t) => tagFilter.has(t))) return false;
      }
      return true;
    });
  }, [deals, stageFilter, tagFilter, dealTagIds]);

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

  const lineVisible = sort.key === "rank" && sort.dir === "asc";
  const reorderable = Boolean(isAdmin) && lineVisible;
  // Drag additionally requires no active stage/tag filter: a filtered view can hide ranked
  // deals in between the ones shown, so renumbering just what's visible 1..N would silently
  // corrupt the true global ranking. The arrows don't have that problem — each one swaps or
  // reassigns specific deals by id, never assuming the visible order is the full order.
  const dragEnabled = reorderable && stageFilter.size === 0 && tagFilter.size === 0;

  // The screening line is just another slot in the dragged sequence (a sentinel id no real deal
  // can have) — dragging a row to either side of it, or dropping directly on it, moves that row
  // across without any special-casing beyond treating LINE_MARKER as a normal drag-over target.
  const LINE_MARKER = "__LINE__";

  const displayRows = useMemo(() => {
    if (!dragOrder) return sorted;
    const byId = new Map(sorted.map((d) => [d.id, d]));
    return dragOrder
      .filter((id) => id !== LINE_MARKER)
      .map((id) => byId.get(id))
      .filter((d): d is DealRow => Boolean(d));
  }, [dragOrder, sorted]);

  const boundaryIndex = dragOrder
    ? dragOrder.indexOf(LINE_MARKER)
    : displayRows.filter((d) => d.rank != null).length;
  const showLine = lineVisible && boundaryIndex > 0 && boundaryIndex < displayRows.length;

  function handleDragStart(id: string) {
    if (!dragEnabled) return;
    setDraggingId(id);
    const ids = sorted.map((d) => d.id);
    const initialBoundary = sorted.filter((d) => d.rank != null).length;
    ids.splice(initialBoundary, 0, LINE_MARKER);
    setDragOrder(ids);
  }

  function handleDragOver(e: DragEvent<HTMLElement>, overId: string) {
    if (!dragEnabled) return;
    e.preventDefault();
    if (!draggingId || draggingId === overId || !dragOrder || !dragOrder.includes(overId)) return;
    const from = dragOrder.indexOf(draggingId);
    const to = dragOrder.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...dragOrder];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setDragOrder(next);
  }

  async function handleDragEnd() {
    const finalOrder = dragOrder;
    setDraggingId(null);
    setDragOrder(null);
    if (!finalOrder) return;

    const lineIdx = finalOrder.indexOf(LINE_MARKER);
    const finalRankedIds = finalOrder.slice(0, lineIdx);
    const originalRankedIds = sorted.filter((d) => d.rank != null).map((d) => d.id);
    if (finalRankedIds.length === originalRankedIds.length && finalRankedIds.every((id, i) => id === originalRankedIds[i])) {
      return;
    }

    // Every currently-above-the-line id gets a fresh dense rank; anything that used to be
    // ranked but ended up below the line gets explicitly cleared.
    const updates: { dealId: string; rank: number | null }[] = finalRankedIds.map((dealId, i) => ({
      dealId,
      rank: i + 1,
    }));
    for (const id of originalRankedIds) {
      if (!finalRankedIds.includes(id)) updates.push({ dealId: id, rank: null });
    }
    await commitRankUpdates(updates);
  }

  const dealBeingDeleted = deals.find((d) => d.id === confirmingDeleteId) ?? null;

  const activeFilterCount = stageFilter.size + tagFilter.size;

  const filterSections = (
    <>
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
    </>
  );

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="flex w-full flex-col gap-6 md:w-52 md:flex-shrink-0">
        <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 md:hidden">
          <summary className="cursor-pointer text-sm font-medium">
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </summary>
          <div className="mt-3 flex flex-col gap-6">{filterSections}</div>
        </details>
        <div className="hidden md:flex md:flex-col md:gap-6">{filterSections}</div>
      </aside>

      <div className="flex-1 rounded-lg border border-zinc-200 bg-card px-4 py-4 sm:px-5">
        {error && (
          <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {reorderable && (
          <p className="mb-3 rounded-md border border-zinc-200 bg-background px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800">
            {dragEnabled ? (
              <>
                <span className="hidden md:inline">
                  Drag rows or use the arrows to reorder the screening queue — changes save immediately.
                </span>
                <span className="md:hidden">Use the arrows to reorder the screening queue — changes save immediately.</span>
              </>
            ) : (
              "Use the arrows to reorder the screening queue — changes save immediately. (Clear filters to also drag rows.)"
            )}
          </p>
        )}

        <div className="mb-3 flex items-center gap-2 md:hidden">
          <label htmlFor="deal-sort" className="text-xs font-semibold uppercase text-zinc-500">
            Sort by
          </label>
          <select
            id="deal-sort"
            value={sort.key}
            onChange={(e) => setSort((prev) => ({ ...prev, key: e.target.value as SortKey }))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {COLUMNS.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSort((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))}
            aria-label={sort.dir === "asc" ? "Sort ascending" : "Sort descending"}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
          >
            {sort.dir === "asc" ? "▲" : "▼"}
          </button>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {displayRows.map((d, i) => (
            <Fragment key={d.id}>
              {showLine && i === boundaryIndex && <ScreeningLine />}
              <div
                className={`rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 ${draggingId === d.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`${detailHrefBase}/${d.id}`} className="font-medium underline-offset-2 hover:underline">
                      {d.companyName}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {d.round.replaceAll("_", " ")} · {STAGE_LABELS[d.stage] ?? d.stage}
                    </p>
                  </div>
                  {reorderable &&
                    (d.rank != null ? (
                      <div className="flex flex-shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(d)}
                          disabled={busy || d.rank <= 1}
                          aria-label="Move up"
                          className="rounded-md border border-zinc-300 px-2 text-xs disabled:opacity-30 dark:border-zinc-700"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(d)}
                          disabled={busy}
                          aria-label="Move down"
                          className="rounded-md border border-zinc-300 px-2 text-xs disabled:opacity-30 dark:border-zinc-700"
                        >
                          ▼
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePromote(d.id)}
                        disabled={busy}
                        aria-label="Add to screening queue"
                        className="flex-shrink-0 rounded-md border border-zinc-300 px-2 text-xs disabled:opacity-30 dark:border-zinc-700"
                      >
                        ▲
                      </button>
                    ))}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-500">Rank</dt>
                    <dd className="tabular-nums">{d.rank ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Seeking</dt>
                    <dd className="tabular-nums">{currency(d.seekingAmount, d.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Pre-money</dt>
                    <dd className="tabular-nums">{dealValuationDisplay(d)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Submitted</dt>
                    <dd>{new Date(d.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
                {isAdmin && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                    {!reorderable &&
                      (d.rank == null ? (
                        <button
                          type="button"
                          onClick={() => handlePromote(d.id)}
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
                      ))}
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(d.id)}
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 dark:border-red-900 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          ))}
          {displayRows.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No deals match these filters.</p>}
        </div>

        <div className="hidden md:block md:overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {COLUMNS.map((col) => {
                  const active = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="py-2 font-medium"
                    >
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
              {displayRows.map((d, i) => (
                <Fragment key={d.id}>
                  {showLine && i === boundaryIndex && (
                    <tr aria-hidden="true" onDragOver={(e) => handleDragOver(e, LINE_MARKER)}>
                      <td colSpan={COLUMNS.length + (isAdmin ? 1 : 0)} className="py-1">
                        <ScreeningLine />
                      </td>
                    </tr>
                  )}
                  <tr
                    draggable={dragEnabled}
                    onDragStart={() => handleDragStart(d.id)}
                    onDragOver={(e) => handleDragOver(e, d.id)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-zinc-100 dark:border-zinc-900 ${
                      dragEnabled ? "cursor-move" : ""
                    } ${draggingId === d.id ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 tabular-nums text-zinc-500">{d.rank ?? "—"}</td>
                    <td className="py-2">
                      <Link href={`${detailHrefBase}/${d.id}`} className="font-medium underline-offset-2 hover:underline">
                        {d.companyName}
                      </Link>
                    </td>
                    <td className="py-2 text-zinc-500 dark:text-zinc-500">{d.round.replaceAll("_", " ")}</td>
                    <td className="py-2 tabular-nums">{currency(d.seekingAmount, d.currency)}</td>
                    <td className="py-2 tabular-nums">{dealValuationDisplay(d)}</td>
                    <td className="py-2">{STAGE_LABELS[d.stage] ?? d.stage}</td>
                    <td className="py-2 text-zinc-500 dark:text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                    {isAdmin && (
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {reorderable ? (
                            d.rank != null ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveUp(d)}
                                  disabled={busy || d.rank <= 1}
                                  aria-label="Move up"
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-zinc-700"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDown(d)}
                                  disabled={busy}
                                  aria-label="Move down"
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-zinc-700"
                                >
                                  ▼
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePromote(d.id)}
                                disabled={busy}
                                aria-label="Add to screening queue"
                                className="rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-zinc-700"
                              >
                                ▲
                              </button>
                            )
                          ) : d.rank == null ? (
                            <button
                              type="button"
                              onClick={() => handlePromote(d.id)}
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
                </Fragment>
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
