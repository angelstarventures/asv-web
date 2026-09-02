"use client";

import { useState } from "react";
import Image from "next/image";
import type { ListCompaniesData, ListMemberProfilesData } from "@/lib/dataconnect/generated";
import { LoginModal } from "@/components/LoginModal";
import { MemberProfileGrid } from "@/components/MemberProfileGrid";
import { CompanyLogoGrid } from "@/components/CompanyLogoGrid";
import { WelcomeSection } from "@/components/WelcomeSection";

const TABS = ["welcome", "profiles", "companies"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  welcome: "Welcome",
  profiles: "Our Team",
  companies: "Portfolio",
};

// Header bar mirrors AppHeader's layout (logo + tabs on the left, primary action on the
// right) so the signed-out and signed-in shells feel like the same app.
export function LandingTabs({
  members,
  companies,
  featuredCompanyIds,
}: {
  members: ListMemberProfilesData["members"];
  companies: ListCompaniesData["companies"];
  featuredCompanyIds: string[];
}) {
  const [tab, setTab] = useState<Tab>("welcome");

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-6">
        <div className="flex items-center gap-8">
          <span className="rounded-md">
            <Image src="/asv-logo.png" alt="Angel Star Ventures" width={157} height={36} priority />
          </span>
          <nav className="flex gap-1 rounded-full border border-zinc-200 bg-card p-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={
                  tab === t
                    ? "rounded-full bg-foreground px-5 py-2.5 text-base font-semibold text-background"
                    : "rounded-full px-5 py-2.5 text-base font-medium text-zinc-600 hover:text-foreground"
                }
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>
        <LoginModal />
      </header>

      <div className="flex flex-1 justify-center px-6 py-12">
        <div className="w-full max-w-5xl">
          {tab === "welcome" && <WelcomeSection companies={companies} featuredCompanyIds={featuredCompanyIds} />}

          {tab === "profiles" && <MemberProfileGrid members={members} />}

          {tab === "companies" && <CompanyLogoGrid companies={companies} />}
        </div>
      </div>
    </div>
  );
}
