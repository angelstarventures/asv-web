import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { deleteLedgerEntry } from "../lib/deleteLedgerRecord";
import { recomputeRollups } from "../lib/rollups";

// Backs the "manage the entire ledger" table's Delete button. The ledger is otherwise
// append-only by design (see applyLedgerRecord.ts) — this is a deliberate, admin-only escape
// hatch for removing a genuine mistake, not a new correction mechanism.

export interface LedgerDeleteRecordInput {
  ledgerEntryId: string;
}

export const ledgerDeleteRecord = onCall<LedgerDeleteRecordInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { ledgerEntryId } = request.data;
  if (!ledgerEntryId) {
    throw new HttpsError("invalid-argument", "ledgerEntryId is required.");
  }

  const companyId = await withTransaction((client) => deleteLedgerEntry(client, ledgerEntryId));
  await recomputeRollups(companyId);

  return { ok: true };
});
