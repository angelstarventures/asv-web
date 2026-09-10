"use client";

import { useEffect, useState } from "react";
import { getCostsSummary, type CostsSummaryOutput } from "@/lib/functions/costs";
import type { AiFeatureKey } from "@/lib/functions/adminSettings";

// Fetches on mount rather than being passed as a server-rendered prop — costsGetSummary makes
// 4 live OpenRouter API calls, and this page is site-admin-only and low-traffic enough that a
// client-side loading spinner is a fine tradeoff for not blocking the whole page's SSR on
// OpenRouter's own response time.
const FEATURE_LABELS: Record<AiFeatureKey, string> = {
  deal_keyword_generation: "Deal keyword generation",
  deal_reviewer_matching: "Deal reviewer matching",
  document_analysis: "Document analysis",
  portfolio_chat: "Portfolio chat",
};

function formatUsd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function CostsSummaryPanel() {
  const [data, setData] = useState<CostsSummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCostsSummary()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load costs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading...</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">OpenRouter</h2>
          <a
            href="https://openrouter.ai/activity"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-foreground"
          >
            View on OpenRouter
          </a>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{formatUsd(data.openRouter.totalUsage)}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Total usage across all 4 feature keys.</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-1.5 font-medium">Feature</th>
              <th className="py-1.5 text-right font-medium">Usage</th>
              <th className="py-1.5 text-right font-medium">Limit remaining</th>
            </tr>
          </thead>
          <tbody>
            {data.openRouter.byFeature.map((f) => (
              <tr key={f.feature} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1.5">{FEATURE_LABELS[f.feature]}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {f.error ? <span className="text-red-600 dark:text-red-400">{f.error}</span> : formatUsd(f.usage)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {f.limitRemaining != null ? formatUsd(f.limitRemaining) : "No limit set"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Serper.dev</h2>
          <a
            href="https://serper.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-foreground"
          >
            View on Serper
          </a>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{formatUsd(data.serper.estimatedCostUsd)}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Estimated from {data.serper.queryCount.toLocaleString()} queries at Serper&apos;s cheapest bulk rate
          ($1/1,000 queries) — Serper has no balance/usage API, so this is a self-tracked count, not a true
          remaining-credits figure. Check the link above for your actual balance.
        </p>
      </div>
    </div>
  );
}
