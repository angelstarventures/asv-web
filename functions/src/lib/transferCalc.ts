// Pure math for internal (member-to-member) transfers and exit carry. Deliberately import-free
// (like realEstateSheetParse.ts): scripts/transfer-calc.test.cjs loads this .ts directly.
//
// Model (House of Biryan 2026 example):
//   - Buyers pay the round price; sellers are paid the (lower) transfer price. The spread
//     (round - transfer) x shares funds the carry lines and legal costs.
//   - Carry base is each SELLER's gain at the ROUND price: max(0, shares x (round - cost basis)).
//     Losses carry nothing; sellers are never netted against each other.
//   - DD-lead and management carry are fixed percents of each seller's gain; legal costs are a
//     dollar amount entered per transaction (or derived as the balancing figure), allocated to
//     sellers pro rata to gain.
//   - Seller realizes amount - shares x cost basis, which equals gain - fees when the spread
//     exactly funds the fees.

export const TRANSFER_SETTING_KEYS = {
  ddLeadCarryPercent: "transfer_dd_lead_carry_percent",
  managementCarryPercent: "transfer_management_carry_percent",
  managementCarryMemberId: "transfer_management_carry_member_id",
} as const;

export const DEFAULT_DD_LEAD_CARRY_PERCENT = 3;
export const DEFAULT_MANAGEMENT_CARRY_PERCENT = 5;

export type FeeKind = "DD_LEAD_CARRY" | "MANAGEMENT_CARRY" | "LEGAL_COSTS" | "OTHER";

export interface FeeLineOut {
  kind: FeeKind;
  recipientMemberId: string | null; // null for legal costs paid to third parties
  chargedToMemberId: string;
  percent: number | null;
  amount: number;
}

export interface SellerGainInput {
  memberId: string;
  gain: number; // already floored at 0 by the caller
}

export interface FeeInput {
  sellers: SellerGainInput[];
  ddLeadMemberId: string;
  managementMemberId: string;
  ddLeadPercent?: number;
  managementPercent?: number;
  legalCosts: number; // total dollars across all sellers
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Splits `total` (dollars) across weights in whole cents using largest-remainder, so the parts
// always sum to exactly round2(total).
export function allocateCents(total: number, weights: number[]): number[] {
  const cents = Math.round(total * 100);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  const w = sum > 0 ? weights : weights.map(() => 1);
  const wSum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (cents * x) / wSum);
  const floors = raw.map(Math.floor);
  let remainder = cents - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors.map((c) => c / 100);
}

// Fee lines for any set of per-seller gains — shared by transfers and (Phase 7) full exits.
export function computeFeeLines(input: FeeInput): FeeLineOut[] {
  const dd = input.ddLeadPercent ?? DEFAULT_DD_LEAD_CARRY_PERCENT;
  const mgmt = input.managementPercent ?? DEFAULT_MANAGEMENT_CARRY_PERCENT;
  const lines: FeeLineOut[] = [];
  for (const s of input.sellers) {
    const ddAmount = round2((s.gain * dd) / 100);
    const mgmtAmount = round2((s.gain * mgmt) / 100);
    if (ddAmount > 0) {
      lines.push({ kind: "DD_LEAD_CARRY", recipientMemberId: input.ddLeadMemberId, chargedToMemberId: s.memberId, percent: dd, amount: ddAmount });
    }
    if (mgmtAmount > 0) {
      lines.push({ kind: "MANAGEMENT_CARRY", recipientMemberId: input.managementMemberId, chargedToMemberId: s.memberId, percent: mgmt, amount: mgmtAmount });
    }
  }
  const legalShares = allocateCents(input.legalCosts, input.sellers.map((s) => s.gain));
  input.sellers.forEach((s, i) => {
    if (legalShares[i] > 0) {
      lines.push({ kind: "LEGAL_COSTS", recipientMemberId: null, chargedToMemberId: s.memberId, percent: null, amount: legalShares[i] });
    }
  });
  return lines;
}

export interface TransferSellerInput {
  memberId: string;
  shares: number;
  costBasisPerShare: number;
  heldShares?: number; // when provided, selling more than this is an error
}

export interface TransferBuyerInput {
  memberId: string;
  amount: number; // dollars paid, at the round price
  shares?: number; // optional cross-check; derived as amount / roundPrice when omitted
}

export interface TransferInput {
  roundPricePerShare: number;
  transferPricePerShare: number;
  sellers: TransferSellerInput[];
  buyers: TransferBuyerInput[];
  ddLeadMemberId: string | null;
  managementMemberId: string | null;
  ddLeadPercent?: number;
  managementPercent?: number;
  legalCosts?: number; // omit to derive as spread - DD - management (the "plug")
}

export interface SellerResult {
  memberId: string;
  shares: number;
  costBasisPerShare: number;
  amount: number; // paid to the seller at the transfer price
  gain: number; // carry base at the round price, floored at 0
  feesCharged: number;
  realizedGain: number; // amount - shares x cost basis
}

export interface BuyerResult {
  memberId: string;
  shares: number;
  costBasisPerShare: number; // = round price
  amount: number;
}

export interface TransferResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  sellers: SellerResult[];
  buyers: BuyerResult[];
  feeLines: FeeLineOut[];
  totalShares: number;
  grossGain: number;
  spread: number; // (round - transfer) x shares: the cash that funds the fee lines
  totalFees: number;
  legalCosts: number;
  legalPercentOfGain: number | null; // derived for display; the dollar amount is what is stored
  legalDerived: boolean;
}

const SHARE_EPS = 1e-6;
const MONEY_TOLERANCE = 1; // dollars; spread vs fee reconciliation

