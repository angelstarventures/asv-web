import type { PoolClient } from "pg";
import {
  computeTransferFromRecord,
  isReplacement,
  TRANSFER_SETTING_KEYS,
  DEFAULT_DD_LEAD_CARRY_PERCENT,
  DEFAULT_MANAGEMENT_CARRY_PERCENT,
  type InternalTransferRecord,
  type RoundPosition,
  type TransferContext,
  type TransferResult,
} from "./transferCalc";
import { insertInternalTransferDetail, insertTransferParty, insertFeeLine } from "./ledgerWriteBuilders";
import { negativePositions, roundKey, unitPrice, type RoundBook } from "./positionCalc";
import { loadRoundBook } from "./memberPositions";
import type { ScenarioEnum } from "./enumMap";

// DB side of internal transfers: loads the inputs transferCalc needs (fund-wide fee settings, the
// company's DD lead, the source round's price and each seller's position in it), then writes the
// detail/party/fee-line rows. The math itself stays in transferCalc.ts.
//
// There are no stored holdings: positions are derived from round allocations plus the transfers
// already recorded against each round (see positionCalc.ts). Transfers are scenario-independent,
// so the BALANCED row is computed and the OPTIMISTIC/CONSERVATIVE rows copy it (see
// applyInternalTransfer).

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
    source_round_name: record.source_round_name != null ? String(record.source_round_name) : undefined,
    source_round_date: record.source_round_date != null ? String(record.source_round_date) : undefined,
    round_price_per_share: record.round_price_per_share != null ? Number(record.round_price_per_share) : undefined,
    transfer_price_per_share: record.transfer_price_per_share != null ? Number(record.transfer_price_per_share) : undefined,
    sellers: (record.sellers as Record<string, number>) ?? {},
    buyers: (record.buyers as Record<string, number>) ?? {},
    legal_costs: record.legal_costs != null ? Number(record.legal_costs) : undefined,
  };
}

export async function findCompanyIdByName(run: Run, name: string): Promise<string | null> {
  const rows = await run<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [name]);
  return rows[0]?.id ?? null;
}

export type FeeContext = Pick<TransferContext, "ddLeadMemberId" | "managementMemberId" | "ddLeadPercent" | "managementPercent">;

// Fund-wide carry settings and the company's DD lead.
export async function loadFeeContext(run: Run, companyId: string): Promise<FeeContext> {
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
  return {
    ddLeadMemberId: company[0]?.ddLeadId ?? null,
    managementMemberId: mgmt && mgmt.trim() !== "" ? mgmt.trim() : null,
    ddLeadPercent: pct(TRANSFER_SETTING_KEYS.ddLeadCarryPercent, DEFAULT_DD_LEAD_CARRY_PERCENT),
    managementPercent: pct(TRANSFER_SETTING_KEYS.managementCarryPercent, DEFAULT_MANAGEMENT_CARRY_PERCENT),
  };
}

// The full calculator context for a record: fee settings plus the source round's price and the
// sellers' positions in it. Returns an error string when the source round does not exist.
export async function loadTransferContext(
  run: Run,
  companyId: string,
  rec: InternalTransferRecord,
  book?: RoundBook
): Promise<{ ctx: TransferContext } | { error: string }> {
  if (!rec.source_round_name || !rec.source_round_date) {
    return { error: "Choose the source round: every transfer moves shares from exactly one round." };
  }
  const roundBook = book ?? (await loadRoundBook(run, companyId));
  const round = roundBook.rounds.find((r) => r.key === roundKey(rec.source_round_date as string, rec.source_round_name as string));
  if (!round) {
    return { error: `"${rec.source_round_name}" (${rec.source_round_date}) is not a round of this company with member allocations.` };
  }
  const positions: Record<string, RoundPosition> = {};
  const companyBasis: Record<string, number> = {};
  for (const id of Object.keys(rec.sellers)) {
    positions[id] = round.positions[id] ?? { shares: 0, basis: 0 };
    companyBasis[id] = roundBook.companyBasis[id] ?? 0;
  }
  return { ctx: { sourcePrice: round.price, positions, companyBasis, ...(await loadFeeContext(run, companyId)) } };
}

