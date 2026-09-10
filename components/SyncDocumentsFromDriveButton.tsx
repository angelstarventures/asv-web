"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { documentsSyncFromDrive } from "@/lib/functions/documents";

// "Pull from what's there" — reconciles every company's Investments/{Company}/ (+ Updates/)
// Drive folder against the `document` table, registering anything the app doesn't already
// know about. See functions/src/functions/documents-syncFromDrive.ts for the exact rules.
export function SyncDocumentsFromDriveButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await documentsSyncFromDrive();
      setNotice(
        result.imported > 0
          ? `Imported ${result.imported} new document(s) from Drive (${result.alreadyTracked} already tracked).`
          : `Nothing new to import (${result.alreadyTracked} already tracked).`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync from Drive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={busy}
        className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
      >
        {busy ? "Syncing..." : "Sync from Drive"}
      </button>
      {notice && <p className="text-sm text-zinc-600 dark:text-zinc-400">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
