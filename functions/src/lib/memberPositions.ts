import type { Run } from "./transferWrites";
import {
  applyTransfersToValues,
  buildRoundBook,
  roundKey,
  type RoundAllocationInput,
  type RoundBook,
  type RoundInfo,
  type TransferForValue,
  type TransferMove,
} from "./positionCalc";

// DB side of member positions (see positionCalc.ts for the rules). Rounds are recorded identically
// across scenarios, so round allocations and transfer parties are read from BALANCED rows only.

const ROUND_TYPES = ["PARTICIPATING_PRICED_ROUND", "PARTICIPATING_SAFE_ROUND", "NON_PARTICIPATING_ROUND"];

// Every round of the company that has allocations, with each member's position after all recorded
// transfers, plus company-level cost basis per member.
export async function loadRoundBook(run: Run, companyId: string): Promise<RoundBook> {
  const rows = await run<{ entryId: string; date: string; roundName: string | null; price: number | null; type: string }>(
    `SELECT le.id AS "entryId", le."event_date"::text AS date, le.type::text AS type,
            COALESCE(p."round_name", s."round_name", n."round_name") AS "roundName",
            COALESCE(p."price_per_share", n."new_price_per_share") AS price
     FROM "ledger_entry" le
     LEFT JOIN "priced_round_detail" p ON p."ledger_entry_id" = le.id
     LEFT JOIN "safe_round_detail" s ON s."ledger_entry_id" = le.id
     LEFT JOIN "non_participating_round_detail" n ON n."ledger_entry_id" = le.id
     WHERE le."company_id" = $1 AND le.scenario = 'BALANCED' AND le.type = ANY($2)
     ORDER BY le."event_date", le."created_at"`,
    [companyId, ROUND_TYPES]
  );
  const keyByEntry = new Map<string, string>();
  const rounds = new Map<string, RoundInfo>();
  for (const r of rows) {
    const name = r.roundName ?? r.type;
    const key = roundKey(r.date, name);
    keyByEntry.set(r.entryId, key);
    if (!rounds.has(key)) rounds.set(key, { key, name, date: r.date, price: r.price == null ? null : Number(r.price) });
  }

  const allocRows = rows.length
    ? await run<{ entryId: string; memberId: string; amount: number }>(
        `SELECT a."ledger_entry_id" AS "entryId", a."member_id" AS "memberId", a.amount AS amount
         FROM "allocation" a WHERE a."ledger_entry_id" = ANY($1) AND a.amount > 0`,
        [rows.map((r) => r.entryId)]
      )
    : [];
  const allocations: RoundAllocationInput[] = allocRows.map((a) => ({
    roundKey: keyByEntry.get(a.entryId) as string,
    memberId: a.memberId,
    amount: Number(a.amount),
  }));

  const moveRows = await run<{
    memberId: string; side: "SELLER" | "BUYER"; shares: number; cbps: number; sourceName: string | null; sourceDate: string | null;
  }>(
    `SELECT tp."member_id" AS "memberId", tp.side::text AS side, tp.shares AS shares, tp."cost_basis_per_share" AS cbps,
            itd."source_round_name" AS "sourceName", itd."source_round_date"::text AS "sourceDate"
     FROM "transfer_party" tp
     JOIN "ledger_entry" le ON le.id = tp."ledger_entry_id"
     JOIN "internal_transfer_detail" itd ON itd."ledger_entry_id" = le.id
     WHERE le."company_id" = $1 AND le.scenario = 'BALANCED' AND le.type = 'INTERNAL_TRANSFER'`,
    [companyId]
  );
  const moves: TransferMove[] = moveRows.map((m) => ({
    roundKey: m.sourceName && m.sourceDate ? roundKey(m.sourceDate, m.sourceName) : null,
    memberId: m.memberId,
    side: m.side,
    shares: Number(m.shares),
    costBasisPerShare: Number(m.cbps),
  }));

  return buildRoundBook([...rounds.values()], allocations, moves);
}

export interface PositionRow {
  memberId: string;
  displayName: string;
  invested: number; // allocation dollars in the company
  basis: number; // current cost basis in the company
}

// Every member with an allocation or a transfer in the company (plus any `alsoMemberIds`).
export async function loadMemberPositions(run: Run, companyId: string, alsoMemberIds: string[] = []): Promise<PositionRow[]> {
  const book = await loadRoundBook(run, companyId);
  const ids = [...new Set([...Object.keys(book.companyBasis), ...Object.keys(book.invested), ...alsoMemberIds])];
  if (ids.length === 0) return [];
  const names = await run<{ id: string; displayName: string }>(`SELECT id, "display_name" AS "displayName" FROM "member" WHERE id = ANY($1)`, [ids]);
  const nameBy = new Map(names.map((n) => [n.id, n.displayName]));
  return ids
    .map((id) => ({
      memberId: id,
      displayName: nameBy.get(id) ?? id,
      invested: book.invested[id] ?? 0,
      basis: book.companyBasis[id] ?? 0,
    }))
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
    const parties = await run<{ memberId: string; side: string; shares: number; cbps: number; costBasisBefore: number | null }>(
      `SELECT "member_id" AS "memberId", side::text AS side, shares, "cost_basis_per_share" AS cbps, "cost_basis_before" AS "costBasisBefore"
       FROM "transfer_party" WHERE "ledger_entry_id" = $1`,
      [e.id]
    );
    out.push({
      date: e.date,
      sellers: parties
        .filter((p) => p.side === "SELLER")
        .map((p) => ({
          memberId: p.memberId,
          costBasisMoved: Number(p.shares) * Number(p.cbps),
          costBasisBefore: p.costBasisBefore === null ? null : Number(p.costBasisBefore),
        })),
      buyers: parties.filter((p) => p.side === "BUYER").map((p) => ({ memberId: p.memberId, cost: Number(p.shares) * Number(p.cbps) })),
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
