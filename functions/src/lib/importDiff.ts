import { createHash } from "node:crypto";
import { validateLedgerRecord } from "./schema-validate";
import { query } from "./dataconnect-admin";
import { LEDGER_TYPE_TO_ENUM, legacyTypeToEnum, type LegacyLedgerType } from "./enumMap";
import { checkValuationGuardrails } from "./valuationGuardrails";

// Tolerant of both shapes `record.type` can carry: the legacy JSON string
// ("Participating_PricedRound", from the original schema) or the DB enum form directly
// ("CUSTOM" — mass-exported custom-event records never had a legacy string to begin with,
// see ledger-massExport.ts's ENUM_TO_LEDGER_TYPE fallback).
function normalizeTypeToEnum(type: string): string {
  return type in LEDGER_TYPE_TO_ENUM ? legacyTypeToEnum(type as LegacyLedgerType) : type;
}

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
//
// `type` is normalized to the DB enum form (legacyTypeToEnum) because the existing-rows side
// of this comparison reads `le.type`, which is already the enum value — comparing the raw
// legacy JSON string ("Participating_PricedRound") against the DB enum
// ("PARTICIPATING_PRICED_ROUND") would never match, silently reclassifying every already-
// migrated record as NEW on every re-run (caught by an idempotency re-run producing 64 rows
// instead of skipping all 32 the second time).
function naturalKey(record: Record<string, unknown>, scenarioOverride?: string): string {
  const scenario = (scenarioOverride ?? String(record.scenario ?? "")).toLowerCase();
  const type = normalizeTypeToEnum(String(record.type));
  return `${record.date}::${record.company}::${type}::${scenario}`;
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

// The 3 types that represent ASV actually putting (or explicitly not putting) money into a
// company — the same set rollups.ts already treats as "investment round types" for MOIC
// purposes. Every other type describes something happening *to* an existing investment, so it
// requires one of these to already exist for the company (in the DB or earlier in this same
// batch) — see checkConsistency below.
const ROUND_TYPES = new Set(["PARTICIPATING_PRICED_ROUND", "PARTICIPATING_SAFE_ROUND", "NON_PARTICIPATING_ROUND"]);

// Record types whose per-member dict must line up with the members who actually hold an
// allocation in that company (not just any member) — a valuation or payout naming someone who
// never invested, or omitting someone who did, is a real data-entry mistake, not a stylistic one.
const MEMBER_DICT_FIELD_BY_TYPE: Partial<Record<string, "member_valuations" | "member_payouts">> = {
  TRANSACTION_VALUATION_CHANGE: "member_valuations",
  INTERNAL_VALUATION_ASSESSMENT: "member_valuations",
  EXIT_EVENT: "member_payouts",
};

interface CompanyHistoryRow {
  companyName: string;
  type: string;
}
interface CompanyAllocationRow {
  companyName: string;
  memberId: string;
}

// Cross-record/cross-table checks AJV can never do on its own (it only ever sees one record's
// shape in isolation) — e.g. "does not allow a company update for a company ASV hasn't
// invested in" or "an internal valuation assessment's members must match the company's actual
// investors." Batch-internal round records count too, so a brand-new company's round + its own
// first update, pasted together in one JSON paste, isn't rejected for lacking "existing"
// history this very batch is establishing.
export async function checkConsistency(records: Record<string, unknown>[]): Promise<string[][]> {
  const historyRows = await query<CompanyHistoryRow>(
    `SELECT c.name AS "companyName", le.type AS "type"
     FROM "ledger_entry" le JOIN "company" c ON c.id = le."company_id"
     WHERE le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')`
  );
  const companiesWithRound = new Set(historyRows.map((r) => r.companyName));

  const allocationRows = await query<CompanyAllocationRow>(
    `SELECT c.name AS "companyName", a."member_id" AS "memberId"
     FROM "allocation" a
     JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     JOIN "company" c ON c.id = le."company_id"`
  );
  const allocationMembersByCompany = new Map<string, Set<string>>();
  for (const row of allocationRows) {
    if (!allocationMembersByCompany.has(row.companyName)) allocationMembersByCompany.set(row.companyName, new Set());
    allocationMembersByCompany.get(row.companyName)!.add(row.memberId);
  }

  for (const record of records) {
    const type = normalizeTypeToEnum(String(record.type));
    const companyName = String(record.company ?? "");
    if (ROUND_TYPES.has(type)) {
      companiesWithRound.add(companyName);
      const allocations = (record.allocations as Record<string, number> | undefined) ?? {};
      if (!allocationMembersByCompany.has(companyName)) allocationMembersByCompany.set(companyName, new Set());
      for (const memberId of Object.keys(allocations)) {
        allocationMembersByCompany.get(companyName)!.add(memberId);
      }
    }
  }

  // Mechanical price-per-share/fair-market-value sanity checks (see valuationGuardrails.ts) —
  // only "error" severity blocks here; "warning" severity is surfaced earlier, at AI-drafting
  // review time in documents-analyze.ts, where a human is already in the loop before this
  // stricter commit-time gate runs.
  const guardrailFindings = await checkValuationGuardrails(records);
  const guardrailErrorsByIndex = new Map<number, string[]>();
  for (const finding of guardrailFindings) {
    if (finding.severity !== "error") continue;
    if (!guardrailErrorsByIndex.has(finding.recordIndex)) guardrailErrorsByIndex.set(finding.recordIndex, []);
    guardrailErrorsByIndex.get(finding.recordIndex)!.push(finding.message);
  }

  return records.map((record, index) => {
    const errors: string[] = [...(guardrailErrorsByIndex.get(index) ?? [])];
    const type = normalizeTypeToEnum(String(record.type));
    const companyName = String(record.company ?? "");

    if (!ROUND_TYPES.has(type) && !companiesWithRound.has(companyName)) {
      errors.push(
        `"${companyName}" has no existing investment round on record — a ${type} entry cannot be added for a company ASV has not invested in.`
      );
    }

    const memberDictField = MEMBER_DICT_FIELD_BY_TYPE[type];
    if (memberDictField) {
      const dict = (record[memberDictField] as Record<string, number> | undefined) ?? {};
      const dictMembers = new Set(Object.keys(dict));
      const allocationMembers = allocationMembersByCompany.get(companyName) ?? new Set();
      const missing = [...allocationMembers].filter((m) => !dictMembers.has(m));
      const extra = [...dictMembers].filter((m) => !allocationMembers.has(m));
      if (missing.length > 0) {
        errors.push(
          `${memberDictField} for "${companyName}" is missing member(s) who hold an allocation there: ${missing.join(", ")}.`
        );
      }
      if (extra.length > 0) {
        errors.push(
          `${memberDictField} for "${companyName}" includes member(s) with no allocation there: ${extra.join(", ")}.`
        );
      }
    }

    return errors;
  });
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

  const consistencyErrors = await checkConsistency(records);

  const results: DiffResult[] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
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

    // Only surface consistency errors for records that would actually be written — an
    // UNCHANGED record is already in the ledger and re-flagging it on every re-check would
    // just be noise (and could never be "fixed" by editing a record nobody is submitting).
    const validationErrors =
      classification === "UNCHANGED" ? validation.errors : [...validation.errors, ...consistencyErrors[i]];

    results.push({ record, classification, contentHash: hash, validationErrors });
  }
  return results;
}
