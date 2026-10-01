// Central branding/identity config for this deployment, sourced from env vars. Defaults match
// AngelStar Ventures' (ASV's) current copy exactly — introducing this file changes nothing
// until later phases of the templatization plan actually wire call sites through it. A future
// tenant overrides these via its own .env.local rather than forking the codebase.
export interface TenantConfig {
  orgName: string; // full display name — page titles, PWA manifest name
  orgShortName: string; // PWA/meta short form, e.g. "AngelStar"
  orgAbbreviation: string; // casual body-copy abbreviation, e.g. "ASV"
  logoPath: string;
  logoAlt: string;
  themeColor: string;
  backgroundColor: string;
  pwaDescription: string;
  supportEmail: string;
  billingConsoleProjectId: string;
  duesReminderTemplateDefault: string;
  complianceScreening: {
    enabled: boolean;
    halalTagLabel: string;
  };
}

export const tenantConfig: TenantConfig = {
  orgName: process.env.NEXT_PUBLIC_TENANT_ORG_NAME ?? "AngelStar Ventures",
  orgShortName: process.env.NEXT_PUBLIC_TENANT_ORG_SHORT_NAME ?? "AngelStar",
  orgAbbreviation: process.env.NEXT_PUBLIC_TENANT_ORG_ABBREVIATION ?? "ASV",
  logoPath: process.env.NEXT_PUBLIC_TENANT_LOGO_PATH ?? "/ASV-logo-black2.png",
  logoAlt: process.env.NEXT_PUBLIC_TENANT_LOGO_ALT ?? "Angel Star Ventures",
  themeColor: process.env.NEXT_PUBLIC_TENANT_THEME_COLOR ?? "#2c2520",
  backgroundColor: process.env.NEXT_PUBLIC_TENANT_BACKGROUND_COLOR ?? "#fdfbf7",
  pwaDescription:
    process.env.NEXT_PUBLIC_TENANT_PWA_DESCRIPTION ??
    "AngelStar Ventures member portal: portfolio, ledger, and deal flow.",
  supportEmail: process.env.NEXT_PUBLIC_TENANT_SUPPORT_EMAIL ?? "angelstarinvestments@gmail.com",
  billingConsoleProjectId: process.env.NEXT_PUBLIC_TENANT_BILLING_PROJECT_ID ?? "angelstar-investments",
  duesReminderTemplateDefault:
    process.env.NEXT_PUBLIC_TENANT_DUES_REMINDER_TEMPLATE ??
    "Hi {name}, this is a reminder that your ${amount} annual ASV membership dues for {year} are due. Thank you!",
  complianceScreening: {
    enabled: process.env.NEXT_PUBLIC_TENANT_COMPLIANCE_SCREENING_ENABLED !== "false",
    halalTagLabel: process.env.NEXT_PUBLIC_TENANT_HALAL_TAG_LABEL ?? "Halal",
  },
};
