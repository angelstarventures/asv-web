"use client";

import { Fragment, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setDealRanks, findReviewers } from "@/lib/functions/deals";
import { StarRatingDisplay } from "@/components/StarRatingDisplay";
import { ROUND_OPTIONS } from "@/components/dealFormShared";
import { truncateBlurb, type DealReviewerMatchInfo } from "@/lib/deals";

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
  sector?: string | null;
  executiveSummary?: string | null;
  discountPercent?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number;
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

// The pre-checked-by-default tag names for item (g)'s pre-filter — matched by name against
// whatever tags exist, so this works whether or not the "Has Lead"/"Halal" DealTag rows have
// already been seeded (functions/src/lib/dealAutoTags.ts creates them lazily on first sync).
const DEFAULT_CHECKED_TAG_NAMES = ["Has Lead", "Halal"];

type SortKey = "rank" | "companyName" | "ratingAvg";

// The sort dropdown only ever offers these 3 — "Rank" is kept (rather than dropped to just
// Company/Rating) because it's also the one sort state that activates the screening-queue
// drag-and-reorder view (see `reorderable` below): there'd be no way back into that view once
// a different sort was picked otherwise.
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank (screening queue)" },
  { key: "companyName", label: "Company" },
  { key: "ratingAvg", label: "Rating" },
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

const ROUND_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  ROUND_OPTIONS.map((o) => [o.value, o.label])
);

// Shorter than SECURITY_TYPE_LABELS' abbreviations ("Priced" vs "Priced Equity") — this one's
// only ever used inside the "<Round> Round (<Security>)" prefix below, where the fuller word
// reads better.
const SECURITY_TYPE_PAREN_LABELS: Record<string, string> = {
  PRICED_ROUND: "Priced Equity",
  SAFE: "SAFE",
  CONVERTIBLE_NOTE: "Convertible Note",
  OTHER: "Other",
};

// Keyed off securityType, not field presence — a SAFE has no pre-money valuation in the
// traditional sense (its cap is the relevant figure), but some rows carry a stale
// preMoneyValuation left over from before securityType was corrected, which checking field
// presence first (a real bug caught here once already) would wrongly prefer. Amounts render as
// separate bold elements from the surrounding plain-weight sentence text.
function RaiseInfo({ d }: { d: DealRow }) {
  const roundLabel = ROUND_LABEL_BY_VALUE[d.round] ?? d.round.replaceAll("_", " ");
  const securityLabel = SECURITY_TYPE_PAREN_LABELS[d.securityType] ?? d.securityType.replaceAll("_", " ");
  const amount = <span className="font-semibold">{currency(d.seekingAmount, d.currency)}</span>;

  let terms: React.ReactNode = null;
  if (d.securityType === "SAFE" && d.valuationCap != null) {
    terms = (
      <>
        {" "}
        at <span className="font-semibold">{currency(d.valuationCap, d.currency)}</span> post-money cap
        {d.discountPercent != null ? ` with ${d.discountPercent}% discount` : ""}
      </>
    );
  } else if (d.preMoneyValuation != null) {
    terms = (
      <>
        {" "}
        at <span className="font-semibold">{currency(d.preMoneyValuation, d.currency)}</span> pre-money
      </>
    );
  }

  return (
    <p className="text-sm">
      <span className="font-semibold">
        {roundLabel} Round ({securityLabel})
      </span>
      : Seeking {amount}
      {terms}.
    </p>
  );
}

function sortValue(row: DealRow, key: SortKey): string | number {
  if (key === "rank") return row.rank ?? Number.MAX_SAFE_INTEGER;
  if (key === "ratingAvg") return row.ratingAvg ?? -1;
  return row.companyName.toLowerCase();
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

// Minimal, recognizable WhatsApp glyph — no icon asset existed anywhere in this app before this
// button, so it's inlined rather than adding a new dependency for one icon.
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-1.739-.87-2.876-1.554-4.019-3.524-.304-.524.304-.487.868-1.622.098-.198.049-.371-.05-.52-.099-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.059 3.133 4.988 4.27 2.929 1.137 2.929.76 3.878.71.95-.05 1.982-.79 2.278-1.55.297-.76.297-1.412.198-1.55-.099-.148-.297-.198-.594-.347z" />
      <path d="M12.041 2c-5.503 0-9.977 4.474-9.977 9.978 0 1.827.494 3.611 1.432 5.166L2 22l4.99-1.475a9.94 9.94 0 0 0 5.051 1.379h.004c5.503 0 9.977-4.474 9.977-9.978S17.544 2 12.041 2zm0 18.117h-.004a8.14 8.14 0 0 1-4.15-1.135l-.298-.177-3.09.913.916-3.043-.194-.311a8.128 8.128 0 0 1-1.253-4.386c0-4.5 3.665-8.163 8.176-8.163 2.181 0 4.231.85 5.77 2.393a8.106 8.106 0 0 1 2.394 5.775c0 4.5-3.666 8.134-8.267 8.134z" />
    </svg>
  );
}

