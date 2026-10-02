"use client";

import { useState } from "react";
import { ledgerMassImportDiff, ledgerMassImportCommit, type DiffResult } from "@/lib/functions/massIO";
import { ImportDiffTable } from "@/components/ImportDiffTable";
import { LedgerRecordFormattedCard } from "@/components/LedgerRecordFormattedCard";

const EMPTY_RECORD_TEMPLATE = JSON.stringify(
  { date: "", company: "", type: "", scenario: "" },
  null,
  2
);

// Every ledger record — AI-drafted (AdminDocumentsFlow) or hand-written (/admin/ledger/record)
// — renders as editable, pretty-printed JSON (or as a formatted card when `formattedView` is true),
// reusing the exact ledgerMassImportDiff/-Commit pipeline and ImportDiffTable the hand-uploaded
// JSON import flow already uses (app/admin/ledger/import/page.tsx), rather than a structured
// per-field form. A record here is exactly the same shape as one in that JSON import file.
export function LedgerRecordsEditor({
  initialRecords,
  allowAddRemove = false,
  recordLabels,
  expandForSubmit,
  onCommitted,
  onDiffResult,
  formattedView = false,
}: {
  initialRecords: Record<string, unknown>[];
  allowAddRemove?: boolean;
  // One label per position in `initialRecords`, shown instead of "Record N" — used by the AI
  // document-review flow to say which scenario(s) a given card covers.
  recordLabels?: string[];
  // Applied to the parsed, edited records right before diff/commit — the AI document-review
  // flow uses this to expand each edited representative back into its full set of per-scenario
  // copies and to silently splice in any scenario copies that were never shown for review.
  expandForSubmit?: (records: Record<string, unknown>[]) => Record<string, unknown>[];
  // Called after a successful commit — the AI document-review flow uses this to reset back to a
  // clean upload screen rather than leaving stale, already-committed JSON sitting in the editor
  // (a caller that re-analyzes a second document without discarding first would otherwise keep
  // checking/committing against whatever was here from the prior analysis, since this
  // component's own state only initializes once per mount, not on every `initialRecords` change —
  // callers should also remount this component, e.g. via a changing `key`, when starting a
  // genuinely new review rather than relying on this callback alone).
  onCommitted?: () => void;
  // Called with the flattened validation errors after every Check — the AI document-review
  // flow's "ask for a change" box feeds these back to the model verbatim on the next
  // regeneration, so it sees the exact validation failure rather than the admin's own paraphrase.
  onDiffResult?: (errors: string[]) => void;
  // When true, records render as formatted cards by default with a "Show raw JSON" toggle.
  // Defaults to false (raw JSON textareas, the original import-flow behavior).
  formattedView?: boolean;
}) {
  const [showRawJson, setShowRawJson] = useState<Set<number>>(new Set());
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
      const { diff: diffResult } = await ledgerMassImportDiff(expandForSubmit ? expandForSubmit(records) : records);
      setDiff(diffResult);
      const errors = diffResult
        .filter((d) => d.classification !== "UNCHANGED")
        .flatMap((d) => d.validationErrors);
      onDiffResult?.(errors);
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
      const commitResult = await ledgerMassImportCommit(expandForSubmit ? expandForSubmit(records) : records);
      setResult(commitResult);
      setDiff(null);
      onCommitted?.();
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
        {jsonTexts.map((text, i) => {
          const showingRaw = showRawJson.has(i);
          // Parse the current JSON text back to an object for the formatted card.
          let record: Record<string, unknown> | null = null;
          try { record = JSON.parse(text) as Record<string, unknown>; } catch { /* keep null */ }
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{recordLabels?.[i] ?? `Record ${i + 1}`}</span>
                <div className="flex items-center gap-2">
                  {formattedView && record && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(showRawJson);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        setShowRawJson(next);
                      }}
                      className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {showingRaw ? "Show formatted view" : "Show raw JSON"}
                    </button>
                  )}
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
              </div>
              {formattedView && record && !showingRaw ? (
                <LedgerRecordFormattedCard record={record} />
              ) : (
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
              )}
            </div>
          );
        })}
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
