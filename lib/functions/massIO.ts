import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
import type { Scenario } from "@/lib/scenarioTypes";

// Mirrors functions/src/functions/ledger-massExport.ts / ledger-massImportDiff.ts /
// ledger-massImportCommit.ts exactly — same duplicated-boundary-contract reasoning as
// lib/functions/ledgerWrites.ts and adminMembers.ts.

export async function ledgerMassExport(scenario?: Scenario): Promise<{ records: Record<string, unknown>[] }> {
  const call = httpsCallable<{ scenario?: Scenario }, { records: Record<string, unknown>[] }>(
    functions,
    "ledgerMassExport"
  );
  return (await call(scenario ? { scenario } : {})).data;
}

export async function ledgerGetSchema(): Promise<{ schema: unknown }> {
  const call = httpsCallable<Record<string, never>, { schema: unknown }>(functions, "ledgerGetSchema");
  return (await call({})).data;
}

export type DiffClassification = "NEW" | "UNCHANGED" | "NEW_CORRECTION";

export interface DiffResult {
  record: Record<string, unknown>;
  classification: DiffClassification;
  contentHash: string;
  validationErrors: string[];
}

export async function ledgerMassImportDiff(records: Record<string, unknown>[]): Promise<{ diff: DiffResult[] }> {
  const call = httpsCallable<{ records: Record<string, unknown>[] }, { diff: DiffResult[] }>(
    functions,
    "ledgerMassImportDiff"
  );
  return (await call({ records })).data;
}

export async function ledgerMassImportCommit(
  records: Record<string, unknown>[]
): Promise<{ inserted: number; skipped: number }> {
  const call = httpsCallable<{ records: Record<string, unknown>[] }, { inserted: number; skipped: number }>(
    functions,
    "ledgerMassImportCommit"
  );
  return (await call({ records })).data;
}

export async function ledgerDeleteRecord(ledgerEntryId: string): Promise<{ ok: true }> {
  const call = httpsCallable<{ ledgerEntryId: string }, { ok: true }>(functions, "ledgerDeleteRecord");
  return (await call({ ledgerEntryId })).data;
}

export async function ledgerUpdateRecord(
  ledgerEntryId: string,
  record: Record<string, unknown>
): Promise<{ ok: true }> {
  const call = httpsCallable<{ ledgerEntryId: string; record: Record<string, unknown> }, { ok: true }>(
    functions,
    "ledgerUpdateRecord"
  );
  return (await call({ ledgerEntryId, record })).data;
}