// Shared by /admin/deals and /member/deals — a single sortable card grid (same "Sort by"
// dropdown + direction toggle at every breakpoint, since a card layout has no clickable column
// headers to sort by). Row click navigates to the shared detail route. isAdmin adds a per-card
// delete/rank/reviewer-matching action row, which gets the drag/screening-line reordering
// controls once the list is sorted by Rank ascending — that's the one order where ranked deals
// group contiguously at the top, which is what makes a literal above/below-the-line divider
// (the "screening line") and up/down moves mean anything coherent.
export function DealListTable({
  deals,
  tags,
  dealTagIds,
  reviewerMatchesByDealId,
  pitchDeckUrlByDealId,
  detailHrefBase,
  isAdmin,
  isSiteAdmin,
}: {
  deals: DealRow[];
  tags: DealTagOption[];
  dealTagIds: Record<string, string[]>;
  reviewerMatchesByDealId?: Record<string, DealReviewerMatchInfo[]>;
  pitchDeckUrlByDealId?: Record<string, string>;
  detailHrefBase: string;
  isAdmin?: boolean;
  isSiteAdmin?: boolean;
}) {
  const router = useRouter();
  // Rank ascending by default — the screening queue (highest-ranked/most-interesting first,
  // with the screening line dividing "in consideration" from everything else) is the primary
  // view now, not something reached by clicking the Rank header first.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Set<string>>(
    () => new Set(tags.filter((t) => DEFAULT_CHECKED_TAG_NAMES.includes(t.name)).map((t) => t.id))
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingReviewersId, setFindingReviewersId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleSendWhatsApp(d: DealRow, member: DealReviewerMatchInfo) {
    if (!member.phoneNumber) return;
    const digits = member.phoneNumber.replace(/\D/g, "");
    const pitchDeckUrl = pitchDeckUrlByDealId?.[d.id];
    const reviewUrl = `${window.location.origin}/member/deals/${d.id}`;
    const message = [
      `Hi ${member.displayName}, ${d.companyName} may be in your domain of interest.`,
      truncateBlurb(d.executiveSummary, 200),
      pitchDeckUrl ? `Pitch deck: ${pitchDeckUrl}` : null,
      `Full details & to share your thoughts: ${reviewUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function handleFindReviewers(dealId: string) {
    setError(null);
    setFindingReviewersId(dealId);
    try {
      await findReviewers({ dealId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find reviewers for this deal.");
    } finally {
      setFindingReviewersId(null);
    }
  }

  function toggleSetMember(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function commitRankUpdates(updates: { dealId: string; rank: number | null }[]) {
    setError(null);
    try {
      await setDealRanks({ updates });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the ranking.");
    }
  }

  // Unaffected by the stage/tag filters below, so handleDragEnd's hidden-ranked-deal lookup
  // (see its own comment) is always correct even when the visible list is filtered.
  const rankedDeals = useMemo(
    () => deals.filter((d): d is DealRow & { rank: number } => d.rank != null).sort((a, b) => a.rank - b.rank),
    [deals]
  );

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

  // Admin-only — a regular member has no reordering/screening-line-crossing controls at all, so
  // showing them the line itself would just be a confusing, unexplained marker with no action
  // attached to it.
  const lineVisible = Boolean(isAdmin) && sort.key === "rank" && sort.dir === "asc";
  const reorderable = Boolean(isAdmin) && lineVisible;
  // Dragging works under an active stage/tag filter too — a filtered view can hide ranked
  // deals in between the ones shown, so handleDragEnd explicitly pushes every hidden ranked
  // deal to the bottom of the queue (preserving their relative order) rather than letting the
  // visible deals' fresh 1..N numbering collide with whatever rank a hidden deal already had.
  const dragEnabled = reorderable;

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

    // A ranked deal hidden by the active stage/tag filter never appears in `sorted`, so it
    // can't be dragged — per its own request, it stays exactly where it is relative to every
    // other hidden deal, just pushed below every VISIBLE ranked deal (which take the fresh
    // 1..N numbering from the drag). rankedDeals is global (unfiltered) and already
    // rank-ascending, so filtering out the visible ids leaves the hidden ones in their
    // existing relative order.
    const visibleIds = new Set(sorted.map((d) => d.id));
    const hiddenRankedIds = rankedDeals.filter((d) => !visibleIds.has(d.id)).map((d) => d.id);

    const updates: { dealId: string; rank: number | null }[] = finalRankedIds.map((dealId, i) => ({
      dealId,
      rank: i + 1,
    }));
    hiddenRankedIds.forEach((dealId, i) => {
      updates.push({ dealId, rank: finalRankedIds.length + i + 1 });
    });
    // Any previously-ranked VISIBLE deal that ended up below the line gets explicitly cleared.
    for (const id of originalRankedIds) {
      if (!finalRankedIds.includes(id)) updates.push({ dealId: id, rank: null });
    }
    await commitRankUpdates(updates);
  }

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
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-card px-4 py-4 sm:px-5">
        {error && (
          <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {reorderable && (
          <p className="mb-3 rounded-md border border-zinc-200 bg-background px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800">
            Drag cards or use the arrows to reorder the screening queue — changes save immediately.
            {activeFilterCount > 0 && " Deals hidden by the current filters stay put, below whatever's shown here."}
          </p>
        )}

        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="deal-sort" className="text-xs font-semibold uppercase text-zinc-500">
            Sort by
          </label>
          <select
            id="deal-sort"
            value={sort.key}
            onChange={(e) => setSort((prev) => ({ ...prev, key: e.target.value as SortKey }))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SORT_OPTIONS.map((col) => (
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

        <div className="grid grid-cols-1 gap-3">
          {displayRows.map((d, i) => {
            const matches = reviewerMatchesByDealId?.[d.id] ?? [];
            return (
              <Fragment key={d.id}>
                {showLine && i === boundaryIndex && (
                  <div className="col-span-full" onDragOver={(e) => handleDragOver(e, LINE_MARKER)}>
                    <ScreeningLine />
                  </div>
                )}
                <div
                  draggable={dragEnabled}
                  onDragStart={() => handleDragStart(d.id)}
                  onDragOver={(e) => handleDragOver(e, d.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 ${
                    dragEnabled ? "cursor-move" : ""
                  } ${draggingId === d.id ? "opacity-50" : ""}`}
                >
                  {/* One row of 3 items — title+sector (left), raise info (right), rating
                      (far right) — followed by the full-width description. Cell boundaries are
                      invisible — this is a layout aid, not a visible table. */}
                  <div className="grid grid-cols-[auto_1fr_minmax(22ch,_auto)] items-baseline gap-x-4">
                    <div className="min-w-0">
                      <Link href={`${detailHrefBase}/${d.id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
                        {d.companyName}
                      </Link>
                      {d.sector && <span className="ml-2 text-xs text-zinc-500">{d.sector}</span>}
                    </div>
                    <div className="text-right">
                      <RaiseInfo d={d} />
                    </div>
                    <div className="flex justify-end">
                      <StarRatingDisplay rating={d.ratingAvg ?? null} count={d.ratingCount} />
                    </div>
                  </div>
                  {truncateBlurb(d.executiveSummary, 220) && (
                    <p className="mt-1 text-sm">{truncateBlurb(d.executiveSummary, 220)}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    {isAdmin ? (
                      <div className="flex flex-wrap gap-2">
                        {matches.map((m) => (
                          <button
                            key={m.memberId}
                            type="button"
                            onClick={() => handleSendWhatsApp(d, m)}
                            disabled={!m.phoneNumber}
                            title={m.phoneNumber ? m.reason : `${m.reason} (no phone number on file)`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-green-300 px-3 py-1 text-xs font-medium text-green-700 disabled:opacity-40 dark:border-green-900 dark:text-green-400"
                          >
                            <WhatsAppIcon />
                            {m.displayName}
                          </button>
                        ))}
                        {(matches.length === 0 || isSiteAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleFindReviewers(d.id)}
                            disabled={findingReviewersId === d.id}
                            title={matches.length > 0 ? "Replaces the current matched reviewers." : undefined}
                            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
                          >
                            {findingReviewersId === d.id ? "Finding..." : "Find Reviewers"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="flex-shrink-0 text-xs text-zinc-400">
                      Submitted: {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Fragment>
            );
          })}
          {displayRows.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-500">No deals match these filters.</p>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Filters</h3>
              <button type="button" onClick={() => setFiltersOpen(false)} className="text-sm text-zinc-500 hover:text-foreground">
                Close
              </button>
            </div>
            {filterSections}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setStageFilter(new Set());
                  setTagFilter(new Set());
                }}
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-foreground"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
