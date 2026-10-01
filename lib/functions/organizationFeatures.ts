import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// ── Organization-level features ─────────────────────────────────────────────

export type OrganizationFeatureKey =
  | "DEALS"
  | "AI_DEAL_MATCHING"
  | "AI_CHAT"
  | "AI_DOCUMENT_ANALYSIS"
  | "MULTIPLE_LEDGERS"
  | "AI_MODEL_PROMPT_CONFIG"
  | "AI_MODEL_SELECTION"
  | "MEMBERSHIP_DUES"
  | "COSTS";

export interface UpdateOrganizationFeatureInput {
  organizationId: string;
  featureKey: OrganizationFeatureKey;
  enabled: boolean;
}
export async function updateOrganizationFeature(input: UpdateOrganizationFeatureInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateOrganizationFeatureInput, { ok: true }>(functions, "updateOrganizationFeature");
  const res = await call(input);
  return res.data;
}

export interface GetOrganizationFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}
export async function getOrganizationFeatures(organizationId: string): Promise<GetOrganizationFeaturesOutput> {
  const call = httpsCallable<{ organizationId: string }, GetOrganizationFeaturesOutput>(
    functions,
    "getOrganizationFeatures"
  );
  const res = await call({ organizationId });
  return res.data;
}

// ── Per-member-within-organization features ─────────────────────────────────

export type MemberOrganizationFeatureKey =
  | "DEALS_SCREENING"
  | "DEAL_VIEW"
  | "COMPANY_MANAGEMENT"
  | "AI_DEAL_MATCHING"
  | "AI_CHAT"
  | "AI_DOCUMENT_ANALYSIS"
  | "MULTIPLE_LEDGERS"
  | "MEMBER_MANAGEMENT"
  | "MEMBER_PORTFOLIO_VIEW"
  | "AI_MODEL_PROMPT_CONFIG"
  | "AI_MODEL_SELECTION"
  | "MEMBERSHIP_DUES"
  | "COSTS";

export interface UpdateMemberOrganizationFeatureInput {
  memberId: string;
  organizationId: string;
  featureKey: MemberOrganizationFeatureKey;
  enabled: boolean;
}
export async function updateMemberOrganizationFeature(
  input: UpdateMemberOrganizationFeatureInput
): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateMemberOrganizationFeatureInput, { ok: true }>(
    functions,
    "updateMemberOrganizationFeature"
  );
  const res = await call(input);
  return res.data;
}

export interface GetMemberOrganizationFeaturesInput {
  memberId: string;
  organizationId: string;
}
export interface GetMemberOrganizationFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}
export async function getMemberOrganizationFeatures(
  input: GetMemberOrganizationFeaturesInput
): Promise<GetMemberOrganizationFeaturesOutput> {
  const call = httpsCallable<GetMemberOrganizationFeaturesInput, GetMemberOrganizationFeaturesOutput>(
    functions,
    "getMemberOrganizationFeatures"
  );
  const res = await call(input);
  return res.data;
}
