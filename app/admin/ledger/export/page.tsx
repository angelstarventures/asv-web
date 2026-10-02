"use client";

import { useState } from "react";
import { ledgerMassExport, ledgerGetSchema } from "@/lib/functions/massIO";
import { tenantConfig } from "@/lib/config/tenant";
import type { Scenario } from "@/lib/scenarioTypes";

const SCENARIO_BUTTONS: { scenario: Scenario | undefined; label: string }[] = [
  { scenario: undefined, label: "Download combined ledger (all scenarios)" },
  { scenario: "optimistic", label: "Download optimistic ledger" },
  { scenario: "balanced", label: "Download balanced ledger" },
  { scenario: "conservative", label: "Download conservative ledger" },
];

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Reshapes the ledger back into scenario-tagged JSON — the round-trip target for
// /admin/ledger/import (plan §3, Milestone 5). The combined download still carries an explicit
// `scenario` field per record (matching a mixed-scenario import file); the per-scenario
// downloads are the same shape, just pre-filtered to one scenario.
export default function LedgerExportPage() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleExport(scenario: Scenario | undefined, label: string) {
    setError(null);
    setBusyKey(label);
    try {
      const { records } = await ledgerMassExport(scenario);
      setNotice(`Exported ${records.length} record(s) (${scenario ?? "combined"}).`);
      const suffix = scenario ?? "combined";
      downloadJson(records, `${tenantConfig.orgAbbreviation.toLowerCase()}-ledger-${suffix}-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSchemaDownload() {
    setError(null);
    setBusyKey("schema");
    try {
      const { schema } = await ledgerGetSchema();
      downloadJson(schema, "asv_master_portfolio_schema.json");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the schema.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Export ledger</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Each record carries an explicit <code>scenario</code> field. Round-trips through{" "}
        <code>/admin/ledger/import</code>.
      </p>

      <div className="flex flex-wrap gap-3">
        {SCENARIO_BUTTONS.map(({ scenario, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleExport(scenario, label)}
            disabled={busyKey !== null}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busyKey === label ? "Exporting..." : label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Schema</h2>
        <button
          type="button"
          onClick={handleSchemaDownload}
          disabled={busyKey !== null}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          {busyKey === "schema" ? "Downloading..." : "Download JSON schema"}
        </button>
      </div>

      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
