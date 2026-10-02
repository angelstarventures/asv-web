import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { query } from "./dataconnect-admin";
import { requireCaller, type CallerContext } from "./auth";

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

// ── Sole-organization ID lookup (cached) ────────────────────────────────────
// Under template-per-deployment there is exactly one Organization row. Cache its ID
// after the first lookup so subsequent calls don't re-query.

let _cachedOrgId: string | null = null;

export async function getSoleOrganizationId(): Promise<string> {
  if (_cachedOrgId) return _cachedOrgId;
  const rows = await query<{ id: string }>(`SELECT id FROM "organization" LIMIT 1`);
  if (rows.length === 0) {
    throw new Error("No Organization row found — has schema migration 005 been applied?");
  }
  _cachedOrgId = rows[0].id;
  return _cachedOrgId;
}

// ── Feature-enforcement helper for callables ─────────────────────────────────
// Rollout is controlled by FEATURE_ENFORCE_MODE env var:
//   "log"      — log would-be denials and allow (safe default during rollout)
//   "enforce"  — actually throw failed-precondition
// Defaults to "log".
//
// Caller must have already passed requireAdmin (or higher) — this only checks the
// feature gate, not the role. Global roles (developer/dev_site_admin/site_admin)
// are never blocked by this helper (the toggle UIs themselves remain accessible;
// only the gated feature behind the toggle affects them).
const FEATURE_ENFORCE_MODE =
  (process.env.FEATURE_ENFORCE_MODE ?? "log") === "enforce" ? "enforce" : "log";

// Convenience wrapper: looks up the sole org ID and calls requireFeature.
// Use this in any callable that doesn't already have the orgId from context.
export async function requireFeatureEnabled(
  caller: CallerContext,
  featureKey: OrganizationFeatureKey
): Promise<void> {
  const orgId = await getSoleOrganizationId();
  return requireFeature(orgId, caller, featureKey);
}

// Convenience wrapper for member-level features — same sole-org lookup.
export async function requireMemberFeatureEnabled(
  memberId: string,
  caller: CallerContext,
  featureKey: MemberOrganizationFeatureKey
): Promise<void> {
  const orgId = await getSoleOrganizationId();
  return requireMemberFeature(memberId, orgId, caller, featureKey);
}

export async function requireFeature(
  organizationId: string,
  caller: CallerContext,
  featureKey: OrganizationFeatureKey
): Promise<void> {
  // Global roles bypass feature gating entirely.
  if (caller.role !== "admin" && caller.role !== "user") return;

  const enabled = await getOrganizationFeature(organizationId, featureKey);

  if (enabled) return; // Feature is on — allowed.

  if (FEATURE_ENFORCE_MODE === "log") {
    console.warn(
      `[FEATURE_GATE] would-deny: memberId=${caller.memberId} role=${caller.role} ` +
      `featureKey=${featureKey} orgId=${organizationId}. Allowing in log mode. ` +
      `Set FEATURE_ENFORCE_MODE=enforce once seed is confirmed complete.`
    );
    return;
  }

  throw new HttpsError(
    "failed-precondition",
    `This feature is not available. Ask a developer or dev-site-admin to enable it.`
  );
}

export async function requireMemberFeature(
  memberId: string,
  organizationId: string,
  caller: CallerContext,
  featureKey: MemberOrganizationFeatureKey
): Promise<void> {
  // Global roles bypass per-member feature gating (but still subject to org-level gate
  // via the underlying getMemberOrganizationFeature call, which checks org-level first).
  if (caller.role !== "admin" && caller.role !== "user") return;

  const enabled = await getMemberOrganizationFeature(memberId, organizationId, featureKey);

  if (enabled) return; // Feature is on — allowed.

  if (FEATURE_ENFORCE_MODE === "log") {
    console.warn(
      `[FEATURE_GATE] would-deny (member-level): memberId=${memberId} caller=${caller.memberId} ` +
      `role=${caller.role} featureKey=${featureKey} orgId=${organizationId}. Allowing in log mode.`
    );
    return;
  }

  throw new HttpsError(
    "failed-precondition",
    `This feature is not available for your account.`
  );
}
