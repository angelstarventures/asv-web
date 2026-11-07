import type { Run } from "./transferWrites";
import {
  applyTransfersToValues,
  computePosition,
  type MemberPosition,
  type PositionLot,
  type TransferForValue,
} from "./positionCalc";

// DB side of member positions (see positionCalc.ts for the rules). Rounds are recorded identically
// across scenarios, so allocation dollars are read from BALANCED rows only; transfer lots are
// scenario-independent and live on the BALANCED row too.

const ROUND_TYPES = ["PARTICIPATING_PRICED_ROUND", "PARTICIPATING_SAFE_ROUND", "NON_PARTICIPATING_ROUND"];

export interface PositionRow extends MemberPosition {
  displayName: string;
}

// Every member with an allocation or a recorded lot in the company (plus any `alsoMemberIds`).
export async function loadMemberPositions(run: Run, companyId: string, alsoMemberIds: string[] = []): Promise<PositionRow[]> {
  const invested = await run<{ memberId: string; total: number }>(
    `SELECT a."member_id" AS "memberId", SUM(a.amount) AS total
     FROM "allocation" a JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     WHERE le."company_id" = $1 AND le.scenario = 'BALANCED' AND le.type = ANY($2)
     GROUP BY a."member_id"`,
    [companyId, ROUND_TYPES]
  );
  const lots = await run<{ memberId: string; kind: PositionLot["kind"]; shares: number; costBasis: number }>(
    `SELECT "member_id" AS "memberId", kind::text AS kind, shares, "cost_basis" AS "costBasis" FROM "share_lot" WHERE "company_id" = $1`,
    [companyId]
  );

  const investedBy = new Map(invested.map((r) => [r.memberId, Number(r.total)]));
  const lotsBy = new Map<string, PositionLot[]>();
  for (const l of lots) {
    const list = lotsBy.get(l.memberId) ?? [];
    list.push({ kind: l.kind, shares: Number(l.shares), costBasis: Number(l.costBasis) });
    lotsBy.set(l.memberId, list);
  }
  const ids = [...new Set([...investedBy.keys(), ...lotsBy.keys(), ...alsoMemberIds])];
  if (ids.length === 0) return [];

  const names = await run<{ id: string; displayName: string }>(
    `SELECT id, "display_name" AS "displayName" FROM "member" WHERE id = ANY($1)`,
    [ids]
  );
  const nameBy = new Map(names.map((n) => [n.id, n.displayName]));
  return ids
    .map((id) => ({ ...computePosition(id, investedBy.get(id) ?? 0, lotsBy.get(id) ?? []), displayName: nameBy.get(id) ?? id }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// Transfers of this company dated after `afterDate`, in order, for moving recorded member value.
export async function loadTransfersAfter(run: Run, companyId: string, scenario: string, afterDate: string): Promise<TransferForValue[]> {
  const entries = await run<{ id: string; date: string }>(
    `SELECT id, "event_date"::text AS date FROM "ledger_entry"
     WHERE "company_id" = $1 AND scenario = $2 AND type = 'INTERNAL_TRANSFER' AND "event_date" > $3
     ORDER BY "event_date", "created_at"`,
    [companyId, scenario, afterDate]
  );
  const out: TransferForValue[] = [];
  for (const e of entries) {
    const parties = await run<{ memberId: string; side: string; shares: number; heldBefore: number | null }>(
      `SELECT "member_id" AS "memberId", side::text AS side, shares, "shares_held_before" AS "heldBefore"
       FROM "transfer_party" WHERE "ledger_entry_id" = $1`,
      [e.id]
    );
    out.push({
      date: e.date,
      sellers: parties
        .filter((p) => p.side === "SELLER")
        .map((p) => ({ memberId: p.memberId, shares: Number(p.shares), sharesHeldBefore: p.heldBefore === null ? null : Number(p.heldBefore) })),
      buyers: parties.filter((p) => p.side === "BUYER").map((p) => ({ memberId: p.memberId, shares: Number(p.shares) })),
    });
  }
  return out;
}

// The latest recorded member valuation for the company in a scenario, adjusted for transfers that
// happened after it. Returns null when the company has no member valuations yet.
export async function memberValuesAfterTransfers(
  run: Run,
  companyId: string,
  scenario: string
): Promise<{ asOfDate: string; values: Record<string, number>; warnings: string[] } | null> {
  const latest = await run<{ id: string; date: string }>(
    `SELECT le.id, le."event_date"::text AS date
     FROM "ledger_entry" le
     WHERE le."company_id" = $1 AND le.scenario = $2
       AND EXISTS (SELECT 1 FROM "member_valuation" mv WHERE mv."ledger_entry_id" = le.id)
       AND le.type IN ('TRANSACTION_VALUATION_CHANGE', 'INTERNAL_VALUATION_ASSESSMENT')
     ORDER BY le."event_date" DESC, le."created_at" DESC LIMIT 1`,
    [companyId, scenario]
  );
  if (!latest[0]) return null;
  const rows = await run<{ memberId: string; value: number }>(
    `SELECT "member_id" AS "memberId", value FROM "member_valuation" WHERE "ledger_entry_id" = $1`,
    [latest[0].id]
  );
  const base = Object.fromEntries(rows.map((r) => [r.memberId, Number(r.value)]));
  const transfers = await loadTransfersAfter(run, companyId, scenario, latest[0].date);
  const moved = applyTransfersToValues(base, transfers);
  return { asOfDate: latest[0].date, values: moved.values, warnings: moved.warnings };
}
