"use client";

import { useState } from "react";
import Link from "next/link";
import { ledgerAudit, rebalanceMemberValuations, type AuditFinding } from "@/lib/functions/ledgerAudit";

const CATEGORY_LABELS: Record<AuditFinding["category"], string> = {
  rollup: "Rollup accuracy",
  cross_scenario: "Cross-scenario consistency",
  member_valuation_sum: "Member-valuation sums",
  price_continuity: "Price-per-share continuity",
  fmv_plausibility: "Fair-market-value plausibility",
};

function FindingActions({ finding }: { finding: AuditFinding }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixed, setFixed] = useState(false);

  if (fixed) {
    return <p className="mt-1 text-xs font-medium">Rebalanced.</p>;
  }

  if (finding.canAutoFix && finding.ledgerEntryId) {
    return (
      <div className="mt-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={async () => {
            setError(null);
            setBusy(true);
            try {
              await rebalanceMemberValuations(finding.ledgerEntryId!);
              setFixed(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Rebalance failed.");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="self-start rounded-full border border-current px-3 py-1 text-xs font-medium disabled:opacity-50"
        >
          {busy ? "Rebalancing..." : "Rebalance member valuations"}
        </button>
        {error && <p className="text-xs">{error}</p>}
      </div>
    );
  }

  if (finding.ledgerEntryId) {
    return (
      <Link
        href={`/admin/ledger/manage?ledgerEntryId=${finding.ledgerEntryId}`}
        className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
      >
        Fix in Manage Ledger
      </Link>
    );
  }

  return null;
}

// Runs functions/src/lib/ledgerAudit.ts's four checks on demand. member_valuation_sum findings
// are a pure arithmetic bug (the split is exactly reproducible from already-recorded data) and
// get a one-click "Rebalance" fix; everything else that traces to a specific ledger entry
// (price_continuity/fmv_plausibility) needs a human judgment call, same as the Prosperous Brands
// correction, so it links straight to that entry in Manage Ledger instead of auto-fixing.
export function LedgerAuditRunner() {
  const [findings, setFindings] = useState<AuditFinding[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    setBusy(true);
    setFindings(null);
    try {
      const result = await ledgerAudit();
      setFindings(result.findings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setBusy(false);
    }
  }

  const grouped = findings
    ? (Object.keys(CATEGORY_LABELS) as AuditFinding["category"][])
        .map((category) => ({ category, items: findings.filter((f) => f.category === category) }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Recomputes every company&apos;s rollups from scratch and checks: cross-scenario
        allocation consistency, member-valuation sums against their recorded totals,
        price-per-share continuity across rounds, and fair-market-value plausibility against
        ownership percentage. This can take a while for a large ledger.
      </p>

      <button
        type="button"
        onClick={handleRun}
        disabled={busy}
        className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Running audit..." : "Run audit"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {findings && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {findings.length === 0
              ? "No issues found."
              : `${findings.length} finding(s) across ${grouped.length} categor${grouped.length === 1 ? "y" : "ies"}.`}
          </p>
          {grouped.map((g) => (
            <div key={g.category} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{CATEGORY_LABELS[g.category]}</h3>
              <ul className="flex flex-col gap-2">
                {g.items.map((f, i) => (
                  <li
                    key={i}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      f.severity === "error"
                        ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                        : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {f.message}
                    <FindingActions finding={f} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
