"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PORTFOLIO_TABS, type PortfolioTab } from "@/lib/portfolioTab";

const TAB_LABELS: Record<PortfolioTab, string> = {
  overview: "Overview",
  details: "Details",
  exits: "Exits & Write-offs",
  reports: "Reports",
};

// URL-driven (?tab=), same shareable/bookmarkable/back-button-safe reasoning as lib/scenarios.ts's
// useScenario — a sibling param on the same URL, not merged into that hook, since tab is a
// different concept (which section renders) from scope/scenario (which numbers are shown).
// Every existing query param (scope, scenario, memberId when viewing as another member) is
// carried forward untouched.
export function PortfolioTabs({ active }: { active: PortfolioTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectTab(tab: PortfolioTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <nav className="flex flex-wrap gap-1 self-start rounded-2xl border border-zinc-200 bg-card p-1.5 dark:border-zinc-800">
      {PORTFOLIO_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => selectTab(tab)}
          aria-current={active === tab ? "page" : undefined}
          className={
            active === tab
              ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
              : "rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 hover:text-foreground"
          }
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
