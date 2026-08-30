import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import {
  getPortfolioRollup,
  listCompanyRollups,
  listMemberAllocations,
  listMemberValuations,
} from "@/lib/dataconnect/client";
import { Scenario, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import { ScenarioScopeToggle } from "@/components/ScenarioScopeToggle";
import { CompanyRollupTable } from "@/components/CompanyRollupTable";

// Reads searchParams and the session cookie, so this is already dynamic — explicit for
// clarity (plan §4).
export const dynamic = "force-dynamic";

function parseScenario(value: string | string[] | undefined): ScenarioType {
  const v = Array.isArray(value) ? value[0] : value;
  return (SCENARIOS as readonly string[]).includes(v ?? "")
    ? (Scenario[(v as ScenarioParam).toUpperCase() as keyof typeof Scenario])
    : Scenario.BALANCED;
}

function parseScope(value: string | string[] | undefined): Scope {
  const v = Array.isArray(value) ? value[0] : value;
  return (SCOPES as readonly string[]).includes(v ?? "") ? (v as Scope) : "mine";
}

// Wireframe 3: ?scope=mine|asv&scenario=optimistic|balanced|conservative in the URL (plan §4).
export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scenario = parseScenario(params.scenario);
  const scope = parseScope(params.scope);

  const member = await getCurrentMember();
  if (!member) redirect("/login");

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <ScenarioScopeToggle />
      </div>

      {scope === "mine" ? (
        <MineView memberId={member.memberId} scenario={scenario} />
      ) : (
        <AsvView scenario={scenario} />
      )}
    </div>
  );
}

async function MineView({ memberId, scenario }: { memberId: string; scenario: ScenarioType }) {
  const [{ allocations }, { memberValuations }] = await Promise.all([
    listMemberAllocations({ memberId, scenario }),
    listMemberValuations({ memberId, scenario }),
  ]);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const totalValue = memberValuations.reduce((sum, v) => sum + v.value, 0);
  const moic = totalAllocated > 0 ? totalValue / totalAllocated : 0;

  const byCompany = new Map<string, { name: string; allocated: number; value: number }>();
  for (const a of allocations) {
    const key = a.ledgerEntry.company.id;
    const entry = byCompany.get(key) ?? { name: a.ledgerEntry.company.name, allocated: 0, value: 0 };
    entry.allocated += a.amount;
    byCompany.set(key, entry);
  }
  for (const v of memberValuations) {
    const key = v.ledgerEntry.company.id;
    const entry = byCompany.get(key) ?? { name: v.ledgerEntry.company.name, allocated: 0, value: 0 };
    entry.value += v.value;
    byCompany.set(key, entry);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total allocated" value={formatCurrencyCompact(totalAllocated)} />
        <StatTile label="Current value" value={formatCurrencyCompact(totalValue)} />
        <StatTile label="MOIC" value={formatMoic(moic)} />
      </div>

      <CompanyTable
        rows={[...byCompany.values()].sort((a, b) => b.value - a.value)}
        valueLabel="Current value"
      />
    </>
  );
}

async function AsvView({ scenario }: { scenario: ScenarioType }) {
  const [portfolio, { rollupCaches }] = await Promise.all([
    getPortfolioRollup({ scenario }),
    listCompanyRollups({ scenario }),
  ]);
  const totals = portfolio.rollupCaches[0];

  return (
    <>
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
    </>
  );
}

function CompanyTable({
  rows,
  valueLabel,
}: {
  rows: { name: string; allocated: number; value: number }[];
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No holdings for this scenario yet.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-2 font-medium">Company</th>
          <th className="py-2 text-right font-medium">Allocated</th>
          <th className="py-2 text-right font-medium">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">{r.name}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.allocated)}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
