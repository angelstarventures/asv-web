// Functions-side branding/identity config, sourced from env vars. Defaults match AngelStar
// Ventures' (ASV's) current identity exactly — introducing this file changes nothing until
// later phases of the templatization plan actually wire call sites through it.
export interface FunctionsTenantConfig {
  orgAbbreviation: string; // casual body-copy abbreviation, e.g. "ASV" — used in AI prompts/guardrail text
  fromAddress: string; // Gmail send-as address (functions/src/lib/gmail.ts)
  feedbackRecipient: string; // functions/src/functions/feedback-send.ts
  dealsDriveRootFolderId: string;
  companyUpdatesDriveRootFolderId: string;
  taxDocumentsDriveRootFolderId: string;
  complianceScreening: {
    enabled: boolean;
    halalTagLabel: string;
  };
}

export const tenantConfig: FunctionsTenantConfig = {
  orgAbbreviation: process.env.TENANT_ORG_ABBREVIATION ?? "ASV",
  fromAddress: process.env.TENANT_GMAIL_FROM_ADDRESS ?? "angelstarventures@gmail.com",
  feedbackRecipient: process.env.TENANT_FEEDBACK_RECIPIENT ?? "angelstarinvestments@gmail.com",
  dealsDriveRootFolderId: process.env.DEALS_DRIVE_ROOT_FOLDER_ID ?? "",
  companyUpdatesDriveRootFolderId: process.env.COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID ?? "",
  taxDocumentsDriveRootFolderId: process.env.TAX_DOCUMENTS_DRIVE_ROOT_FOLDER_ID ?? "",
  complianceScreening: {
    enabled: process.env.TENANT_COMPLIANCE_SCREENING_ENABLED !== "false",
    halalTagLabel: process.env.TENANT_HALAL_TAG_LABEL ?? "Halal",
  },
};
