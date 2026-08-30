// Stat-tile contract (dataviz skill): label (sentence case, no trailing colon) + value
// (semibold, auto-compact). No delta/trend yet — RollupCache.computedAt gives a point-in-time
// snapshot, not a prior-period comparison, so there's nothing honest to diff against in V1.
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{sub}</p>}
    </div>
  );
}

export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatMoic(value: number): string {
  return `${value.toFixed(2)}x`;
}