// An already-recorded BALANCED row of this same logical transfer (same company, date, kind, prices,
// source round and identical seller/buyer maps) — i.e. the computing row. Compared on the actual
// parties rather than the import content hash, which ignores nested keys such as member ids.
async function findBalancedSibling(
  run: Run,
  companyId: string,
  eventDate: string,
  rec: InternalTransferRecord,
  sourcePrice: number | null
): Promise<string | null> {
  const replacement = isReplacement(rec);
  const candidates = await run<{
    id: string; kind: string; roundPrice: number | null; transferPrice: number | null; sourceName: string | null; sourceDate: string | null;
  }>(
    `SELECT le.id, itd.kind::text AS kind, itd."round_price_per_share" AS "roundPrice", itd."transfer_price_per_share" AS "transferPrice",
            itd."source_round_name" AS "sourceName", itd."source_round_date"::text AS "sourceDate"
     FROM "ledger_entry" le
     JOIN "internal_transfer_detail" itd ON itd."ledger_entry_id" = le.id
     WHERE le."company_id" = $1 AND le.type = 'INTERNAL_TRANSFER' AND le.scenario = $2 AND le."event_date" = $3`,
    [companyId, LOT_OWNER_SCENARIO, eventDate]
  );
  const unit = unitPrice(sourcePrice);
  for (const c of candidates) {
    if ((c.kind === "REPLACEMENT") !== replacement) continue;
    if (c.sourceName !== rec.source_round_name || c.sourceDate !== rec.source_round_date) continue;
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
    // Record amounts are original cost (shares x the source round's price); Sale buyers are dollars paid.
    const sameSellers =
      sellers.length === Object.keys(rec.sellers).length &&
      sellers.every((p) => rec.sellers[p.memberId] !== undefined && Math.abs(rec.sellers[p.memberId] - Number(p.shares) * unit) < 0.01);
    const buyerValue = (p: { shares: number; amount: number }) => (replacement ? Number(p.shares) * unit : Number(p.amount));
    const sameBuyers =
      buyers.length === Object.keys(rec.buyers).length &&
      buyers.every((p) => rec.buyers[p.memberId] !== undefined && Math.abs(rec.buyers[p.memberId] - buyerValue(p)) < 0.01);
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
  const loaded = await loadTransferContext(run, companyId, rec);
  if ("error" in loaded) return { errors: [loaded.error] };
  const ctx = loaded.ctx;

  if (await findBalancedSibling(run, companyId, String(record.date), rec, ctx.sourcePrice)) {
    // Already recorded under the computing scenario: positions now reflect the transfer, so a fresh
    // preview would wrongly flag overselling. Treat each seller as holding exactly what they move so
    // only the non-position checks apply.
    const unit = unitPrice(ctx.sourcePrice);
    const positions: Record<string, RoundPosition> = {};
    for (const [id, units] of Object.entries(rec.sellers)) positions[id] = { shares: units / unit, basis: units };
    return computeTransferFromRecord(rec, { ...ctx, positions });
  }
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
  // Serialize transfers/edits per company so concurrent writers can't both pass the position
  // check against the same recorded transfers.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`transfer:${companyId}`]);

  const eventDate = String(record.date);
  const rec = toTransferRecord(record);
  const loaded = await loadTransferContext(run, companyId, rec);
  if ("error" in loaded) throw new Error(`Internal transfer for "${record.company}" on ${eventDate} is invalid: ${loaded.error}`);
  const ctx = loaded.ctx;

  if (scenario !== LOT_OWNER_SCENARIO) {
    const sibling = await findBalancedSibling(run, companyId, eventDate, rec, ctx.sourcePrice);
    if (sibling) {
      await copyTransferRows(client, sibling, ledgerEntryId);
      return;
    }
  }

  const result = computeTransferFromRecord(rec, ctx);
  if (!result.ok) {
    throw new Error(`Internal transfer for "${record.company}" on ${eventDate} is invalid: ${result.errors.join("; ")}`);
  }

  await insertInternalTransferDetail(client, ledgerEntryId, {
    kind: result.kind,
    referenceRoundName: record.reference_round_name as string | undefined,
    sourceRoundName: rec.source_round_name as string,
    sourceRoundDate: rec.source_round_date as string,
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
      costBasisBefore: s.costBasisBefore,
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
}

async function copyTransferRows(client: PoolClient, fromEntryId: string, toEntryId: string): Promise<void> {
  await client.query(
    `INSERT INTO "internal_transfer_detail"
       ("ledger_entry_id", kind, "reference_round_name", "source_round_name", "source_round_date", "round_price_per_share", "transfer_price_per_share", "total_shares", "gross_gain", "doc_link", notes)
     SELECT $2, kind, "reference_round_name", "source_round_name", "source_round_date", "round_price_per_share", "transfer_price_per_share", "total_shares", "gross_gain", "doc_link", notes
     FROM "internal_transfer_detail" WHERE "ledger_entry_id" = $1`,
    [fromEntryId, toEntryId]
  );
  await client.query(
    `INSERT INTO "transfer_party"
       ("ledger_entry_id", "member_id", side, shares, "cost_basis_per_share", amount, gain, "fees_charged", "realized_gain", "shares_held_before", "cost_basis_before")
     SELECT $2, "member_id", side, shares, "cost_basis_per_share", amount, gain, "fees_charged", "realized_gain", "shares_held_before", "cost_basis_before"
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

// (round, member) pairs left with negative shares — a delete/edit that would leave a transfer
// selling shares the member no longer holds on paper (e.g. deleting the transfer that gave a buyer
// the shares they later sold).
export async function findNegativeHoldings(client: PoolClient, companyId: string): Promise<string[]> {
  const book = await loadRoundBook(clientRunner(client), companyId);
  return negativePositions(book).map((n) => `${n.memberId} (${n.roundName}, ${n.roundDate})`);
}

export async function assertNoNegativeHoldings(client: PoolClient, companyId: string): Promise<void> {
  const negative = await findNegativeHoldings(client, companyId);
  if (negative.length > 0) {
    throw new Error(
      `This change would leave member(s) ${negative.join(", ")} having transferred more shares of a round than they hold, because later transfers moved shares this record created. Remove or re-record those transfers first.`
    );
  }
}
