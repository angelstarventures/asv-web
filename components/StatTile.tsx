const TILE_VARIANTS = {
  green: { bg: "var(--color-tile-green)", fg: "var(--color-tile-green-foreground)" },
  amber: { bg: "var(--color-tile-amber)", fg: "var(--color-tile-amber-foreground)" },
  violet: { bg: "var(--color-tile-violet)", fg: "var(--color-tile-violet-foreground)" },
  cream: { bg: "var(--color-tile-cream)", fg: "var(--color-tile-cream-foreground)" },
} as const;
export type TileVariant = keyof typeof TILE_VARIANTS;

// Bento-style colorful KPI tile. label (sentence case, no trailing colon) + value (bold,
// auto-compact) — no fabricated delta/trend badge, since RollupCache.computedAt is a
// point-in-time snapshot with no prior-period comparison to honestly diff against.
export function StatTile({
  label,
  value,
  sub,
  variant = "cream",
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: TileVariant;
}) {
  const { bg, fg } = TILE_VARIANTS[variant];
  return (
    <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: bg, color: fg }}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );
}

// Sage badge — strictly for positive yield/ROI figures (Champagne Minimalist spec), used
// wherever a MOIC value appears inline (e.g. a company rollup table row). Non-positive values
// (MOIC <= 1x) stay a neutral sand chip rather than borrowing any other accent color.
export function MoicBadge({ value }: { value: number }) {
  const isPositive = value > 1;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
      style={
        isPositive
          ? { backgroundColor: "var(--color-sage)", color: "var(--color-sage-foreground)" }
          : { backgroundColor: "var(--color-card-border)", color: "var(--foreground)" }
      }
    >
      {formatMoic(value)}
    </span>
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
