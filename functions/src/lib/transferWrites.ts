import type { PoolClient } from "pg";
import {
  computeTransferFromRecord,
  isReplacement,
  TRANSFER_SETTING_KEYS,
  DEFAULT_DD_LEAD_CARRY_PERCENT,
  DEFAULT_MANAGEMENT_CARRY_PERCENT,
  type DeclaredHolding,
  type Holding,
  type InternalTransferRecord,
  type TransferContext,
  type TransferResult,
} from "./transferCalc";
import {
  insertInternalTransferDetail,
  insertTransferParty,
  insertFeeLine,
  insertShareLot,
} from "./ledgerWriteBuilders";
import type { ScenarioEnum } from "./enumMap";

// DB side of internal transfers: loads the inputs transferCalc needs (fund-wide fee settings,
// the company's DD lead, each seller's recorded share lots and invested dollars), then writes the
// detail/party/fee-line rows and the share lots. The math itself stays in transferCalc.ts.
//
// Share lots exist ONLY because of transfers — there is no round-time backfill. A seller's first
// transfer declares their whole holding (`holdings_before`); the difference from the recorded lots
// is written as an OPENING lot, then the transfer's own TRANSFER_OUT / TRANSFER_IN lots follow.
//
// Lots are scenario-independent (who owns what, not a valuation view), so they are written once —
// by the BALANCED row. The OPTIMISTIC/CONSERVATIVE rows of a transfer copy the BALANCED row's
// computed parties/fee lines instead of recomputing, because by then the lots already reflect
// the transfer (see applyInternalTransfer).

export type Run = <T>(text: string, params?: unknown[]) => Promise<T[]>;

export function clientRunner(client: PoolClient): Run {
  return async <T>(text: string, params: unknown[] = []) => (await client.query(text, params)).rows as T[];
}

export const LOT_OWNER_SCENARIO: ScenarioEnum = "BALANCED";
const EPS = 1e-6;

export function toTransferRecord(record: Record<string, unknown>): InternalTransferRecord {
  const kind = String(record.transfer_kind ?? "Sale");
  return {
    transfer_kind: kind.toLowerCase() === "replacement" ? "Replacement" : "Sale",
    round_price_per_share: record.round_price_per_share != null ? Number(record.round_price_per_share) : undefined,
    transfer_price_per_share: record.transfer_price_per_share != null ? Number(record.transfer_price_per_share) : undefined,
    sellers: (record.sellers as Record<string, number>) ?? {},
    buyers: (record.buyers as Record<string, number>) ?? {},
    holdings_before: (record.holdings_before as Record<string, DeclaredHolding> | undefined) ?? undefined,
    legal_costs: record.legal_costs != null ? Number(record.legal_costs) : undefined,
  };
}

export async function findCompanyIdByName(run: Run, name: string): Promise<string | null> {
  const rows = await run<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [name]);
  return rows[0]?.id ?? null;
}

