import { getPortfolioRollup, listCompanyRollups } from "@/lib/dataconnect/client";
import { Scenario } from "@/lib/dataconnect/generated";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import { CompanyRollupTable } from "@/components/CompanyRollupTable";

// Wireframe 5 (minus ledger actions, which land in Milestone 4): reuses the same stat tiles
// and per-company table as the member dashboard's `asv` scope (plan §4), fixed to the
// `balanced` scenario like the member overview page — no toggle called for by this wireframe.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [portfolio, { rollupCaches }] = await Promise.all([
    getPortfolioRollup({ scenario: Scenario.BALANCED }),
    listCompanyRollups({ scenario: Scenario.BALANCED }),
  ]);
  const totals = portfolio.rollupCaches[0];

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Admin dashboard</h1>

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

      <CompanyRollupTable rows={rollupCaches} />
    </div>
  );
}
