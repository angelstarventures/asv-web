"use client";

import { useState } from "react";
import { ledgerMassExport } from "@/lib/functions/massIO";

// Reshapes the full ledger back into a single scenario-tagged JSON file — the round-trip
// target for /admin/ledger/import (plan §3, Milestone 5).
export default function LedgerExportPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function handleExport() {
    setError(null);
    setBusy(true);
    try {
      const { records } = await ledgerMassExport();
      setCount(records.length);
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asv-ledger-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Export ledger</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Downloads every ledger entry, across every scenario, as one JSON file — each record
        carries an explicit <code>scenario</code> field. Round-trips through{" "}
        <code>/admin/ledger/import</code>.
      </p>
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Exporting..." : "Export ledger to JSON"}
      </button>
      {count !== null && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">Exported {count} record(s).</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
