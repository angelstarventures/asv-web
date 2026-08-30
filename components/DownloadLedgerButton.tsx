"use client";

import { useState } from "react";

// FR-6: fetch + blob-download rather than a bare `window.location` navigation, so a failure
// (session expired, network error) surfaces as an inline message instead of a blank error
// page the user gets stuck on (plan §4).
export function DownloadLedgerButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ledger/my-ledger");
      if (!res.ok) throw new Error(`Download failed (${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "asv-my-ledger.json";
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
        {busy ? "Downloading..." : "Download my ledger"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
