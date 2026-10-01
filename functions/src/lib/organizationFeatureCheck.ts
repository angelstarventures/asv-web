import { query } from "./dataconnect-admin";

// ── Types mirroring the Data Connect enums ──────────────────────────────────

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

export const ORGANIZATION_FEATURE_KEYS: readonly OrganizationFeatureKey[] = [
  "DEALS", "AI_DEAL_MATCHING", "AI_CHAT", "AI_DOCUMENT_ANALYSIS",
  "MULTIPLE_LEDGERS", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

export const MEMBER_ORGANIZATION_FEATURE_KEYS: readonly MemberOrganizationFeatureKey[] = [
  "DEALS_SCREENING", "DEAL_VIEW", "COMPANY_MANAGEMENT", "AI_DEAL_MATCHING",
  "AI_CHAT", "AI_DOCUMENT_ANALYSIS", "MULTIPLE_LEDGERS", "MEMBER_MANAGEMENT",
  "MEMBER_PORTFOLIO_VIEW", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

// An organization with no explicit row for a feature key defaults to false (disabled).
export async function getOrganizationFeature(
  organizationId: string,
  featureKey: OrganizationFeatureKey
): Promise<boolean> {
  const rows = await query<{ enabled: boolean }>(
    `SELECT enabled FROM "organization_feature" WHERE "organization_id" = $1 AND "feature_key" = $2`,
    [organizationId, featureKey]
  );
  return rows[0]?.enabled ?? false;
}

// Get all feature states for an organization (missing keys = false).
export interface OrganizationFeatureState {
  featureKey: OrganizationFeatureKey;
  enabled: boolean;
}
export async function getAllOrganizationFeatures(organizationId: string): Promise<OrganizationFeatureState[]> {
  const rows = await query<{ featureKey: string; enabled: boolean }>(
    `SELECT "feature_key" AS "featureKey", enabled FROM "organization_feature" WHERE "organization_id" = $1`,
    [organizationId]
  );
  const result: OrganizationFeatureState[] = [];
  for (const key of ORGANIZATION_FEATURE_KEYS) {
    const row = rows.find((r) => r.featureKey === key);
    result.push({ featureKey: key, enabled: row?.enabled ?? false });
  }
  return result;
}

// A member with no explicit row for an (organization, featureKey) inherits the
// organization-level toggle's own enabled value (on by default once the org enables it).
// If the organization-level feature is disabled, this always returns false regardless of
// any member-level row — OrganizationFeature is a hard gate, not just a default.
export async function getMemberOrganizationFeature(
  memberId: string,
  organizationId: string,
  featureKey: MemberOrganizationFeatureKey
): Promise<boolean> {
  const orgEnabled = await getOrganizationFeature(organizationId, featureKey as OrganizationFeatureKey);
  if (!orgEnabled) return false;

  const rows = await query<{ enabled: boolean }>(
    `SELECT enabled FROM "member_organization_feature"
     WHERE "organization_id" = $1 AND "member_id" = $2 AND "feature_key" = $3`,
    [organizationId, memberId, featureKey]
  );
  if (rows[0] !== undefined) return rows[0].enabled;
  // No per-member row — inherit the organization-level default (already confirmed enabled above).
  return true;
}

// Get all per-member feature states for a (member, organization).
export interface MemberOrganizationFeatureState {
  featureKey: MemberOrganizationFeatureKey;
  enabled: boolean;
}
export async function getAllMemberOrganizationFeatures(
  memberId: string,
  organizationId: string
): Promise<MemberOrganizationFeatureState[]> {
  const orgFeatures = await getAllOrganizationFeatures(organizationId);
  const orgEnabledByKey = new Map(orgFeatures.map((f) => [f.featureKey as string, f.enabled]));

  const rows = await query<{ featureKey: string; enabled: boolean }>(
    `SELECT "feature_key" AS "featureKey", enabled FROM "member_organization_feature"
     WHERE "organization_id" = $1 AND "member_id" = $2`,
    [organizationId, memberId]
  );
  const result: MemberOrganizationFeatureState[] = [];
  for (const key of MEMBER_ORGANIZATION_FEATURE_KEYS) {
    const orgEnabled = orgEnabledByKey.get(key) ?? false;
    if (!orgEnabled) {
      // Hard gate — disabled at the org level, no per-member row can override it.
      result.push({ featureKey: key, enabled: false });
      continue;
    }
    const row = rows.find((r) => r.featureKey === key);
    result.push({ featureKey: key, enabled: row?.enabled ?? true });
  }
  return result;
}
