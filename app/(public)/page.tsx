import { listCompanies, listCompanyRollups, listMemberProfiles } from "@/lib/dataconnect/client";
import { Scenario } from "@/lib/dataconnect/generated";
import { LandingTabs } from "@/components/LandingTabs";

// Live portfolio/member data, not a build-time snapshot — no SWR/caching layer at V1 scale
// (plan §4), so render fresh on every request rather than baking a stale prerender.
export const dynamic = "force-dynamic";

// Best-performing, sector-diverse companies for the Welcome tab's teaser — computed here
// (server component, admin-trusted Data Connect client) from MOIC, which is financial data
// that must never reach the public bundle. Only the resulting company IDs are passed down;
// the actual MOIC numbers never leave this function. "Performing poorly" (moic <= 1, i.e. at
// or below cost) is excluded entirely, not just deprioritized.
//
// Matches on r.company.id, NOT r.companyKey — companyKey is a plain text column that stores
// Company.id formatted with dashes (set via raw `pg` in rollups.ts), while Data Connect's UUID
// scalar (both here via the company relation and in ListCompanies) serializes WITHOUT dashes.
// The two never string-match, so companyKey looks plausible but silently fails every lookup.
function pickFeaturedCompanyIds(rollups: { moic: number; company?: { id: string; sector?: string | null } | null }[]): string[] {
  const bestPerSector = new Map<string, { id: string; moic: number }>();
  for (const r of rollups) {
    const sector = r.company?.sector;
    if (!r.company || !sector || r.moic <= 1) continue;
    const current = bestPerSector.get(sector);
    if (!current || r.moic > current.moic) {
      bestPerSector.set(sector, { id: r.company.id, moic: r.moic });
    }
  }
  return [...bestPerSector.values()]
    .sort((a, b) => b.moic - a.moic)
    .slice(0, 4)
    .map((c) => c.id);
}

// Wireframe 1: Welcome / Board & Member profiles / Portfolio companies tabs. Portfolio
// companies deliberately selects only name+sector (ListCompanies never touches financial
// fields), so nothing sensitive reaches this unauthenticated bundle (plan §4). Pitch link is
// omitted entirely for V1, not just greyed out.
export default async function LandingPage() {
  const [{ members }, { companies }, { rollupCaches }] = await Promise.all([
    listMemberProfiles(),
    listCompanies(),
    listCompanyRollups({ scenario: Scenario.BALANCED }),
  ]);
  const featuredCompanyIds = pickFeaturedCompanyIds(rollupCaches);

  return <LandingTabs members={members} companies={companies} featuredCompanyIds={featuredCompanyIds} />;
}
