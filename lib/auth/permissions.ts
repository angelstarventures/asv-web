// Shared permission definitions — used by both the client (UI visibility) and server
// (Cloud Function enforcement). Global permissions are role-gated in code; feature toggles
// are per-organization / per-member-organization and stored in the DB.
//
// This map is a UI-affordance / documentation layer, not the security boundary. It's safe
// to use for deciding what to render or enable client-side, but the actual enforcement for
// any of these permissions is (or will be) the Cloud Function checkers in
// functions/src/lib/auth.ts — never trust a client-side hasGlobalPermission() check alone.

import type { Role } from "@/lib/auth/claims";

// ── Global permissions (mapped by role) ─────────────────────────────────────

export type GlobalPermission =
  | "configure_deploy_website"
  | "bulk_migration"
  | "website_maintenance"
  | "manual_edit_records"
  | "all_user_management"
  | "company_member_management";

// Each role lists the permissions it grants. There is no inheritance — each role gets
// exactly what's listed. If a permission appears in multiple roles, all those roles get it.
export const ROLE_PERMISSIONS: Record<Role, GlobalPermission[]> = {
  developer: [
    "configure_deploy_website",
    "bulk_migration",
    "website_maintenance",
  ],
  dev_site_admin: [
    "configure_deploy_website",
    "bulk_migration",
    "website_maintenance",
    "manual_edit_records",
    "all_user_management",
  ],
  site_admin: [
    "configure_deploy_website",
    "bulk_migration",
    "website_maintenance",
    "manual_edit_records",
    "all_user_management",
  ],
  admin: [
    "manual_edit_records",
    "company_member_management",
  ],
  user: [],
};

export function hasGlobalPermission(role: Role, permission: GlobalPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// ── Organization-level feature keys ──────────────────────────────────────────
// "Organization" here is the angel investing group itself (see schema.gql's Organization
// comment) — NOT a portfolio company.

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

// Ordered list of all organization feature keys for rendering toggles.
export const organizationFeatureKeys: readonly OrganizationFeatureKey[] = [
  "DEALS", "AI_DEAL_MATCHING", "AI_CHAT", "AI_DOCUMENT_ANALYSIS",
  "MULTIPLE_LEDGERS", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

// Which roles can TOGGLE organization-level features (not which roles can USE them) —
// developer/dev_site_admin only, uniformly across every key. This is the master switch for
// the whole deployment; site_admin does NOT get a say here, only over the per-member
// overrides below, and only within whatever's already enabled here.
export const ORGANIZATION_FEATURE_TOGGLER_ROLES: readonly Role[] = ["developer", "dev_site_admin"];

export function canToggleOrganizationFeature(role: Role): boolean {
  return ORGANIZATION_FEATURE_TOGGLER_ROLES.includes(role);
}

// ── Per-member-within-organization feature keys ──────────────────────────────

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

// Ordered list of all per-member feature keys for rendering toggles.
export const memberOrganizationFeatureKeys: readonly MemberOrganizationFeatureKey[] = [
  "DEALS_SCREENING", "DEAL_VIEW", "COMPANY_MANAGEMENT", "AI_DEAL_MATCHING",
  "AI_CHAT", "AI_DOCUMENT_ANALYSIS", "MULTIPLE_LEDGERS", "MEMBER_MANAGEMENT",
  "MEMBER_PORTFOLIO_VIEW", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

// Which roles can TOGGLE per-member overrides — dev_site_admin and site_admin, uniformly
// across every key (matches requireAllUserManagement's server-side enforcement exactly).
// developer is deliberately excluded here — per-member access is member/business-level
// control, outside developer's dev-ops-only scope (deploy/migrate/maintain). Enforcement
// of "only within what's already organization-enabled" lives server-side in
// functions/src/functions/organizationFeatures.ts, not here.
export const MEMBER_ORGANIZATION_FEATURE_TOGGLER_ROLES: readonly Role[] = [
  "dev_site_admin",
  "site_admin",
];

export function canToggleMemberOrganizationFeature(role: Role): boolean {
  return MEMBER_ORGANIZATION_FEATURE_TOGGLER_ROLES.includes(role);
}
