import { formatCurrencyCompact } from "@/components/StatTile";
import { CATEGORY_COLORS, foldToSlots, type ChartEntry } from "./categoryColors";

const SIZE = 200;
const RADIUS = 78;
const STROKE = 26;
const GAP_DEG = 3; // surface-color gap between segments, in degrees of arc

function polarPoint(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: SIZE / 2 + RADIUS * Math.cos(rad), y: SIZE / 2 + RADIUS * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polarPoint(startDeg);
  const end = polarPoint(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Generalizes HealthMixDonut's arc-path math (components/HealthMixDonut.tsx) from a fixed
// 3-value status field to any N-category identity breakdown — categorical hues (never status
// colors) since this is part-to-whole across distinct entities, not a health state.
export function CategoryPieChart({
  entries,
  unit = "currency",
  title,
}: {
  entries: ChartEntry[];
  unit?: "currency" | "count";
  title: string;
}) {
  const formatAmount = (n: number) => (unit === "count" ? String(n) : formatCurrencyCompact(n));
  const folded = foldToSlots(entries);
  const total = folded.reduce((sum, e) => sum + e.amount, 0);

  if (total === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No data yet.</p>;
  }

  const segments = folded
    .filter((e) => e.amount > 0)
    .reduce<{ entry: ChartEntry; color: string; startDeg: number; endDeg: number }[]>((acc, entry, i) => {
      const cursor = acc.length > 0 ? acc[acc.length - 1].endDeg + GAP_DEG : 0;
      const sweep = (entry.amount / total) * 360;
      acc.push({ entry, color: CATEGORY_COLORS[i], startDeg: cursor, endDeg: cursor + sweep - GAP_DEG });
      return acc;
    }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={title} className="shrink-0">
        {segments.map((seg) => (
          <path
            key={seg.entry.label}
            d={arcPath(seg.startDeg, seg.endDeg)}
            fill="none"
            stroke={seg.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            aria-label={`${seg.entry.label}: ${formatAmount(seg.entry.amount)} (${seg.entry.pct}%)`}
          />
        ))}
      </svg>
      <ul className="flex min-w-0 flex-col gap-1.5 text-sm">
        {segments.map((seg) => (
          <li key={seg.entry.label} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
              {seg.entry.label} — {formatAmount(seg.entry.amount)} ({seg.entry.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
