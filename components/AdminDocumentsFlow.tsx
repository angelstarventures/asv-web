"use client";

import { useState } from "react";
import { DocumentDropzone } from "@/components/DocumentDropzone";
import { LedgerRecordsEditor } from "@/components/LedgerRecordsEditor";

// Orchestrates the AI-2 flow: upload+analyze (DocumentDropzone) -> review/edit/commit
// (AiProposedRecordsReview). Split into its own client component so the page itself can stay
// an async server component fetching the company list.
export function AdminDocumentsFlow({
  companies,
}: {
  companies: { id: string; name: string; tradeName?: string | null }[];
}) {
  const [proposedRecords, setProposedRecords] = useState<Record<string, unknown>[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function handleAnalyzed(records: Record<string, unknown>[], newWarnings: string[]) {
    setProposedRecords(records);
    setWarnings(newWarnings);
  }

  return (
    <div className="flex flex-col gap-8">
      <DocumentDropzone companies={companies} onAnalyzed={handleAnalyzed} />

      {proposedRecords && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">AI-drafted ledger record(s)</h2>
            <button
              type="button"
              onClick={() => {
                setProposedRecords(null);
                setWarnings([]);
              }}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Discard and start over
            </button>
          </div>
          {warnings.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">Review before committing:</p>
              <ul className="list-disc pl-5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <LedgerRecordsEditor initialRecords={proposedRecords} />
        </div>
      )}
    </div>
  );
}