export async function loadTransferContext(run: Run, companyId: string, sellerIds: string[]): Promise<TransferContext> {
  const settings = await run<{ key: string; value: string }>(`SELECT key, value FROM "app_setting" WHERE key = ANY($1)`, [
    Object.values(TRANSFER_SETTING_KEYS),
  ]);
  const byKey = new Map(settings.map((s) => [s.key, s.value]));
  const pct = (key: string, fallback: number): number => {
    const v = byKey.get(key);
    return v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;
  };
  const mgmt = byKey.get(TRANSFER_SETTING_KEYS.managementCarryMemberId);

  const company = await run<{ ddLeadId: string | null }>(`SELECT "dd_lead_id" AS "ddLeadId" FROM "company" WHERE id = $1`, [companyId]);

  const lots = sellerIds.length
    ? await run<{ memberId: string; shares: number; costBasis: number }>(
        `SELECT "member_id" AS "memberId", SUM(shares) AS shares, SUM("cost_basis") AS "costBasis"
         FROM "share_lot"
         WHERE "company_id" = $1 AND "member_id" = ANY($2)
         GROUP BY "member_id"`,
        [companyId, sellerIds]
      )
    : [];
  const holdings: Record<string, Holding> = {};
  for (const l of lots) holdings[l.memberId] = { shares: Number(l.shares), costBasis: Number(l.costBasis) };

  // Dollars each seller has invested in this company (rounds are identical across scenarios, so
  // BALANCED alone is read) — the default cost basis for a declared holding.
  const invested = sellerIds.length
    ? await run<{ memberId: string; total: number }>(
        `SELECT a."member_id" AS "memberId", SUM(a.amount) AS total
         FROM "allocation" a JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
         WHERE le."company_id" = $1 AND le.scenario = $2 AND a."member_id" = ANY($3)
         GROUP BY a."member_id"`,
        [companyId, LOT_OWNER_SCENARIO, sellerIds]
      )
    : [];

  return {
    holdings,
    invested: Object.fromEntries(invested.map((r) => [r.memberId, Number(r.total)])),
    ddLeadMemberId: company[0]?.ddLeadId ?? null,
    managementMemberId: mgmt && mgmt.trim() !== "" ? mgmt.trim() : null,
    ddLeadPercent: pct(TRANSFER_SETTING_KEYS.ddLeadCarryPercent, DEFAULT_DD_LEAD_CARRY_PERCENT),
    managementPercent: pct(TRANSFER_SETTING_KEYS.managementCarryPercent, DEFAULT_MANAGEMENT_CARRY_PERCENT),
  };
}

// An already-recorded BALANCED row of this same logical transfer (same company, date, kind, prices
// and identical seller/buyer maps) — i.e. the lot-owning row. Compared on the actual parties
// rather than the import content hash, which ignores nested keys such as member ids.
async function findBalancedSibling(run: Run, companyId: string, eventDate: string, rec: InternalTransferRecord): Promise<string | null> {
  const replacement = isReplacement(rec);
  const candidates = await run<{ id: string; kind: string; roundPrice: number | null; transferPrice: number | null }>(
    `SELECT le.id, itd.kind::text AS kind, itd."round_price_per_share" AS "roundPrice", itd."transfer_price_per_share" AS "transferPrice"
     FROM "ledger_entry" le
     JOIN "internal_transfer_detail" itd ON itd."ledger_entry_id" = le.id
     WHERE le."company_id" = $1 AND le.type = 'INTERNAL_TRANSFER' AND le.scenario = $2 AND le."event_date" = $3`,
    [companyId, LOT_OWNER_SCENARIO, eventDate]
  );
  for (const c of candidates) {
    if ((c.kind === "REPLACEMENT") !== replacement) continue;
    if (!replacement) {
      if (
        Math.abs(Number(c.roundPrice) - Number(rec.round_price_per_share)) > EPS ||
        Math.abs(Number(c.transferPrice) - Number(rec.transfer_price_per_share)) > EPS
      ) {
        continue;
      }
    }
    const parties = await run<{ memberId: string; side: string; shares: number; amount: number }>(
      `SELECT "member_id" AS "memberId", side::text AS side, shares, amount FROM "transfer_party" WHERE "ledger_entry_id" = $1`,
      [c.id]
    );
    const sellers = parties.filter((p) => p.side === "SELLER");
    const buyers = parties.filter((p) => p.side === "BUYER");
    const sameSellers =
      sellers.length === Object.keys(rec.sellers).length &&
      sellers.every((p) => rec.sellers[p.memberId] !== undefined && Math.abs(rec.sellers[p.memberId] - Number(p.shares)) < 1e-4);
    // Sale buyers are keyed by dollars paid; replacement buyers by shares received.
    const buyerValue = (p: { shares: number; amount: number }) => (replacement ? Number(p.shares) : Number(p.amount));
    const tolerance = replacement ? 1e-4 : 0.01;
    const sameBuyers =
      buyers.length === Object.keys(rec.buyers).length &&
      buyers.every((p) => rec.buyers[p.memberId] !== undefined && Math.abs(rec.buyers[p.memberId] - buyerValue(p)) < tolerance);
    if (sameSellers && sameBuyers) return c.id;
  }
  return null;
}

