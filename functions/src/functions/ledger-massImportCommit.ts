import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { diffRecords } from "../lib/importDiff";
import { applyLedgerRecord } from "../lib/applyLedgerRecord";
import { recomputeRollups } from "../lib/rollups";
import type { ScenarioEnum } from "../lib/enumMap";
import { query } from "../lib/dataconnect-admin";

// Re-validates and inserts using the same transaction pattern as manual entry (plan §3).
// Only commits records the client's diff step classified as NEW or NEW_CORRECTION —
// UNCHANGED records are silently skipped, never re-inserted (ledger history is append-only).

export interface MassImportCommitInput {
  records: Record<string, unknown>[]; // each must include an explicit lowercase `scenario` field
}

const SCENARIO_STRING_TO_ENUM: Record<string, ScenarioEnum> = {
  optimistic: "OPTIMISTIC",
  balanced: "BALANCED",
  conservative: "CONSERVATIVE",
};

export const ledgerMassImportCommit = onCall<MassImportCommitInput, Promise<{ inserted: number; skipped: number }>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const { records } = request.data;
    if (!Array.isArray(records)) {
      throw new HttpsError("invalid-argument", "records must be an array.");
    }

    // Re-diff server-side rather than trusting the client's earlier diff call — the DB may
    // have changed between diff and commit.
    const diff = await diffRecords(records);
    const toInsert = diff.filter((d) => d.classification !== "UNCHANGED");

    const invalid = toInsert.filter((d) => d.validationErrors.length > 0);
    if (invalid.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `${invalid.length} record(s) failed schema validation: ${invalid[0].validationErrors.join("; ")}`
      );
    }

    const affectedCompanies = new Set<string>();

    await withTransaction(async (client) => {
      for (const { record } of toInsert) {
        const scenarioStr = String(record.scenario ?? "").toLowerCase();
        const scenario = SCENARIO_STRING_TO_ENUM[scenarioStr];
        if (!scenario) {
          throw new Error(`Record for ${record.company} on ${record.date} is missing a valid scenario field.`);
        }
        const { scenario: _drop, ...legacyRecord } = record;
        void _drop;
        await applyLedgerRecord(client, legacyRecord, { scenario, createdBy: caller.memberId });
        affectedCompanies.add(String(record.company));
      }
    });

    if (affectedCompanies.size > 0) {
      const companies = await query<{ id: string; name: string }>(
        `SELECT id, name FROM "company" WHERE name = ANY($1)`,
        [Array.from(affectedCompanies)]
      );
      for (const company of companies) {
        await recomputeRollups(company.id);
      }
    }

    return { inserted: toInsert.length, skipped: diff.length - toInsert.length };
  }
);
