"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { documentsSyncToDrive } from "@/lib/functions/documents";

// Creates the Drive folder structure (Company/Rounds/RoundName, Company/Updates) for
// ledger entries that don't have a corresponding Drive folder yet. Pure folder/file
// creation — never updates ledger detail records (that's SyncFromDrive's role).
export function SyncDocumentsToDriveButton({ companyId }: { companyId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await documentsSyncToDrive(companyId ? { companyId } : {});
      setNotice(
        result.foldersCreated > 0 || result.filesCreated > 0
          ? `Created ${result.foldersCreated} folder(s) and ${result.filesCreated} placeholder file(s) on Drive.`
          : "Nothing to create — all ledger entries already have folders or are not applicable."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync to Drive.");
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
        {busy ? "Creating folders..." : "Sync To Drive"}
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