// Read-only dry run for the diff/consistency step and the admin form's live reconciliation.
export async function previewInternalTransfer(
  run: Run,
  record: Record<string, unknown>
): Promise<TransferResult | { errors: string[] }> {
  const rec = toTransferRecord(record);
  const companyId = await findCompanyIdByName(run, String(record.company ?? ""));
  if (!companyId) return { errors: [`"${record.company}" is not a known company.`] };
  if (await findBalancedSibling(run, companyId, String(record.date), rec)) {
    // Already recorded under the lot-owning scenario: holdings now reflect the transfer, so a fresh
    // preview would wrongly flag overselling. Nothing left to validate for this sibling row.
    // Treat each seller as holding exactly what they move so only the non-holding checks apply.
    const holdings: Record<string, Holding> = {};
    for (const [id, shares] of Object.entries(rec.sellers)) holdings[id] = { shares, costBasis: 0 };
    return computeTransferFromRecord(
      { ...rec, holdings_before: undefined },
      { ...(await loadTransferContext(run, companyId, [])), holdings }
    );
  }
  const ctx = await loadTransferContext(run, companyId, Object.keys(rec.sellers));
  return computeTransferFromRecord(rec, ctx);
}

export async function applyInternalTransfer(
  client: PoolClient,
  args: {
    ledgerEntryId: string;
    companyId: string;
    scenario: ScenarioEnum;
    record: Record<string, unknown>;
  }
): Promise<void> {
  const { ledgerEntryId, companyId, scenario, record } = args;
  const run = clientRunner(client);
  // Serialize transfers/edits per company so concurrent writers can't both pass the held-shares
  // check against the same lots.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`share_lot:${companyId}`]);

  const eventDate = String(record.date);
  const rec = toTransferRecord(record);
  if (scenario !== LOT_OWNER_SCENARIO) {
    const sibling = await findBalancedSibling(run, companyId, eventDate, rec);
    if (sibling) {
      await copyTransferRows(client, sibling, ledgerEntryId);
      return;
    }
  }

  const ctx = await loadTransferContext(run, companyId, Object.keys(rec.sellers));
  const result = computeTransferFromRecord(rec, ctx);
  if (!result.ok) {
    throw new Error(`Internal transfer for "${record.company}" on ${eventDate} is invalid: ${result.errors.join("; ")}`);
  }

  await insertInternalTransferDetail(client, ledgerEntryId, {
    kind: result.kind,
    referenceRoundName: record.reference_round_name as string | undefined,
    roundPricePerShare: result.kind === "SALE" ? rec.round_price_per_share : undefined,
    transferPricePerShare: result.kind === "SALE" ? rec.transfer_price_per_share : undefined,
    totalShares: result.totalShares,
    grossGain: result.grossGain,
    docLink: record.doc_link as string | undefined,
    notes: record.notes as string | undefined,
  });
  for (const s of result.sellers) {
    await insertTransferParty(client, ledgerEntryId, {
      memberId: s.memberId,
      side: "SELLER",
      shares: s.shares,
      costBasisPerShare: s.costBasisPerShare,
      amount: s.amount,
      gain: s.gain,
      feesCharged: s.feesCharged,
      realizedGain: s.realizedGain,
      sharesHeldBefore: s.sharesHeldBefore,
    });
  }
  for (const b of result.buyers) {
    await insertTransferParty(client, ledgerEntryId, {
      memberId: b.memberId,
      side: "BUYER",
      shares: b.shares,
      costBasisPerShare: b.costBasisPerShare,
      amount: b.amount,
    });
  }
  for (const f of result.feeLines) {
    await insertFeeLine(client, ledgerEntryId, {
      kind: f.kind,
      recipientMemberId: f.recipientMemberId,
      chargedToMemberId: f.chargedToMemberId,
      percent: f.percent,
      amount: f.amount,
    });
  }

  if (scenario === LOT_OWNER_SCENARIO) {
    for (const o of result.openingAdjustments) {
      await insertShareLot(client, {
        companyId,
        memberId: o.memberId,
        sourceEntryId: ledgerEntryId,
        acquiredDate: eventDate,
        kind: "OPENING",
        shares: roundBasis(o.shares),
        costBasis: roundBasis(o.costBasis),
      });
    }
    for (const s of result.sellers) {
      await insertShareLot(client, {
        companyId,
        memberId: s.memberId,
        sourceEntryId: ledgerEntryId,
        acquiredDate: eventDate,
        kind: "TRANSFER_OUT",
        shares: -s.shares,
        costBasis: -roundBasis(s.shares * s.costBasisPerShare),
      });
    }
    for (const b of result.buyers) {
      await insertShareLot(client, {
        companyId,
        memberId: b.memberId,
        sourceEntryId: ledgerEntryId,
        acquiredDate: eventDate,
        kind: "TRANSFER_IN",
        shares: b.shares,
        // Sale: what the buyer paid. Replacement: the basis inherited from the sellers.
        costBasis: result.kind === "SALE" ? b.amount : roundBasis(b.shares * b.costBasisPerShare),
      });
    }
  }
}

