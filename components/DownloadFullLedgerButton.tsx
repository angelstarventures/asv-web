"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/scenarioTypes";

const LABELS: Record<Scenario, string> = {
  optimistic: "Optimistic",
  balanced: "Balanced",
  conservative: "Conservative",
};

// Full ledger export (app/api/ledger/my-full-ledger) for whichever scenario is currently
// selected via ScenarioScopeToggle — every record type with full detail, filtered to
// companies I've invested in, never another member's figures. Fetch + blob-download rather
// than a bare navigation, so a failure surfaces inline instead of a blank error page.
export function DownloadFullLedgerButton({ scenario }: { scenario: Scenario }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/ledger/my-full-ledger?scenario=${scenario}`);
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asv-ledger-${scenario}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
      >
        {busy ? "Downloading..." : `Download my ledger (${LABELS[scenario]})`}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
