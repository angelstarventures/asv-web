import { HttpsError } from "firebase-functions/v2/https";

// Shared between deals-submitPitch.ts (create) and deals-updateFields.ts (admin edit) so the
// same business rules — SAFE vs priced-round valuation, currency format, funding history shape
// — can't drift between the two call sites. The callable SDK serializes `undefined` fields as
// `null`, so every "optional" check below treats `== null`/`!= null` as the not-provided case,
// never a bare `=== undefined` (a real bug caught here once already — see deals-submitPitch's
// git history for the fundingHistory incident).

export type FundingRound = "FAMILY_AND_FRIENDS" | "PRE_SEED" | "SEED" | "SERIES_A" | "SERIES_B" | "SERIES_C" | "OTHER";
export type SecurityType = "PRICED_ROUND" | "SAFE" | "CONVERTIBLE_NOTE" | "OTHER";

export const FUNDING_ROUNDS: readonly FundingRound[] = [
  "FAMILY_AND_FRIENDS",
  "PRE_SEED",
  "SEED",
  "SERIES_A",
  "SERIES_B",
  "SERIES_C",
  "OTHER",
];
export const SECURITY_TYPES: readonly SecurityType[] = ["PRICED_ROUND", "SAFE", "CONVERTIBLE_NOTE", "OTHER"];

export interface DealFundingRoundEntryInput {
  round: FundingRound;
  amount: number;
  currency: string;
}

export interface DealCoreFields {
  companyName: string;
  companyEmail: string;
  companyUrl: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary?: string | null;
  teamInformation?: string | null;
  round: FundingRound;
  securityType: SecurityType;
  seekingAmount: number;
  currency: string;
  // Required unless securityType is SAFE, in which case valuationCap/discountPercent apply
  // instead (a SAFE has no pre-money valuation in the traditional sense).
  preMoneyValuation?: number | null;
  valuationCap?: number | null;
  discountPercent?: number | null;
  hasLeadInvestor: boolean;
  leadInvestorName?: string | null;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasExistingInterestBearingDebt: boolean;
  hasRestrictedBusinessLines: boolean;
  raiseMethod?: string | null;
  referredBy?: string | null;
  sector?: string | null;
  keywords?: string[] | null;
  companyLocation?: string | null;
}

const REQUIRED_STRING_FIELDS: (keyof DealCoreFields)[] = [
  "companyName",
  "companyEmail",
  "companyUrl",
  "entrepreneurName",
  "entrepreneurEmail",
  "entrepreneurPhone",
];

const BOOLEAN_FIELDS = [
  "hasLeadInvestor",
  "willHaveInterestBearingDebtAfterClose",
  "hasExistingInterestBearingDebt",
  "hasRestrictedBusinessLines",
] as const;

export function assertValidDealCoreFields(input: DealCoreFields): void {
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof input[field] !== "string" || !(input[field] as string).trim()) {
      throw new HttpsError("invalid-argument", `${field} is required.`);
    }
  }
  if (!FUNDING_ROUNDS.includes(input.round)) {
    throw new HttpsError("invalid-argument", `round must be one of ${FUNDING_ROUNDS.join(", ")}.`);
  }
  if (!SECURITY_TYPES.includes(input.securityType)) {
    throw new HttpsError("invalid-argument", `securityType must be one of ${SECURITY_TYPES.join(", ")}.`);
  }
  if (!Number.isFinite(input.seekingAmount) || input.seekingAmount <= 0) {
    throw new HttpsError("invalid-argument", "seekingAmount must be a positive number.");
  }
  if (typeof input.currency !== "string" || input.currency.trim().length < 3 || input.currency.trim().length > 10) {
    throw new HttpsError("invalid-argument", "currency must be a valid currency code.");
  }
  if (input.securityType === "SAFE") {
    if (!Number.isFinite(input.valuationCap) || (input.valuationCap as number) <= 0) {
      throw new HttpsError("invalid-argument", "valuationCap must be a positive number for a SAFE.");
    }
    if (
      input.discountPercent != null &&
      (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100)
    ) {
      throw new HttpsError("invalid-argument", "discountPercent must be between 0 and 100.");
    }
  } else if (!Number.isFinite(input.preMoneyValuation) || (input.preMoneyValuation as number) <= 0) {
    throw new HttpsError("invalid-argument", "preMoneyValuation must be a positive number.");
  }
  for (const flag of BOOLEAN_FIELDS) {
    if (typeof input[flag] !== "boolean") {
      throw new HttpsError("invalid-argument", `${flag} must be a boolean.`);
    }
  }
}

// Returns a normalized array (never null/undefined) so callers can always iterate/insert
// without a further `?? []` guard.
export function assertValidFundingHistory(entries: unknown): DealFundingRoundEntryInput[] {
  if (entries == null) return [];
  if (!Array.isArray(entries)) {
    throw new HttpsError("invalid-argument", "fundingHistory must be an array.");
  }
  for (const entry of entries as DealFundingRoundEntryInput[]) {
    if (!FUNDING_ROUNDS.includes(entry.round)) {
      throw new HttpsError("invalid-argument", `fundingHistory round must be one of ${FUNDING_ROUNDS.join(", ")}.`);
    }
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
      throw new HttpsError("invalid-argument", "fundingHistory amount must be a positive number.");
    }
    if (typeof entry.currency !== "string" || entry.currency.trim().length < 3 || entry.currency.trim().length > 10) {
      throw new HttpsError("invalid-argument", "fundingHistory currency must be a valid currency code.");
    }
  }
  return entries as DealFundingRoundEntryInput[];
}
