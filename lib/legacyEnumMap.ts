// Deliberate, small duplicate of functions/src/lib/enumMap.ts's reverse maps — that module
// lives in the Cloud Functions project (separate deploy, no shared package with this Next.js
// app), and these 4 maps are fixed, rarely-changing enum sets, so copy-paste is cheaper and
// safer here than wiring up a shared package for 20 lines. Keep both in sync if any of these
// enums ever change. Used by the member ledger export (app/api/ledger/my-full-ledger) to
// reshape DB enum values back into the legacy JSON schema's title-case strings — note IPO
// stays all-caps (not "Ipo"), so this can't be a mechanical title-case transform.

export const ENUM_TO_HEALTH = { GREEN: "Green", YELLOW: "Yellow", RED: "Red" } as const;
export const ENUM_TO_TRAJECTORY = { IMPROVING: "Improving", STABLE: "Stable", DECLINING: "Declining" } as const;
export const ENUM_TO_EXIT_TYPE = {
  ACQUISITION: "Acquisition",
  IPO: "IPO",
  MERGER: "Merger",
  SHUTDOWN: "Shutdown",
  DISSOLUTION: "Dissolution",
} as const;
export const ENUM_TO_AUDIT_TYPE = {
  MANUAL_OVERRIDE: "Manual_Override",
  SCHEDULED_SHARIAH_REVIEW: "Scheduled_Shariah_Review",
  STRATEGIC_PIVOT_AUDIT: "Strategic_Pivot_Audit",
} as const;

export const ENUM_TO_LEDGER_TYPE = {
  PARTICIPATING_PRICED_ROUND: "Participating_PricedRound",
  PARTICIPATING_SAFE_ROUND: "Participating_SAFERound",
  NON_PARTICIPATING_ROUND: "NonParticipating_Round",
  EXIT_EVENT: "Exit_Event",
  TRANSACTION_VALUATION_CHANGE: "Transaction_ValuationChange",
  INTERNAL_VALUATION_ASSESSMENT: "Internal_ValuationAssessment",
  COMPLIANCE_FLAG_CHANGE: "Compliance_FlagChange",
  COMPANY_UPDATE: "CompanyUpdate",
} as const;
