// Pure member-position math for internal transfers. Import-free (like transferCalc.ts) so
// scripts/member-position.test.cjs can load this .ts directly.
//
// Holdings are sparse by design: share lots exist only because a transfer declared or moved them
// (there is no round-time backfill). So a member's position in a company is assembled from what is
// known:
//   - cost basis: if the member has an OPENING lot, that lot (plus later transfer lots) IS the
//     whole holding, basis = sum of lots. Otherwise basis = invested dollars (from allocations)
//     plus the signed basis of any transfer lots.
//   - shares: known only when there is an OPENING lot, or when the member has no allocations at
//     all (a pure transferee). Otherwise null — never guessed.

export interface PositionLot {
  kind: "OPENING" | "TRANSFER_IN" | "TRANSFER_OUT";
  shares: number; // signed
  costBasis: number; // signed dollars
}

export interface MemberPosition {
  memberId: string;
  invested: number; // allocation dollars in the company
  hasLots: boolean;
  hasOpening: boolean;
  basis: number; // current cost basis in the company
  shares: number | null; // null = not fully known
}

const EPS = 1e-6;

export function computePosition(memberId: string, invested: number, lots: PositionLot[]): MemberPosition {
  const hasLots = lots.length > 0;
  const hasOpening = lots.some((l) => l.kind === "OPENING");
  const lotShares = lots.reduce((n, l) => n + l.shares, 0);
  const lotBasis = lots.reduce((n, l) => n + l.costBasis, 0);
  const basis = hasOpening ? lotBasis : invested + lotBasis;
  const sharesKnown = hasOpening || (hasLots && invested <= EPS);
  return {
    memberId,
    invested,
    hasLots,
    hasOpening,
    basis: Math.abs(basis) < EPS ? 0 : basis,
    shares: sharesKnown ? (Math.abs(lotShares) < EPS ? 0 : lotShares) : null,
  };
}

// --- Moving recorded member value across transfers ------------------------------------------
// Member valuations are recorded per FMV assessment as a member -> value dictionary. A transfer
// that happens AFTER the latest assessment has not yet been reflected in it, so until the next
// assessment arrives each seller's recorded value moves to the buyers in proportion to the
// shares moved: fraction = sharesMoved / sharesHeldBefore, split across buyers by shares received.

export interface TransferForValue {
  date: string;
  sellers: { memberId: string; shares: number; sharesHeldBefore: number | null }[];
  buyers: { memberId: string; shares: number }[];
}

export interface ValueMoveResult {
  values: Record<string, number>;
  warnings: string[];
}

export function applyTransfersToValues(values: Record<string, number>, transfers: TransferForValue[]): ValueMoveResult {
  const out: Record<string, number> = { ...values };
  const warnings: string[] = [];
  for (const t of transfers) {
    let pool = 0;
    for (const s of t.sellers) {
      const before = s.sharesHeldBefore;
      if (before === null || !(before > 0)) {
        warnings.push(`Transfer on ${t.date}: seller ${s.memberId} has no recorded holding, so no value was moved.`);
        continue;
      }
      const fraction = Math.min(1, s.shares / before);
      const moved = (out[s.memberId] ?? 0) * fraction;
      out[s.memberId] = (out[s.memberId] ?? 0) - moved;
      pool += moved;
    }
    const received = t.buyers.reduce((n, b) => n + b.shares, 0);
    if (pool > 0 && received > 0) {
      for (const b of t.buyers) out[b.memberId] = (out[b.memberId] ?? 0) + (pool * b.shares) / received;
    }
  }
  for (const id of Object.keys(out)) if (Math.abs(out[id]) < 1e-9) out[id] = 0;
  return { values: out, warnings };
}
