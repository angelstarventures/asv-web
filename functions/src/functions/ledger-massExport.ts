import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { fetchAllLedgerRecords } from "../lib/legacyRecordShape";
import { SCENARIO_TO_ENUM, type LegacyScenario } from "../lib/enumMap";

// Reshapes the full ledger back into scenario-tagged JSON, fixing the legacy single-file
// ambiguity going forward by always including an explicit `scenario` field on every record
// (plan §3) — the round-trip target for ledger-massImportDiff/-Commit. Also the data source
// for the "manage the entire ledger" admin table (each record carries `id`) and the AI
// portfolio chat's admin-scope context (ai-portfolioQuery.ts) — see legacyRecordShape.ts.
// `scenario` (optimistic/balanced/conservative), when given, restricts the export to just that
// scenario's rows — the admin export page's per-scenario download buttons; omitted, every
// scenario's rows come back combined, as before.

export interface LedgerMassExportInput {
  scenario?: LegacyScenario;
}

export const ledgerMassExport = onCall<LedgerMassExportInput, Promise<{ records: Record<string, unknown>[] }>>(
  async (request) => {
    await requireAdmin(request);
    const { scenario } = request.data ?? {};
    if (scenario && !(scenario in SCENARIO_TO_ENUM)) {
      throw new HttpsError("invalid-argument", "scenario must be optimistic, balanced, or conservative.");
    }
    const records = await fetchAllLedgerRecords(scenario ? SCENARIO_TO_ENUM[scenario] : undefined);
    return { records };
  }
);
