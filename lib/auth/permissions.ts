// Shared permission definitions — used by both the client (UI visibility) and server
// (Cloud Function enforcement). Global permissions are role-gated in code; feature toggles
// are per-company / per-member-company and stored in the DB.
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

// ── Company-level feature keys ───────────────────────────────────────────────

export type CompanyFeatureKey =
  | "DEALS"
  | "AI_DEAL_MATCHING"
  | "AI_CHAT"
  | "AI_DOCUMENT_ANALYSIS"
  | "MULTIPLE_LEDGERS"
  | "AI_MODEL_PROMPT_CONFIG"
  | "AI_MODEL_SELECTION"
  | "MEMBERSHIP_DUES"
  | "COSTS";

// Ordered list of all company feature keys for rendering toggles.
export const companyFeatureKeys: readonly CompanyFeatureKey[] = [
  "DEALS", "AI_DEAL_MATCHING", "AI_CHAT", "AI_DOCUMENT_ANALYSIS",
  "MULTIPLE_LEDGERS", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

// Which roles can TOGGLE each company-level feature (not which roles can USE it).
export const COMPANY_FEATURE_TOGGLERS: Record<CompanyFeatureKey, Role[]> = {
  DEALS:                   ["dev_site_admin", "site_admin"],
  AI_DEAL_MATCHING:        ["dev_site_admin", "site_admin"],
  AI_CHAT:                 ["dev_site_admin", "site_admin"],
  AI_DOCUMENT_ANALYSIS:    ["dev_site_admin", "site_admin"],
  MULTIPLE_LEDGERS:        ["dev_site_admin", "site_admin"],
  AI_MODEL_PROMPT_CONFIG:  ["dev_site_admin", "site_admin"],
  AI_MODEL_SELECTION:      ["dev_site_admin", "site_admin"],
  MEMBERSHIP_DUES:         ["dev_site_admin", "site_admin", "admin"],
  COSTS:                   ["dev_site_admin", "site_admin", "admin"],
};

export function canToggleCompanyFeature(role: Role, featureKey: CompanyFeatureKey): boolean {
  return COMPANY_FEATURE_TOGGLERS[featureKey]?.includes(role) ?? false;
}

// ── Per-user-in-company feature keys ─────────────────────────────────────────

export type MemberCompanyFeatureKey =
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

// Ordered list of all per-user feature keys for rendering toggles.
export const memberCompanyFeatureKeys: readonly MemberCompanyFeatureKey[] = [
  "DEALS_SCREENING", "DEAL_VIEW", "COMPANY_MANAGEMENT", "AI_DEAL_MATCHING",
  "AI_CHAT", "AI_DOCUMENT_ANALYSIS", "MULTIPLE_LEDGERS", "MEMBER_MANAGEMENT",
  "MEMBER_PORTFOLIO_VIEW", "AI_MODEL_PROMPT_CONFIG", "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES", "COSTS",
];

// Which roles can TOGGLE each per-user feature.
export const MEMBER_FEATURE_TOGGLERS: Record<MemberCompanyFeatureKey, Role[]> = {
  DEALS_SCREENING:          ["dev_site_admin", "site_admin", "admin"],
  DEAL_VIEW:                ["dev_site_admin", "site_admin", "admin"],
  COMPANY_MANAGEMENT:       ["dev_site_admin", "site_admin", "admin"],
  AI_DEAL_MATCHING:         ["dev_site_admin", "site_admin", "admin"],
  AI_CHAT:                  ["dev_site_admin", "site_admin", "admin"],
  AI_DOCUMENT_ANALYSIS:     ["dev_site_admin", "site_admin", "admin"],
  MULTIPLE_LEDGERS:         ["dev_site_admin", "site_admin", "admin"],
  MEMBER_MANAGEMENT:        ["dev_site_admin", "site_admin"],
  MEMBER_PORTFOLIO_VIEW:    ["dev_site_admin", "site_admin", "admin"],
  AI_MODEL_PROMPT_CONFIG:   ["dev_site_admin", "site_admin"],
  AI_MODEL_SELECTION:       ["dev_site_admin", "site_admin"],
  MEMBERSHIP_DUES:          ["dev_site_admin", "site_admin", "admin"],
  COSTS:                    ["dev_site_admin", "site_admin", "admin"],
};

export function canToggleMemberFeature(role: Role, featureKey: MemberCompanyFeatureKey): boolean {
  return MEMBER_FEATURE_TOGGLERS[featureKey]?.includes(role) ?? false;
}