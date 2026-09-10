// Separate from components/PortfolioTabs.tsx (a "use client" component) so server components
// (app/member/dashboard/page.tsx, app/admin/portfolios/page.tsx) can call parsePortfolioTab —
// every export of a "use client" file is client-only, same reason lib/scenarioTypes.ts is
// split out from lib/scenarios.ts's useScenario hook.
export const PORTFOLIO_TABS = ["overview", "details", "exits", "reports"] as const;
export type PortfolioTab = (typeof PORTFOLIO_TABS)[number];

export function parsePortfolioTab(value: string | string[] | undefined): PortfolioTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (PORTFOLIO_TABS as readonly string[]).includes(v ?? "") ? (v as PortfolioTab) : "overview";
}
