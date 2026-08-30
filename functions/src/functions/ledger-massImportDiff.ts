import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { diffRecords, type DiffResult } from "../lib/importDiff";

// Two-phase: diff (this function) computes a content hash per incoming record's natural key
// and classifies NEW / UNCHANGED / NEW_CORRECTION — never mutates anything (plan §3).
// commit (ledger-massImportCommit) re-validates and inserts using the same transaction
// pattern as manual entry.

export interface MassImportDiffInput {
  records: Record<string, unknown>[];
}

export const ledgerMassImportDiff = onCall<MassImportDiffInput, Promise<{ diff: DiffResult[] }>>(
  async (request) => {
    await requireAdmin(request);
    const { records } = request.data;
    if (!Array.isArray(records)) {
      throw new HttpsError("invalid-argument", "records must be an array.");
    }

    const diff = await diffRecords(records);
    return { diff };
  }
);
