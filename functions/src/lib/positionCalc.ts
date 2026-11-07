// Pure position math for internal transfers. Import-free (like transferCalc.ts) so
// scripts/member-position.test.cjs can load this .ts directly.
//
// There are no declared holdings and no member share counts. A member's position is tracked PER
// ROUND, from the round's own allocations plus the transfers of that round:
//   shares = allocation dollars / the round's price per share (a round with no price, e.g. a SAFE,
//            uses 1, so "shares" are then just dollars), basis = the dollars allocated;
//   a transfer takes shares and basis out of each seller and puts shares and the buyer's cost
//   (what they paid, or the basis they inherited) into each buyer.
// A member's company-level cost basis is their total allocations plus basis received minus basis
// moved out, across every round.

export interface RoundInfo {
  key: string; // `${date}|${name}`
  name: string;
  date: string; // YYYY-MM-DD
  price: number | null; // price per share; null when the round has none
}

export interface RoundAllocationInput {
  roundKey: string;
  memberId: string;
  amount: number;
}

export interface TransferMove {
  roundKey: string | null; // the transfer's source round
  memberId: string;
  side: "SELLER" | "BUYER";
  shares: number;
  costBasisPerShare: number;
}

export interface Position {
  shares: number;
  basis: number;
}

export interface RoundBookEntry extends RoundInfo {
  positions: Record<string, Position>; // memberId -> position after all recorded transfers
}

export interface RoundBook {
  rounds: RoundBookEntry[];
  companyBasis: Record<string, number>; // memberId -> total cost basis in the company
  invested: Record<string, number>; // memberId -> total allocation dollars
}

const EPS = 1e-6;

export const roundKey = (date: string, name: string): string => `${date}|${name}`;

export function unitPrice(price: number | null): number {
  return price !== null && price > 0 ? price : 1;
}

export function buildRoundBook(rounds: RoundInfo[], allocations: RoundAllocationInput[], moves: TransferMove[]): RoundBook {
  const entries = new Map<string, RoundBookEntry>(rounds.map((r) => [r.key, { ...r, positions: {} }]));
  const invested: Record<string, number> = {};
  const companyBasis: Record<string, number> = {};
  const bump = (m: Record<string, number>, id: string, d: number) => {
    m[id] = (m[id] ?? 0) + d;
  };

  for (const a of allocations) {
    const e = entries.get(a.roundKey);
    if (!e) continue;
    const pos = (e.positions[a.memberId] ??= { shares: 0, basis: 0 });
    pos.shares += a.amount / unitPrice(e.price);
    pos.basis += a.amount;
    bump(invested, a.memberId, a.amount);
    bump(companyBasis, a.memberId, a.amount);
  }
  for (const m of moves) {
    const basis = m.shares * m.costBasisPerShare;
    const sign = m.side === "BUYER" ? 1 : -1;
    bump(companyBasis, m.memberId, sign * basis);
    const e = m.roundKey ? entries.get(m.roundKey) : undefined;
    if (!e) continue;
    const pos = (e.positions[m.memberId] ??= { shares: 0, basis: 0 });
    pos.shares += sign * m.shares;
    pos.basis += sign * basis;
  }

  for (const e of entries.values()) {
    for (const [id, p] of Object.entries(e.positions)) {
      if (Math.abs(p.shares) < EPS) p.shares = 0;
      if (Math.abs(p.basis) < 0.005) p.basis = 0;
      if (p.shares === 0 && p.basis === 0) delete e.positions[id];
    }
  }
  for (const id of Object.keys(companyBasis)) if (Math.abs(companyBasis[id]) < 0.005) companyBasis[id] = 0;
  return { rounds: [...entries.values()], companyBasis, invested };
}

// (round, member) pairs whose shares went negative: a transfer sold more than the member held of
// that round (e.g. after deleting the transfer that gave them those shares).
export function negativePositions(book: RoundBook): { roundName: string; roundDate: string; memberId: string }[] {
  const out: { roundName: string; roundDate: string; memberId: string }[] = [];
  for (const r of book.rounds) {
    for (const [memberId, p] of Object.entries(r.positions)) {
      if (p.shares < -EPS) out.push({ roundName: r.name, roundDate: r.date, memberId });
    }
  }
  return out;
}

// --- Moving recorded member value across transfers ------------------------------------------
// Member valuations are recorded per FMV assessment as a member -> value dictionary. A transfer
// that happens AFTER the latest assessment has not yet been reflected in it, so until the next
// assessment arrives:
//   - each seller's recorded value falls by the share of their cost basis that moved
//     (basis moved / their company basis before the transfer);
//   - each buyer's value rises by what the shares cost them (paid, or the basis inherited).

export interface TransferForValue {
  date: string;
  sellers: { memberId: string; costBasisMoved: number; costBasisBefore: number | null }[];
  buyers: { memberId: string; cost: number }[];
}

export interface ValueMoveResult {
  values: Record<string, number>;
  warnings: string[];
}

export function applyTransfersToValues(values: Record<string, number>, transfers: TransferForValue[]): ValueMoveResult {
  const out: Record<string, number> = { ...values };
  const warnings: string[] = [];
  for (const t of transfers) {
    for (const s of t.sellers) {
      const before = s.costBasisBefore;
      if (before === null || !(before > 0)) {
        warnings.push(`Transfer on ${t.date}: seller ${s.memberId} has no recorded cost basis, so their value was not reduced.`);
        continue;
      }
      out[s.memberId] = (out[s.memberId] ?? 0) * (1 - Math.min(1, s.costBasisMoved / before));
    }
    for (const b of t.buyers) out[b.memberId] = (out[b.memberId] ?? 0) + b.cost;
  }
  for (const id of Object.keys(out)) if (Math.abs(out[id]) < 1e-9) out[id] = 0;
  return { values: out, warnings };
}
