import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { validateLedgerRecord } from "../lib/schema-validate";
import { checkConsistency } from "../lib/importDiff";
import { applyLedgerRecord } from "../lib/applyLedgerRecord";
import { deleteLedgerEntry } from "../lib/deleteLedgerRecord";
import { recomputeRollups } from "../lib/rollups";
import type { ScenarioEnum } from "../lib/enumMap";

// Backs the "manage the entire ledger" table's Edit popup. The ledger has no in-place update
// primitive (append-only by design — see applyLedgerRecord.ts), so "editing" a row is
// implemented as delete-the-old-row-then-applyLedgerRecord-the-new-content inside one
// transaction: from the admin's point of view it's the same logical entry, corrected; under
// the hood it gets a fresh ledger_entry id. Same schema + consistency validation as recording a
// brand-new entry (ledger-massImportDiff/-Commit), so an edit can't introduce the same mistakes
// a new entry is blocked from introducing.

export interface LedgerUpdateRecordInput {
  ledgerEntryId: string;
  record: Record<string, unknown>; // full legacy-schema-shaped record, including `scenario`
}

const SCENARIO_STRING_TO_ENUM: Record<string, ScenarioEnum> = {
  optimistic: "OPTIMISTIC",
  balanced: "BALANCED",
  conservative: "CONSERVATIVE",
};

export const ledgerUpdateRecord = onCall<LedgerUpdateRecordInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);
  const { ledgerEntryId, record } = request.data;
  if (!ledgerEntryId || !record) {
    throw new HttpsError("invalid-argument", "ledgerEntryId and record are required.");
  }

  const validation = validateLedgerRecord(record);
  const [consistencyErrors] = await checkConsistency([record]);
  const errors = [...validation.errors, ...consistencyErrors];
  if (errors.length > 0) {
    throw new HttpsError("invalid-argument", errors.join("; "));
  }

  const scenarioStr = String(record.scenario ?? "").toLowerCase();
  const scenario = SCENARIO_STRING_TO_ENUM[scenarioStr];
  if (!scenario) {
    throw new HttpsError("invalid-argument", "record.scenario must be optimistic, balanced, or conservative.");
  }

  const { scenario: _drop, ...legacyRecord } = record;
  void _drop;

  const oldCompanyId = await withTransaction(async (client) => {
    const companyId = await deleteLedgerEntry(client, ledgerEntryId);
    await applyLedgerRecord(client, legacyRecord, { scenario, createdBy: caller.memberId });
    return companyId;
  });

  // Recompute both the old and (if the admin changed `record.company` during the edit) the new
  // company's rollups — same pattern as ledgerMassImportCommit's affectedCompanies handling.
  const companiesToRecompute = new Set([oldCompanyId]);
  const newCompanyRows = await query<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [
    String(record.company),
  ]);
  if (newCompanyRows[0]) companiesToRecompute.add(newCompanyRows[0].id);
  for (const companyId of companiesToRecompute) {
    await recomputeRollups(companyId);
  }

  return { ok: true };
});