export function computeTransfer(input: TransferInput): TransferResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { roundPricePerShare: round, transferPricePerShare: transfer } = input;

  if (!(round > 0)) errors.push("Round price per share must be greater than 0.");
  if (!(transfer >= 0)) errors.push("Transfer price per share cannot be negative.");
  if (transfer > round) errors.push("Transfer price cannot exceed the round price (the spread funds the fees).");
  if (input.sellers.length === 0) errors.push("At least one seller is required.");
  if (input.buyers.length === 0) errors.push("At least one buyer is required.");
  if (!input.ddLeadMemberId) errors.push("This company has no DD lead; one is required to record the DD-lead carry.");
  if (!input.managementMemberId) errors.push("No management-carry recipient is configured.");

  const sellerIds = new Set<string>();
  for (const s of input.sellers) {
    if (!(s.shares > 0)) errors.push(`Seller ${s.memberId}: shares must be greater than 0.`);
    if (!(s.costBasisPerShare >= 0)) errors.push(`Seller ${s.memberId}: cost basis cannot be negative.`);
    if (s.heldShares !== undefined && s.shares > s.heldShares + SHARE_EPS) {
      errors.push(`Seller ${s.memberId} is selling ${s.shares} shares but holds only ${s.heldShares}.`);
    }
    if (sellerIds.has(s.memberId)) errors.push(`Seller ${s.memberId} appears more than once.`);
    sellerIds.add(s.memberId);
  }
  for (const b of input.buyers) {
    if (!(b.amount > 0)) errors.push(`Buyer ${b.memberId}: amount must be greater than 0.`);
    if (sellerIds.has(b.memberId)) errors.push(`Member ${b.memberId} cannot be both buyer and seller in one transfer.`);
  }

  const buyers: BuyerResult[] = input.buyers.map((b) => {
    const shares = round > 0 ? b.amount / round : 0;
    if (b.shares !== undefined && Math.abs(b.shares - shares) > 1e-4) {
      errors.push(`Buyer ${b.memberId}: ${b.amount} at ${round}/share is ${shares} shares, not ${b.shares}.`);
    }
    return { memberId: b.memberId, shares, costBasisPerShare: round, amount: round2(b.amount) };
  });

  const sellerShares = input.sellers.reduce((n, s) => n + s.shares, 0);
  const buyerShares = buyers.reduce((n, b) => n + b.shares, 0);
  if (Math.abs(sellerShares - buyerShares) > 1e-4) {
    errors.push(`Seller shares (${sellerShares}) must equal buyer shares (${buyerShares}).`);
  }

  const sellersBase = input.sellers.map((s) => {
    const gain = Math.max(0, s.shares * (round - s.costBasisPerShare));
    return { s, gain: round2(gain), amount: round2(s.shares * transfer) };
  });
  const grossGain = round2(sellersBase.reduce((n, x) => n + x.gain, 0));
  const spread = round2((round - transfer) * sellerShares);

  const ddPct = input.ddLeadPercent ?? DEFAULT_DD_LEAD_CARRY_PERCENT;
  const mgmtPct = input.managementPercent ?? DEFAULT_MANAGEMENT_CARRY_PERCENT;
  const carryLines = computeFeeLines({
    sellers: sellersBase.map((x) => ({ memberId: x.s.memberId, gain: x.gain })),
    ddLeadMemberId: input.ddLeadMemberId ?? "",
    managementMemberId: input.managementMemberId ?? "",
    ddLeadPercent: ddPct,
    managementPercent: mgmtPct,
    legalCosts: 0,
  });
  const carryTotal = round2(carryLines.reduce((n, l) => n + l.amount, 0));

  const legalDerived = input.legalCosts === undefined;
  const legalCosts = round2(legalDerived ? spread - carryTotal : (input.legalCosts as number));
  if (legalCosts < 0) {
    errors.push(
      legalDerived
        ? `The spread (${spread}) does not cover the DD-lead and management carry (${carryTotal}).`
        : "Legal costs cannot be negative."
    );
  }

  const feeLines = errors.length ? carryLines : computeFeeLines({
    sellers: sellersBase.map((x) => ({ memberId: x.s.memberId, gain: x.gain })),
    ddLeadMemberId: input.ddLeadMemberId ?? "",
    managementMemberId: input.managementMemberId ?? "",
    ddLeadPercent: ddPct,
    managementPercent: mgmtPct,
    legalCosts: Math.max(0, legalCosts),
  });
  const totalFees = round2(feeLines.reduce((n, l) => n + l.amount, 0));

  if (!legalDerived && Math.abs(totalFees - spread) > MONEY_TOLERANCE) {
    warnings.push(`Fee lines total ${totalFees} but the spread funds ${spread}; the difference is ${round2(spread - totalFees)}.`);
  }
  if (sellersBase.some((x) => x.s.shares * (round - x.s.costBasisPerShare) < 0)) {
    warnings.push("At least one seller is selling at a loss against the round price; no carry is charged on that seller.");
  }

  const sellers: SellerResult[] = sellersBase.map((x) => {
    const feesCharged = round2(feeLines.filter((l) => l.chargedToMemberId === x.s.memberId).reduce((n, l) => n + l.amount, 0));
    return {
      memberId: x.s.memberId,
      shares: x.s.shares,
      costBasisPerShare: x.s.costBasisPerShare,
      amount: x.amount,
      gain: x.gain,
      feesCharged,
      realizedGain: round2(x.amount - x.s.shares * x.s.costBasisPerShare),
    };
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sellers,
    buyers,
    feeLines,
    totalShares: sellerShares,
    grossGain,
    spread,
    totalFees,
    legalCosts: Math.max(0, legalCosts),
    legalPercentOfGain: grossGain > 0 ? (Math.max(0, legalCosts) / grossGain) * 100 : null,
    legalDerived,
  };
}
