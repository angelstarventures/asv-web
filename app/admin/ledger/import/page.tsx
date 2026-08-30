"use client";

import { useState, type ChangeEvent } from "react";
import { ledgerMassImportDiff, ledgerMassImportCommit, type DiffResult } from "@/lib/functions/massIO";
import { ImportDiffTable } from "@/components/ImportDiffTable";

// Upload -> diff -> confirm wizard (plan §4). Accepts either a bare JSON array (the
// mass-export download shape) or `{ records: [...] }`, so re-uploading exactly what
// /admin/ledger/export just produced works without any reshaping.
function parseUploadedRecords(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text);
  const records = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(records)) {
    throw new Error("Expected a JSON array of records, or an object with a `records` array.");
  }
  return records;
}

export default function LedgerImportPage() {
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null);
  const [diff, setDiff] = useState<DiffResult[] | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setDiff(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsedRecords = parseUploadedRecords(text);
      setRecords(parsedRecords);
      const { diff: diffResult } = await ledgerMassImportDiff(parsedRecords);
      setDiff(diffResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read or diff this file.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleCommit() {
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
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Import ledger</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Upload a JSON export. Every record is diffed against what&apos;s already in the ledger by
        (date, company, type, scenario) before anything is written — nothing is modified in
        place, a changed record is appended as a new row.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        JSON file
        <input type="file" accept="application/json" onChange={handleFileChange} disabled={busy} />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {diff && (
        <>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {diff.length} record(s) read — {toCommitCount} to commit (
            {diff.filter((d) => d.classification === "NEW").length} new,{" "}
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
