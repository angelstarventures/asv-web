"use client";

import { useState } from "react";
import { getDocumentAccessUrl } from "@/lib/functions/documents";

// Centralizes the role+allocation visibility check's *rendering* (plan §4) — callers pass an
// already-computed `canAccess` (see lib/auth/documentAccess.ts) rather than this component
// deciding for itself, so the same check is never implemented twice. Real enforcement lives
// server-side: clicking calls documentsGetAccessUrl (checks + audit-logs the access), then opens
// the URL it returns — /api/documents/[id] itself re-derives the same decision independently
// and never trusts a client-supplied documentId's `canAccess` being true.
export function DocumentLink({
  documentId,
  label,
  canAccess,
}: {
  documentId: string;
  label: string;
  canAccess: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canAccess) {
    return (
      <span
        className="text-sm text-zinc-400 dark:text-zinc-600"
        title="You don't have access to this document."
      >
        {label} (restricted)
      </span>
    );
  }

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      const { downloadUrl } = await getDocumentAccessUrl({ documentId });
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-left text-sm text-zinc-600 underline underline-offset-2 disabled:opacity-50 dark:text-zinc-400"
      >
        {busy ? "Opening..." : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
