"use client";

import { useEffect, useId, useRef, useState } from "react";

interface RoundDocument {
  name: string;
  url: string;
}

export function RoundDocumentsButton({ ledgerEntryId, roundName }: { ledgerEntryId: string; roundName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const [documents, setDocuments] = useState<RoundDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function openDocuments() {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setDocuments([]);
    setError(null);
    try {
      const response = await fetch(`/api/round-documents/${encodeURIComponent(ledgerEntryId)}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load round documents.");
      if (!controller.signal.aborted) setDocuments(result.documents);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load round documents.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openDocuments} className="text-xs text-blue-600 underline underline-offset-2 dark:text-blue-400">
        View round documents
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => requestRef.current?.abort()}
        className="fixed inset-0 m-auto max-h-[80vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-background p-5 text-foreground shadow-xl backdrop:bg-black/50 dark:border-zinc-800"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">{roundName} documents</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close round documents" className="rounded px-2 py-1 text-sm text-zinc-500 hover:text-foreground">
            Close
          </button>
        </div>
        {loading && <p role="status" className="text-sm text-zinc-500">Loading documents...</p>}
        {error && (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button type="button" onClick={openDocuments} className="text-sm underline underline-offset-2">Try again</button>
          </div>
        )}
        {!loading && !error && (documents.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {documents.map((document) => (
              <li key={document.url}>
                <a href={document.url} target="_blank" rel="noopener noreferrer" className="break-words text-blue-600 underline underline-offset-2 dark:text-blue-400">
                  {document.name}
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-zinc-500">No documents are available for your account in this round.</p>)}
      </dialog>
    </>
  );
}
