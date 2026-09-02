"use client";

import { useState } from "react";
import type { ListCompaniesData, ListMemberProfilesData } from "@/lib/dataconnect/generated";
import { LandingHeader } from "@/components/LandingHeader";
import { MemberProfileGrid } from "@/components/MemberProfileGrid";
import { CompanyLogoGrid } from "@/components/CompanyLogoGrid";
import { WelcomeSection } from "@/components/WelcomeSection";

type Tab = "welcome" | "profiles" | "companies";

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
      <LandingHeader active={tab} onSelectHomeTab={setTab} />

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
