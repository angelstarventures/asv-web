import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { validateLedgerRecord } from "../lib/schema-validate";
import { applyLedgerRecord } from "../lib/applyLedgerRecord";
import { recomputeRollups } from "../lib/rollups";
import { previewInternalTransfer, type Run } from "../lib/transferWrites";
import type { TransferResult } from "../lib/transferCalc";
import { SCENARIO_TO_ENUM, type LegacyScenario } from "../lib/enumMap";

// Records one internal (member-to-member) transfer as three identical scenario rows, like a
// round. `preview: true` runs the same calculator without writing — the admin form's live
// reconciliation panel. The stored record always carries an explicit legal_costs (the derived
// plug is resolved here), so exporting and re-importing it round-trips to the same record.

export interface RecordInternalTransferInput {
  company: string;
  date: string; // YYYY-MM-DD
  transferKind?: "Sale" | "Replacement"; // default Sale
  referenceRoundName?: string;
  roundPricePerShare?: number; // Sale only
  transferPricePerShare?: number; // Sale only
  sellers: Record<string, number>; // memberId -> shares moved out
  buyers: Record<string, number>; // memberId -> dollars paid (Sale) or shares received (Replacement)
  // Each seller's whole holding BEFORE this transfer. Needed the first time a member sells in a
  // company (there is no round-time backfill); cost_basis defaults to their invested dollars.
  holdingsBefore?: Record<string, { shares: number; cost_basis?: number }>;
  // Per seller: total cost basis (dollars) of the specific shares being sold; omit for the average cost.
  soldCostBasis?: Record<string, number>;
  legalCosts?: number; // Sale only; omit to derive as spread - carry
  docLink?: string;
  notes?: string;
  preview?: boolean;
}

export interface RecordInternalTransferOutput {
  preview: TransferResult | { errors: string[] };
  recorded: boolean;
}

const dbRun: Run = (text, params) => query(text, params);
const SCENARIOS: LegacyScenario[] = ["balanced", "optimistic", "conservative"]; // lot-owning row first

export const ledgerRecordInternalTransfer = onCall<RecordInternalTransferInput, Promise<RecordInternalTransferOutput>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const d = request.data;
    if (!d || typeof d.company !== "string" || !d.company.trim()) {
      throw new HttpsError("invalid-argument", "company is required.");
    }

    const base: Record<string, unknown> = {
      type: "Internal_Transfer",
      company: d.company.trim(),
      date: d.date,
      transfer_kind: d.transferKind ?? "Sale",
      ...(d.roundPricePerShare !== undefined ? { round_price_per_share: d.roundPricePerShare } : {}),
      ...(d.transferPricePerShare !== undefined ? { transfer_price_per_share: d.transferPricePerShare } : {}),
      sellers: d.sellers,
      buyers: d.buyers,
      ...(d.holdingsBefore && Object.keys(d.holdingsBefore).length ? { holdings_before: d.holdingsBefore } : {}),
      ...(d.soldCostBasis && Object.keys(d.soldCostBasis).length ? { sold_cost_basis: d.soldCostBasis } : {}),
      ...(d.referenceRoundName ? { reference_round_name: d.referenceRoundName } : {}),
      ...(d.legalCosts !== undefined ? { legal_costs: d.legalCosts } : {}),
      ...(d.docLink ? { doc_link: d.docLink } : {}),
      ...(d.notes ? { notes: d.notes } : {}),
    };

    const validation = validateLedgerRecord(base);
    if (!validation.valid) {
      throw new HttpsError("invalid-argument", validation.errors.join("; "));
    }

    const preview = await previewInternalTransfer(dbRun, base);
    if (d.preview) return { preview, recorded: false };
    if (preview.errors.length > 0) {
      throw new HttpsError("failed-precondition", preview.errors.join("; "));
    }
    // errors is empty, so this is a full TransferResult; for a sale, pin the derived legal total into the record.
    const result = preview as TransferResult;
    const record = result.kind === "SALE" ? { ...base, legal_costs: result.legalCosts } : base;

    await withTransaction(async (client) => {
      for (const scenario of SCENARIOS) {
        await applyLedgerRecord(client, record, { scenario: SCENARIO_TO_ENUM[scenario], createdBy: caller.memberId });
      }
    });

    const companies = await query<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [String(base.company)]);
    for (const c of companies) await recomputeRollups(c.id);

    return { preview, recorded: true };
  }
);
