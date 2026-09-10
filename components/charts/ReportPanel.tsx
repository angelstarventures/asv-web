"use client";

import { useState } from "react";
import { formatCurrencyCompact } from "@/components/StatTile";
import { CategoryPieChart } from "./CategoryPieChart";
import { CategoryBarChart } from "./CategoryBarChart";
import type { ChartEntry } from "./categoryColors";

// Title + pie/bar toggle (per-panel, not global — confirmed preference) + a table fallback
// (dataviz skill accessibility rule: a table view exists alongside the chart, not instead of
// it) for one of the Reports tab's flat category breakdowns (amount/value by company or
// industry, investment by year, companies by year). `unit` (not a formatter function) is
// passed from the server component — functions can't cross the Server->Client boundary as
// props, so the actual formatting happens in here instead.
export function ReportPanel({
  title,
  entries,
  unit = "currency",
  amountColumnLabel,
  barOnly,
}: {
  title: string;
  entries: ChartEntry[];
  unit?: "currency" | "count";
  amountColumnLabel: string;
  barOnly?: boolean;
}) {
  const [mode, setMode] = useState<"pie" | "bar">(barOnly ? "bar" : "pie");
  const formatAmount = (n: number) => (unit === "count" ? String(n) : formatCurrencyCompact(n));

  return (
    <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
        {!barOnly && (
          <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
            {(["pie", "bar"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMode(opt)}
                aria-pressed={mode === opt}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  mode === opt ? "bg-foreground text-background" : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "pie" ? (
        <CategoryPieChart entries={entries} unit={unit} title={title} />
      ) : (
        <CategoryBarChart entries={entries} unit={unit} />
      )}

      {entries.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 underline underline-offset-2">View as table</summary>
          <table className="mt-2 w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="py-1 font-medium">Label</th>
                <th className="py-1 text-right font-medium">{amountColumnLabel}</th>
                <th className="py-1 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.label} className="border-t border-zinc-100 dark:border-zinc-900">
                  <td className="py-1">{e.label}</td>
                  <td className="py-1 text-right tabular-nums">{formatAmount(e.amount)}</td>
                  <td className="py-1 text-right tabular-nums">{e.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
