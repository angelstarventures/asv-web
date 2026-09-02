import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/deals-*.ts exactly — same duplicated-boundary-contract
// reasoning as the other lib/functions/*.ts wrappers.

export type FundingRound = "PRE_SEED" | "SEED" | "SERIES_A" | "OTHER";
export type SecurityType = "PRICED_ROUND" | "SAFE" | "CONVERTIBLE_NOTE" | "OTHER";
export type DealStage = "NEW" | "LEAD" | "DUE_DILIGENCE" | "PRESENTING" | "INVESTED" | "PASSED" | "INACTIVE";

export interface SubmitPitchFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface SubmitPitchInput {
  companyName: string;
  companyEmail: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary: string;
  teamInformation: string;
  round: FundingRound;
  securityType: SecurityType;
  seekingAmount: number;
  preMoneyValuation: number;
  hasLeadInvestor: boolean;
  leadInvestorName?: string;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasExistingInterestBearingDebt: boolean;
  hasRestrictedBusinessLines: boolean;
  raiseMethod: string;
  referredBy?: string;
  pitchDeck: SubmitPitchFile;
  additionalDocuments?: SubmitPitchFile[];
}

export async function submitPitch(input: SubmitPitchInput): Promise<{ dealId: string }> {
  // Matches dealsSubmitPitch's own timeoutSeconds-equivalent need — file uploads to Drive can
  // take a while, same reasoning as documentsAnalyze's extended timeout.
  const call = httpsCallable<SubmitPitchInput, { dealId: string }>(functions, "dealsSubmitPitch", {
    timeout: 300000,
  });
  const res = await call(input);
  return res.data;
}

export interface SetDealRatingInput {
  dealId: string;
  rating: number;
  review?: string;
}
export async function setDealRating(input: SetDealRatingInput): Promise<{ ok: true }> {
  const call = httpsCallable<SetDealRatingInput, { ok: true }>(functions, "dealsSetRating");
  const res = await call(input);
  return res.data;
}

export interface UpdateDealStageInput {
  dealId: string;
  stage: DealStage;
}
export async function updateDealStage(input: UpdateDealStageInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateDealStageInput, { ok: true }>(functions, "dealsUpdateStage");
  const res = await call(input);
  return res.data;
}

export interface ManageDealTagInput {
  action: "create" | "rename" | "delete";
  tagId?: string;
  name?: string;
  color?: string;
}
export async function manageDealTag(input: ManageDealTagInput): Promise<{ ok: true; tagId?: string }> {
  const call = httpsCallable<ManageDealTagInput, { ok: true; tagId?: string }>(functions, "dealsManageTag");
  const res = await call(input);
  return res.data;
}

export interface AssignDealTagInput {
  dealId: string;
  tagId: string;
  assign: boolean;
}
export async function assignDealTag(input: AssignDealTagInput): Promise<{ ok: true }> {
  const call = httpsCallable<AssignDealTagInput, { ok: true }>(functions, "dealsAssignTag");
  const res = await call(input);
  return res.data;
}
