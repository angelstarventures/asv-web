"use client";

import { useState } from "react";
import { ledgerMassImportDiff, ledgerMassImportCommit, type DiffResult } from "@/lib/functions/massIO";
import { ImportDiffTable } from "@/components/ImportDiffTable";

const EMPTY_RECORD_TEMPLATE = JSON.stringify(
  { date: "", company: "", type: "", scenario: "" },
  null,
  2
);

// Every ledger record — AI-drafted (AdminDocumentsFlow) or hand-written (/admin/ledger/record)
// — renders as editable, pretty-printed JSON, reusing the exact ledgerMassImportDiff/-Commit
// pipeline and ImportDiffTable the hand-uploaded JSON import flow already uses
// (app/admin/ledger/import/page.tsx), rather than a structured per-field form. A record here is
// exactly the same shape as one in that JSON import file.
export function LedgerRecordsEditor({
  initialRecords,
  allowAddRemove = false,
}: {
  initialRecords: Record<string, unknown>[];
  allowAddRemove?: boolean;
}) {
  const [jsonTexts, setJsonTexts] = useState<string[]>(
    initialRecords.length > 0 ? initialRecords.map((r) => JSON.stringify(r, null, 2)) : [EMPTY_RECORD_TEMPLATE]
  );
  const [diff, setDiff] = useState<DiffResult[] | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function parseAll(): Record<string, unknown>[] | null {
    try {
      const parsed = jsonTexts.map((text, i) => {
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new Error(`Record ${i + 1} is not valid JSON.`);
        }
      });
      setParseError(null);
      return parsed;
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON.");
      return null;
    }
  }

  function addRecord() {
    setJsonTexts((prev) => [...prev, EMPTY_RECORD_TEMPLATE]);
    setDiff(null);
    setResult(null);
  }

  function removeRecord(index: number) {
    setJsonTexts((prev) => prev.filter((_, i) => i !== index));
    setDiff(null);
    setResult(null);
  }

  async function handleCheck() {
    const records = parseAll();
    if (!records) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const { diff: diffResult } = await ledgerMassImportDiff(records);
      setDiff(diffResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check these records.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    const records = parseAll();
    if (!records) return;
    setError(null);
    setBusy(true);
    try {
      const commitResult = await ledgerMassImportCommit(records);
      setResult(commitResult);
      setDiff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed.");
    } finally {
      setBusy(false);
    }
  }

  const toCommitCount = diff?.filter((d) => d.classification !== "UNCHANGED").length ?? 0;
  const hasValidationErrors = diff?.some((d) => d.classification !== "UNCHANGED" && d.validationErrors.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Review and edit each record below, then check it against the ledger before committing.
        Nothing is written to the database until you commit.
      </p>

      <div className="flex flex-col gap-3">
        {jsonTexts.map((text, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>Record {i + 1}</span>
              {allowAddRemove && jsonTexts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRecord(i)}
                  className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => {
                const next = [...jsonTexts];
                next[i] = e.target.value;
                setJsonTexts(next);
                setDiff(null);
              }}
              rows={12}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        ))}
      </div>

      {allowAddRemove && (
        <button
          type="button"
          onClick={addRecord}
          className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          Add another record
        </button>
      )}

      {parseError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {parseError}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCheck}
        disabled={busy}
        className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
      >
        {busy ? "Checking..." : "Check"}
      </button>

      {diff && (
        <>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {toCommitCount} to commit ({diff.filter((d) => d.classification === "NEW").length} new,{" "}
            {diff.filter((d) => d.classification === "NEW_CORRECTION").length} changed),{" "}
            {diff.filter((d) => d.classification === "UNCHANGED").length} unchanged.
          </p>
          <ImportDiffTable diff={diff} />
          <button
            type="button"
            onClick={handleCommit}
            disabled={busy || toCommitCount === 0 || hasValidationErrors}
            className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Committing..." : `Commit ${toCommitCount} record(s)`}
          </button>
        </>
      )}

      {result && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Committed. Inserted {result.inserted}, skipped {result.skipped} (already unchanged).
        </p>
      )}
    </div>
  );
}
