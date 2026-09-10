// Fixed categorical hue order (dataviz skill) — never cycled. A breakdown with more entries than
// this folds everything past the top (MAX_SLOTS - 1) into "Other" (the last slot), same
// principle as the skill's "a 9th series is never a generated hue" rule — extended once to 10
// validated slots (see globals.css) so a long-tail breakdown (34+ portfolio companies) has more
// room before Other's share gets large.
export const CATEGORY_COLORS = [
  "var(--viz-cat-1)",
  "var(--viz-cat-2)",
  "var(--viz-cat-3)",
  "var(--viz-cat-4)",
  "var(--viz-cat-5)",
  "var(--viz-cat-6)",
  "var(--viz-cat-7)",
  "var(--viz-cat-8)",
  "var(--viz-cat-9)",
  "var(--viz-cat-10)",
] as const;

export const OTHER_LABEL = "Other";
const MAX_SLOTS = CATEGORY_COLORS.length;

export interface ChartEntry {
  label: string;
  amount: number;
  pct: number;
}

// Entries arrive pre-sorted descending by amount (lib/reportsData.ts's toBreakdown) — folds
// everything past the top (MAX_SLOTS - 1) into one "Other" entry so a company-by-company or
// industry-by-industry breakdown with many rows never needs a 9th hue.
export function foldToSlots(entries: ChartEntry[]): ChartEntry[] {
  if (entries.length <= MAX_SLOTS) return entries;
  const kept = entries.slice(0, MAX_SLOTS - 1);
  const rest = entries.slice(MAX_SLOTS - 1);
  const otherAmount = rest.reduce((sum, e) => sum + e.amount, 0);
  const otherPct = rest.reduce((sum, e) => sum + e.pct, 0);
  return [...kept, { label: OTHER_LABEL, amount: otherAmount, pct: Math.round(otherPct * 10) / 10 }];
}
