// Pure math for how internal transfers change ONE member's portfolio view. Import-free so
// scripts/transfer-adjust.test.cjs can load this .ts directly.
//
// Model (a member's "invested" stays the capital they originally deployed):
//   - a seller's proceeds are realized: sale -> the amount paid to them (already net of the spread
//     that funds carry), replacement -> the cost basis moved (transfer at cost, so MOIC is neutral)
//   - a buyer's invested grows by what they paid (sale) or the basis they inherit (replacement)
//   - until the next valuation record arrives, a seller's latest recorded value falls by the share
//     of their company cost basis that moved, and a buyer's value rises by what the shares cost
//     them (paid, or the basis inherited). This mirrors functions/src/lib/positionCalc.ts
//     applyTransfersToValues.

export interface TransferLeg {
  entryId: string;
  date: string; // YYYY-MM-DD
  companyId: string;
  memberId: string;
  side: "SELLER" | "BUYER";
  shares: number;
  costBasisPerShare: number;
  amount: number; // 0 for a replacement
  costBasisBefore: number | null; // sellers only: total company cost basis before the transfer
}

export interface ValuationSnapshot {
  companyId: string;
  date: string; // date of the latest non-exit valuation entry for the company
  values: Record<string, number>; // memberId -> recorded value
}

export interface CompanyTransferEffect {
  companyId: string;
  basisIn: number; // buyer cost / inherited basis added to invested
  basisOut: number; // cost basis of shares sold
  proceeds: number; // realized by selling
  // The member's latest recorded value after moving value across later transfers; null when the
  // company has no recorded valuation yet.
  valueAfter: number | null;
  cashFlows: { date: string; amount: number }[]; // buyer outflows negative, seller proceeds positive
  firstDate: string | null; // earliest transfer date involving the member
  warnings: string[];
}

export function applyTransfersToValues(
  values: Record<string, number>,
  transfers: {
    date: string;
    sellers: { memberId: string; costBasisMoved: number; costBasisBefore: number | null }[];
    buyers: { memberId: string; cost: number }[];
  }[]
): { values: Record<string, number>; warnings: string[] } {
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

export function memberTransferEffects(
  memberId: string,
  legs: TransferLeg[],
  snapshots: ValuationSnapshot[]
): Map<string, CompanyTransferEffect> {
  const byCompany = new Map<string, TransferLeg[]>();
  for (const l of legs) {
    const list = byCompany.get(l.companyId) ?? [];
    list.push(l);
    byCompany.set(l.companyId, list);
  }
  const snapshotBy = new Map(snapshots.map((s) => [s.companyId, s]));

  const out = new Map<string, CompanyTransferEffect>();
  for (const [companyId, companyLegs] of byCompany) {
    const mine = companyLegs.filter((l) => l.memberId === memberId);
    if (mine.length === 0) continue;
    const effect: CompanyTransferEffect = {
      companyId,
      basisIn: 0,
      basisOut: 0,
      proceeds: 0,
      valueAfter: null,
      cashFlows: [],
      firstDate: null,
      warnings: [],
    };
    for (const l of mine) {
      const basis = l.shares * l.costBasisPerShare;
      if (l.side === "SELLER") {
        const proceeds = l.amount > 0 ? l.amount : basis;
        effect.basisOut += basis;
        effect.proceeds += proceeds;
        effect.cashFlows.push({ date: l.date, amount: proceeds });
      } else {
        const cost = l.amount > 0 ? l.amount : basis;
        effect.basisIn += cost;
        effect.cashFlows.push({ date: l.date, amount: -cost });
      }
      if (!effect.firstDate || l.date < effect.firstDate) effect.firstDate = l.date;
    }

    const snap = snapshotBy.get(companyId);
    if (snap) {
      const entries = new Map<string, TransferLeg[]>();
      for (const l of companyLegs) {
        if (l.date <= snap.date) continue; // already reflected in that valuation
        const list = entries.get(l.entryId) ?? [];
        list.push(l);
        entries.set(l.entryId, list);
      }
      const transfers = [...entries.values()]
        .map((group) => ({
          date: group[0].date,
          sellers: group
            .filter((g) => g.side === "SELLER")
            .map((g) => ({ memberId: g.memberId, costBasisMoved: g.shares * g.costBasisPerShare, costBasisBefore: g.costBasisBefore })),
          buyers: group
            .filter((g) => g.side === "BUYER")
            .map((g) => ({ memberId: g.memberId, cost: g.amount > 0 ? g.amount : g.shares * g.costBasisPerShare })),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const moved = applyTransfersToValues(snap.values, transfers);
      effect.valueAfter = moved.values[memberId] ?? 0;
      effect.warnings = moved.warnings;
    }
    out.set(companyId, effect);
  }
  return out;
}
