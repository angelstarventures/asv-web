import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { insertMemberValuations } from "../lib/ledgerWriteBuilders";

// One-click fix for the Audit Ledger's "member_valuation_sum" findings — these are always a
// pure arithmetic bug (the per-member split should be exactly reproducible from the ledger
// entry's own already-recorded authoritative total and the company's allocation history, per
// the same proportional-split formula documents-analyze.ts already uses when drafting), never a
// question of what the *right* number is (unlike price-continuity/fmv-plausibility findings,
// which need a human judgment call and go through the ordinary Manage Ledger edit flow
// instead). Recomputes and replaces just the member_valuation rows for one ledger entry —
// deliberately NOT a full ledgerUpdateRecord delete-and-reapply, since nothing else about the
// entry (its date, notes, rationale, etc.) is in question here.

export interface LedgerRebalanceMemberValuationsInput {
  ledgerEntryId: string;
}

export interface LedgerRebalanceMemberValuationsOutput {
  ok: true;
  newTotal: number;
}

export const ledgerRebalanceMemberValuations = onCall<
  LedgerRebalanceMemberValuationsInput,
  Promise<LedgerRebalanceMemberValuationsOutput>
>(async (request) => {
  await requireAdmin(request);
  const { ledgerEntryId } = request.data;
  if (!ledgerEntryId) {
    throw new HttpsError("invalid-argument", "ledgerEntryId is required.");
  }

  const entries = await query<{ companyId: string; type: string }>(
    `SELECT "company_id" AS "companyId", type::text AS type FROM "ledger_entry" WHERE id = $1`,
    [ledgerEntryId]
  );
  const entry = entries[0];
  if (!entry) {
    throw new HttpsError("not-found", `No ledger entry for id "${ledgerEntryId}".`);
  }

  let authoritativeTotal: number | null = null;
  if (entry.type === "TRANSACTION_VALUATION_CHANGE" || entry.type === "INTERNAL_VALUATION_ASSESSMENT") {
    const rows = await query<{ total: number }>(
      `SELECT "asv_total_fair_market_value" AS total FROM "valuation_assessment_detail" WHERE "ledger_entry_id" = $1`,
      [ledgerEntryId]
    );
    authoritativeTotal = rows[0]?.total ?? null;
  } else if (entry.type === "EXIT_EVENT") {
    const rows = await query<{ total: number }>(
      `SELECT "asv_total_payout" AS total FROM "exit_event_detail" WHERE "ledger_entry_id" = $1`,
      [ledgerEntryId]
    );
    authoritativeTotal = rows[0]?.total ?? null;
  } else {
    throw new HttpsError("failed-precondition", `Ledger entry type "${entry.type}" has no member_valuation split to rebalance.`);
  }
  if (authoritativeTotal == null) {
    throw new HttpsError("failed-precondition", "No authoritative total found for this ledger entry.");
  }

  // Same "balanced scenario only" reasoning as documents-analyze.ts's own memberAllocationTotals
  // — investment-round records never diverge by scenario, so summing all three would triple-count.
  const allocations = await query<{ memberId: string; total: number }>(
    `SELECT a."member_id" AS "memberId", SUM(a.amount) AS total
     FROM "allocation" a
     JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     WHERE le."company_id" = $1 AND le.scenario = 'BALANCED'
     GROUP BY a."member_id"`,
    [entry.companyId]
  );
  const totalAllocated = allocations.reduce((sum, a) => sum + a.total, 0);
  if (totalAllocated <= 0) {
    throw new HttpsError("failed-precondition", "No allocations found for this company — nothing to split proportionally.");
  }

  const newValuations: Record<string, number> = {};
  for (const a of allocations) {
    newValuations[a.memberId] = Math.round((a.total / totalAllocated) * authoritativeTotal * 100) / 100;
  }

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM "member_valuation" WHERE "ledger_entry_id" = $1`, [ledgerEntryId]);
    await insertMemberValuations(client, ledgerEntryId, newValuations);
  });

  const newTotal = Object.values(newValuations).reduce((sum, v) => sum + v, 0);
  return { ok: true, newTotal };
});
