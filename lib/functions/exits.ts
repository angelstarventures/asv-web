import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ledger-recordExit.ts and functions/src/lib/exitCarry.ts exactly
// (duplicated rather than imported: the web app never reaches into the Cloud Functions project).

export type ExitType = "Acquisition" | "IPO" | "Merger" | "Shutdown" | "Dissolution";

export interface RecordExitInput {
  company: string;
  date: string; // YYYY-MM-DD
  exitType: ExitType;
  totalExitValue: number;
  asvTotalPayout: number;
  memberPayouts: Record<string, number>; // GROSS payouts
  docLink?: string;
  applyCarry?: boolean; // false opts this exit out of carry
  preview?: boolean;
}

export interface ExitCarryMemberRow {
  memberId: string;
  displayName: string;
  payout: number;
  basis: number;
  gain: number;
  carry: number;
  net: number;
}

export interface ExitFeeLine {
  kind: "DD_LEAD_CARRY" | "MANAGEMENT_CARRY" | "LEGAL_COSTS" | "OTHER";
  recipientMemberId: string | null;
  chargedToMemberId: string;
  percent: number | null;
  amount: number;
}

export interface ExitCarryPreview {
  applies: boolean;
  reason: string | null;
  errors: string[];
  members: ExitCarryMemberRow[];
  result: { feeLines: ExitFeeLine[]; totalCarry: number } | null;
  ddLeadPercent: number;
  managementPercent: number;
}

export interface RecordExitOutput {
  errors: string[];
  warnings: string[];
  payoutSum: number;
  carry: ExitCarryPreview | null;
  recorded: boolean;
}

export async function ledgerRecordExit(input: RecordExitInput): Promise<RecordExitOutput> {
  const call = httpsCallable<RecordExitInput, RecordExitOutput>(functions, "ledgerRecordExit");
  return (await call(input)).data;
}