function roundBasis(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

async function copyTransferRows(client: PoolClient, fromEntryId: string, toEntryId: string): Promise<void> {
  await client.query(
    `INSERT INTO "internal_transfer_detail"
       ("ledger_entry_id", kind, "reference_round_name", "round_price_per_share", "transfer_price_per_share", "total_shares", "gross_gain", "doc_link", notes)
     SELECT $2, kind, "reference_round_name", "round_price_per_share", "transfer_price_per_share", "total_shares", "gross_gain", "doc_link", notes
     FROM "internal_transfer_detail" WHERE "ledger_entry_id" = $1`,
    [fromEntryId, toEntryId]
  );
  await client.query(
    `INSERT INTO "transfer_party"
       ("ledger_entry_id", "member_id", side, shares, "cost_basis_per_share", amount, gain, "fees_charged", "realized_gain", "shares_held_before")
     SELECT $2, "member_id", side, shares, "cost_basis_per_share", amount, gain, "fees_charged", "realized_gain", "shares_held_before"
     FROM "transfer_party" WHERE "ledger_entry_id" = $1`,
    [fromEntryId, toEntryId]
  );
  await client.query(
    `INSERT INTO "fee_line" ("ledger_entry_id", kind, "recipient_id", "charged_to_member_id", percent, amount, note)
     SELECT $2, kind, "recipient_id", "charged_to_member_id", percent, amount, note
     FROM "fee_line" WHERE "ledger_entry_id" = $1`,
    [fromEntryId, toEntryId]
  );
}

// Members whose net shares in the company are below zero — i.e. a delete/edit that would leave
// someone having moved shares they no longer hold on paper (e.g. deleting the transfer whose
// OPENING lot a later transfer relied on).
export async function findNegativeHoldings(client: PoolClient, companyId: string): Promise<string[]> {
  const rows = await client.query<{ memberId: string; shares: number }>(
    `SELECT "member_id" AS "memberId", SUM(shares) AS shares
     FROM "share_lot" WHERE "company_id" = $1
     GROUP BY "member_id" HAVING SUM(shares) < $2`,
    [companyId, -EPS]
  );
  return rows.rows.map((r) => r.memberId);
}

export async function assertNoNegativeHoldings(client: PoolClient, companyId: string): Promise<void> {
  const negative = await findNegativeHoldings(client, companyId);
  if (negative.length > 0) {
    throw new Error(
      `This change would leave member(s) ${negative.join(", ")} with negative share holdings, because later transfers moved shares this record created. Remove or re-record those transfers first.`
    );
  }
}
