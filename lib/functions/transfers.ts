import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ledger-recordInternalTransfer.ts and ledger-transferHoldings.ts
// exactly — duplicated rather than imported (the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract, same as lib/functions/adminMembers.ts).

export type TransferKind = "Sale" | "Replacement";

export interface DeclaredHolding {
  shares: number; // the seller's WHOLE holding in the company before this transfer
  cost_basis?: number; // total dollars; defaults to the member's invested dollars
}

export interface RecordInternalTransferInput {
  company: string;
  date: string; // YYYY-MM-DD
  transferKind?: TransferKind; // default Sale
  referenceRoundName?: string;
  roundPricePerShare?: number; // Sale only
  transferPricePerShare?: number; // Sale only
  sellers: Record<string, number>; // memberId -> shares moved out
  buyers: Record<string, number>; // memberId -> dollars paid (Sale) or shares received (Replacement)
  holdingsBefore?: Record<string, DeclaredHolding>;
  soldCostBasis?: Record<string, number>; // seller -> total basis of the specific shares sold; omit for average cost
  legalCosts?: number; // Sale only; omit to derive as spread - carry
  docLink?: string;
  notes?: string;
  preview?: boolean;
}

export interface FeeLineOut {
  kind: "DD_LEAD_CARRY" | "MANAGEMENT_CARRY" | "LEGAL_COSTS" | "OTHER";
  recipientMemberId: string | null;
  chargedToMemberId: string;
  percent: number | null;
  amount: number;
}

export interface SellerResult {
  memberId: string;
  shares: number;
  costBasisPerShare: number;
  amount: number;
  gain: number;
  feesCharged: number;
  realizedGain: number;
  sharesHeldBefore: number;
}

export interface BuyerResult {
  memberId: string;
  shares: number;
  costBasisPerShare: number;
  amount: number;
}

export interface OpeningAdjustment {
  memberId: string;
  shares: number;
  costBasis: number;
}

export interface TransferResult {
  kind: "SALE" | "REPLACEMENT";
  openingAdjustments: OpeningAdjustment[];
  ok: boolean;
  errors: string[];
  warnings: string[];
  sellers: SellerResult[];
  buyers: BuyerResult[];
  feeLines: FeeLineOut[];
  totalShares: number;
  grossGain: number;
  spread: number;
  totalFees: number;
  legalCosts: number;
  legalPercentOfGain: number | null;
  legalDerived: boolean;
}

// A preview that could not even be computed (unknown company, ...) carries only errors.
export interface RecordInternalTransferOutput {
  preview: TransferResult | { errors: string[] };
  recorded: boolean;
}

export async function ledgerRecordInternalTransfer(input: RecordInternalTransferInput): Promise<RecordInternalTransferOutput> {
  const call = httpsCallable<RecordInternalTransferInput, RecordInternalTransferOutput>(functions, "ledgerRecordInternalTransfer");
  return (await call(input)).data;
}

export interface TransferHolder {
  memberId: string;
  displayName: string;
  invested: number;
  basis: number;
  shares: number | null; // null = no recorded holding yet
  hasOpening: boolean;
}

export interface TransferHoldingsOutput {
  companyName: string;
  holders: TransferHolder[];
  ddLeadMemberId: string | null;
  ddLeadName: string | null;
  managementMemberId: string | null;
  managementName: string | null;
  ddLeadPercent: number;
  managementPercent: number;
  saleBlockers: string[];
}

export async function ledgerTransferHoldings(companyId: string): Promise<TransferHoldingsOutput> {
  const call = httpsCallable<{ companyId: string }, TransferHoldingsOutput>(functions, "ledgerTransferHoldings");
  return (await call({ companyId })).data;
}
