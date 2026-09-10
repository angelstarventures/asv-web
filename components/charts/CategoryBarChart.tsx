import { formatCurrencyCompact } from "@/components/StatTile";
import { CATEGORY_COLORS, foldToSlots, type ChartEntry } from "./categoryColors";

// Generalizes SectorValueBars' CSS-width-bar pattern (components/SectorValueBars.tsx) to any
// N-category breakdown, showing BOTH the amount and the % per bar (that component only shows
// the amount, on hover) — horizontal so long labels never truncate/wrap awkwardly.
export function CategoryBarChart({
  entries,
  unit = "currency",
}: {
  entries: ChartEntry[];
  unit?: "currency" | "count";
}) {
  const formatAmount = (n: number) => (unit === "count" ? String(n) : formatCurrencyCompact(n));
  const folded = foldToSlots(entries);
  if (folded.length === 0 || folded.every((e) => e.amount === 0)) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No data yet.</p>;
  }
  const max = Math.max(...folded.map((e) => e.amount), 1);

  return (
    <ul className="flex flex-col gap-3">
      {folded.map((entry, i) => (
        <li key={entry.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-zinc-700 dark:text-zinc-300" title={entry.label}>
            {entry.label}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-[18px] flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className="h-[18px] rounded-full"
                style={{ width: `${Math.max((entry.amount / max) * 100, 3)}%`, backgroundColor: CATEGORY_COLORS[i] }}
              />
            </div>
            <span className="w-32 shrink-0 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
              {formatAmount(entry.amount)} ({entry.pct}%)
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
