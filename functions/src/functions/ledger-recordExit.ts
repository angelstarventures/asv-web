import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { validateLedgerRecord } from "../lib/schema-validate";
import { applyLedgerRecord } from "../lib/applyLedgerRecord";
import { recomputeRollups } from "../lib/rollups";
import { findCompanyIdByName, type Run } from "../lib/transferWrites";
import { previewExitCarry, type ExitCarryPreview } from "../lib/exitCarry";
import { fetchAllMemberIds } from "../lib/memberIds";
import { SCENARIO_TO_ENUM, type LegacyScenario } from "../lib/enumMap";

// Records a complete exit (or write-off) as three identical scenario rows. `preview: true` returns
// the checks and the carry each member would be charged without writing anything - the admin form's
// live panel. member_payouts are GROSS; carry (when configured) is stored as fee lines.

export type ExitType = "Acquisition" | "IPO" | "Merger" | "Shutdown" | "Dissolution";

export interface RecordExitInput {
  company: string;
  date: string; // YYYY-MM-DD
  exitType: ExitType;
  totalExitValue: number;
  asvTotalPayout: number;
  memberPayouts: Record<string, number>;
  docLink?: string;
  applyCarry?: boolean; // false opts this exit out of carry
  preview?: boolean;
}

export interface RecordExitOutput {
  errors: string[];
  warnings: string[];
  payoutSum: number;
  carry: ExitCarryPreview | null;
  recorded: boolean;
}

const dbRun: Run = (text, params) => query(text, params);
const SCENARIOS: LegacyScenario[] = ["balanced", "optimistic", "conservative"];
const PAYOUT_SUM_TOLERANCE = 50; // same tolerance the ledger audit uses for member-value sums

export const ledgerRecordExit = onCall<RecordExitInput, Promise<RecordExitOutput>>(async (request) => {
  const caller = await requireAdmin(request);
  const d = request.data;
  if (!d || typeof d.company !== "string" || !d.company.trim()) {
    throw new HttpsError("invalid-argument", "company is required.");
  }

  const record: Record<string, unknown> = {
    type: "Exit_Event",
    company: d.company.trim(),
    date: d.date,
    exit_type: d.exitType,
    total_exit_value: d.totalExitValue,
    asv_total_payout: d.asvTotalPayout,
    member_payouts: d.memberPayouts ?? {},
    ...(d.docLink ? { doc_link: d.docLink } : {}),
    ...(d.applyCarry === false ? { apply_carry: false } : {}),
  };

  const errors: string[] = [];
  const warnings: string[] = [];
  const validation = validateLedgerRecord(record);
  if (!validation.valid) errors.push(...validation.errors);

  const payouts = d.memberPayouts ?? {};
  const payoutSum = Math.round(Object.values(payouts).reduce((n, v) => n + (typeof v === "number" ? v : 0), 0) * 100) / 100;
  let carry: ExitCarryPreview | null = null;

  const companyId = await findCompanyIdByName(dbRun, d.company.trim());
  if (!companyId) {
    errors.push(`"${d.company}" is not a known company.`);
  } else if (errors.length === 0) {
    const known = await fetchAllMemberIds();
    for (const id of Object.keys(payouts)) if (!known.has(id)) errors.push(`Member ${id} does not exist.`);
    const gap = Math.abs(payoutSum - d.asvTotalPayout);
    if (gap >= PAYOUT_SUM_TOLERANCE) {
      errors.push(`Member payouts add up to ${payoutSum}, but the ASV total payout is ${d.asvTotalPayout}.`);
    } else if (gap > 0.005) {
      warnings.push(`Member payouts add up to ${payoutSum}, ${gap.toFixed(2)} away from the ASV total payout.`);
    }
    const existing = await query<{ date: string }>(
      `SELECT DISTINCT le."event_date"::text AS date FROM "ledger_entry" le WHERE le."company_id" = $1 AND le.type = 'EXIT_EVENT'`,
      [companyId]
    );
    if (existing.length > 0) {
      warnings.push(
        `This company already has an exit recorded (${existing.map((e) => e.date).join(", ")}). Recording another is only right for a partial or later exit.`
      );
    }
    if (errors.length === 0) {
      carry = await previewExitCarry(dbRun, companyId, record);
      errors.push(...carry.errors);
      if (!carry.applies && carry.reason) warnings.push(carry.reason);
    }
  }

  if (d.preview) return { errors, warnings, payoutSum, carry, recorded: false };
  if (errors.length > 0) throw new HttpsError("failed-precondition", errors.join("; "));

  await withTransaction(async (client) => {
    for (const scenario of SCENARIOS) {
      await applyLedgerRecord(client, record, { scenario: SCENARIO_TO_ENUM[scenario], createdBy: caller.memberId });
    }
  });
  await recomputeRollups(companyId as string);
  return { errors, warnings, payoutSum, carry, recorded: true };
});
