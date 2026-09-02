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

  return (
    <div className="flex flex-col gap-8">
      <DocumentDropzone companies={companies} onAnalyzed={setProposedRecords} />

      {proposedRecords && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">AI-drafted ledger record(s)</h2>
            <button
              type="button"
              onClick={() => setProposedRecords(null)}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Discard and start over
            </button>
          </div>
          <LedgerRecordsEditor initialRecords={proposedRecords} />
        </div>
      )}
    </div>
  );
}
