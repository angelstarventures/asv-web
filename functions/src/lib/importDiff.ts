import { createHash } from "node:crypto";
import { validateLedgerRecord } from "./schema-validate";
import { query } from "./dataconnect-admin";

// Shared by ledger-massImportDiff/-Commit and functions/scripts/migrate-legacy-data.ts (plan
// §3/§5) — one canonical notion of "is this the same record we already have."

export type DiffClassification = "NEW" | "UNCHANGED" | "NEW_CORRECTION";

export interface DiffResult {
  record: Record<string, unknown>;
  classification: DiffClassification;
  contentHash: string;
  validationErrors: string[];
}

// Natural key = (date, company, type, scenario) — a changed record under the same natural key
// is a NEW_CORRECTION (appended, never an in-place update), not an UNCHANGED/UPDATE (plan §3:
// "will be appended, existing entry is not modified"). Scenario is part of the key because one
// record == one scenario's row; the same (date, company, type) legitimately exists as up to 3
// separate rows, one per scenario, with potentially different values (valuation/health types).
function naturalKey(record: Record<string, unknown>, scenarioOverride?: string): string {
  const scenario = (scenarioOverride ?? String(record.scenario ?? "")).toLowerCase();
  return `${record.date}::${record.company}::${record.type}::${scenario}`;
}

// Excludes `scenario` — it's already part of the natural key/bucketing (via scenarioOverride
// or the record's own field), not part of "did the content change." Keeping it out of the
// hash means a migrated record (source JSON with no scenario key) and the same record
// round-tripped through mass-export (which always adds an explicit scenario field) hash
// identically, so Milestone 5's "export -> reimport -> 0-diff" check actually holds.
export function contentHashOf(record: Record<string, unknown>): string {
  const { scenario: _scenario, ...rest } = record;
  void _scenario;
  const stable = JSON.stringify(rest, Object.keys(rest).sort());
  return createHash("sha256").update(stable).digest("hex");
}

interface ExistingEntryRow {
  naturalKey: string;
  contentHash: string;
}

// scenarioOverride: for source data with no per-record `scenario` field (the migration
// script's dev-seed run reads 3 separate files, one per scenario, with no such field on the
// records themselves) — pass the scenario the whole batch belongs to. Mass-import records
// carry their own explicit `scenario` field (per ledger-massExport) and don't need this.
export async function diffRecords(
  records: Record<string, unknown>[],
  scenarioOverride?: string
): Promise<DiffResult[]> {
  const existing = await query<ExistingEntryRow>(
    `SELECT le."event_date" || '::' || c.name || '::' || le.type || '::' || lower(le.scenario::text) AS "naturalKey",
            ia."content_hash" AS "contentHash"
     FROM "ledger_entry" le
     JOIN "company" c ON c.id = le."company_id"
     JOIN "imported_record_hash" ia ON ia."ledger_entry_id" = le.id`
  );
  const existingByKey = new Map<string, Set<string>>();
  for (const row of existing) {
    if (!existingByKey.has(row.naturalKey)) existingByKey.set(row.naturalKey, new Set());
    existingByKey.get(row.naturalKey)!.add(row.contentHash);
  }

  const results: DiffResult[] = [];
  for (const record of records) {
    const validation = validateLedgerRecord(record);
    const key = naturalKey(record, scenarioOverride);
    const hash = contentHashOf(record);
    const hashesForKey = existingByKey.get(key);

    let classification: DiffClassification;
    if (!hashesForKey || hashesForKey.size === 0) {
      classification = "NEW";
    } else if (hashesForKey.has(hash)) {
      classification = "UNCHANGED";
    } else {
      classification = "NEW_CORRECTION";
    }

    results.push({ record, classification, contentHash: hash, validationErrors: validation.errors });
  }
  return results;
}
