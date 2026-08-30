import {
  getPortfolioRollup,
  listCompanyRollups,
  listCompanyUpdatesForScenario,
} from "@/lib/dataconnect/client";
import { CompanyHealth, Scenario } from "@/lib/dataconnect/generated";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import { HealthMixDonut } from "@/components/HealthMixDonut";
import { SectorValueBars, type SectorValue } from "@/components/SectorValueBars";

// Live rollup data — render fresh per request rather than a build-time snapshot (plan §4).
export const dynamic = "force-dynamic";

// Wireframe 2: shown to member and admin alike, fixed to the `balanced` scenario — no
// toggle on this page (plan §4).
export default async function MemberOverviewPage() {
  const [portfolio, companyRollups, companyUpdates] = await Promise.all([
    getPortfolioRollup({ scenario: Scenario.BALANCED }),
    listCompanyRollups({ scenario: Scenario.BALANCED }),
    listCompanyUpdatesForScenario({ scenario: Scenario.BALANCED }),
  ]);

  const totals = portfolio.rollupCaches[0];

  const sectorTotals = new Map<string, number>();
  for (const row of companyRollups.rollupCaches) {
    if (!row.company) continue; // the portfolio-level row has no company
    const sector = row.company.sector ?? "Uncategorized";
    const value = row.unrealizedValue + row.realizedValue;
    sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + value);
  }
  const sectorData: SectorValue[] = [...sectorTotals.entries()]
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  // Latest CompanyUpdate per company for this scenario — reduced here rather than trusting
  // Company.currentHealth, a single scenario-agnostic cache column that can't represent
  // scenarios that legitimately disagree.
  const latestByCompany = new Map<string, { eventDate: string; health: CompanyHealth }>();
  for (const row of companyUpdates.companyUpdateDetails) {
    const companyId = row.ledgerEntry.company.id;
    const existing = latestByCompany.get(companyId);
    if (!existing || row.ledgerEntry.eventDate > existing.eventDate) {
      latestByCompany.set(companyId, { eventDate: row.ledgerEntry.eventDate, health: row.health });
    }
  }
  const healthCounts: Record<CompanyHealth, number> = {
    [CompanyHealth.GREEN]: 0,
    [CompanyHealth.YELLOW]: 0,
    [CompanyHealth.RED]: 0,
  };
  for (const { health } of latestByCompany.values()) {
    healthCounts[health] += 1;
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Portfolio overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="MOIC" value={totals ? formatMoic(totals.moic) : "—"} />
        <StatTile
          label="Unrealized value"
          value={totals ? formatCurrencyCompact(totals.unrealizedValue) : "—"}
        />
        <StatTile
          label="Realized value"
          value={totals ? formatCurrencyCompact(totals.realizedValue) : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Company health mix</h2>
          <HealthMixDonut counts={healthCounts} />
        </section>
        <section>
          <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Value by sector</h2>
          <SectorValueBars data={sectorData} />
        </section>
      </div>
    </div>
  );
}
