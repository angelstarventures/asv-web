import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ledger-recordInternalTransfer.ts and ledger-transferHoldings.ts
// exactly — duplicated rather than imported (the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract, same as lib/functions/adminMembers.ts).

export type TransferKind = "Sale" | "Replacement";

export interface RecordInternalTransferInput {
  company: string;
  date: string; // YYYY-MM-DD
  transferKind?: TransferKind; // default Sale
  referenceRoundName?: string;
  roundPricePerShare?: number; // Sale only
  transferPricePerShare?: number; // Sale only
  sourceRoundName: string; // the ONE round whose shares move
  sourceRoundDate: string; // YYYY-MM-DD
  sellers: Record<string, number>; // memberId -> original cost moved out (dollars at the source round's price)
  buyers: Record<string, number>; // memberId -> dollars paid (Sale) or original cost received (Replacement)
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
  sharesHeldBefore: number; // the seller's shares in the source round before this transfer
  costBasisBefore: number; // the seller's total cost basis in the company before this transfer
}

export interface BuyerResult {
  memberId: string;
  shares: number;
  costBasisPerShare: number;
  amount: number;
}

export interface TransferResult {
  kind: "SALE" | "REPLACEMENT";
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

export interface RoundHolder {
  memberId: string;
  displayName: string;
  available: number; // original cost still held in this round (shares x the round's price)
  basis: number; // cost basis of that position
}

export interface TransferRound {
  key: string;
  name: string;
  date: string; // YYYY-MM-DD
  pricePerShare: number | null; // null (e.g. a SAFE): only a Replacement can be recorded from it
  holders: RoundHolder[];
}

export interface CompanyHolder {
  memberId: string;
  displayName: string;
  invested: number;
  basis: number; // current cost basis in the company after all transfers
}

export interface TransferHoldingsOutput {
  companyName: string;
  rounds: TransferRound[];
  holders: CompanyHolder[]; // company-level cost basis per member (used by the exit form)
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
