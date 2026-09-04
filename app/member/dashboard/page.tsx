import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import {
  getPortfolioRollup,
  listAllocationsForScenario,
  listAppSettings,
  listCompanyRollups,
  listCompanyUpdatesForScenario,
  listComplianceFlagDetailsForScenario,
  listExitEventDetailsForScenario,
  listLedgerEntriesForScenario,
  listMemberAllocations,
  listMemberValuations,
  listNonParticipatingRoundDetailsForScenario,
  listPricedRoundDetailsForScenario,
  listSafeRoundDetailsForScenario,
  listValuationAssessmentDetailsForScenario,
} from "@/lib/dataconnect/client";
import { buildEventDetailIndex } from "@/lib/eventDetails";
import {
  CompanyHealth,
  LedgerEntryType,
  Scenario,
  type ListCompanyUpdatesForScenarioData,
  type Scenario as ScenarioType,
} from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, lockedScenarioSettingKeyForRole, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { ScenarioScopeToggle } from "@/components/ScenarioScopeToggle";
import { CompanyRollupTable, type CompanyRollupRow } from "@/components/CompanyRollupTable";
import { DownloadFullLedgerButton } from "@/components/DownloadFullLedgerButton";
import { PortfolioAiChat } from "@/components/PortfolioAiChat";
import { HealthMixDonut } from "@/components/HealthMixDonut";
import { SectorValueBars, type SectorValue } from "@/components/SectorValueBars";
import type { CompanyEventRow } from "@/components/CompanyEventsModal";

const INVESTMENT_ROUND_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PARTICIPATING_PRICED_ROUND,
  LedgerEntryType.PARTICIPATING_SAFE_ROUND,
  LedgerEntryType.NON_PARTICIPATING_ROUND,
]);

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

// Wireframe 3, merged with wireframe 2's portfolio charts (health mix, sector value) into
// the "All of ASV" scope: ?scope=mine|asv&scenario=optimistic|balanced|conservative in the
// URL (plan §4). The charts now follow the scenario toggle instead of being fixed to
// `balanced`.
export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = parseScope(params.scope);

  const member = await getCurrentMember();
  if (!member) redirect("/login");

  // Site-admin-controlled simplified view (app/admin/settings): a non-empty lockedScenario
  // overrides whatever ?scenario= the URL carries — enforced here, server-side, not just by
  // hiding the picker, since a member could otherwise still type the param into the URL. Which
  // setting applies depends on the VIEWER's own role tier — an admin/site-admin viewing their
  // own portfolio is bound by their own tier's lock, never the member tier's.
  const { appSettings } = await listAppSettings();
  const appSettingByKey = new Map(appSettings.map((s) => [s.key, s.value]));
  const aiChatEnabled = (appSettingByKey.get("member_ai_chat_enabled") ?? "true") === "true";
  const scenarioSettingKey = lockedScenarioSettingKeyForRole(member.role);
  const lockedScenario = (appSettingByKey.get(scenarioSettingKey) ?? "") as ScenarioParam | "";
  const scenario = lockedScenario ? Scenario[lockedScenario.toUpperCase() as keyof typeof Scenario] : parseScenario(params.scenario);

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <WelcomeBanner subtitle="Track and manage your ASV portfolio in one place." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <ScenarioScopeToggle lockedScenario={lockedScenario || undefined} />
      </div>

      <DownloadFullLedgerButton scenario={scenario.toLowerCase() as ScenarioParam} />

      {aiChatEnabled && <PortfolioAiChat key={scope} scope={scope} />}

      {scope === "mine" ? (
        <MineView authUid={member.authUid} scenario={scenario} />
      ) : (
        <AsvView scenario={scenario} />
      )}
    </div>
  );
}

// The 7 portfolio-wide, scenario-scoped queries behind health/investment-year/events are
// identical for both scopes ("mine" only narrows/re-derives from them afterward) — fetched
// once here rather than duplicated in MineView and AsvView.
interface PortfolioEventContext {
  healthByCompany: Map<string, CompanyHealth>;
  investmentYearByCompany: Map<string, number>;
  eventsByCompany: Map<string, CompanyEventRow[]>;
}

async function loadPortfolioEventContext(scenario: ScenarioType): Promise<PortfolioEventContext> {
  const [
    { companyUpdateDetails },
    { ledgerEntries },
    { pricedRoundDetails },
    { safeRoundDetails },
    { nonParticipatingRoundDetails },
    { exitEventDetails },
    { valuationAssessmentDetails },
    { complianceFlagDetails },
  ] = await Promise.all([
    listCompanyUpdatesForScenario({ scenario }),
    listLedgerEntriesForScenario({ scenario }),
    listPricedRoundDetailsForScenario({ scenario }),
    listSafeRoundDetailsForScenario({ scenario }),
    listNonParticipatingRoundDetailsForScenario({ scenario }),
    listExitEventDetailsForScenario({ scenario }),
    listValuationAssessmentDetailsForScenario({ scenario }),
    listComplianceFlagDetailsForScenario({ scenario }),
  ]);

  const healthByCompany = reduceLatestHealth(companyUpdateDetails);

  const detailByEntry = buildEventDetailIndex({
    companyUpdateDetails,
    pricedRoundDetails,
    safeRoundDetails,
    nonParticipatingRoundDetails,
    exitEventDetails,
    valuationAssessmentDetails,
    complianceFlagDetails,
  });

  // Investment year = earliest investment-round entry per company (portfolio-wide — the
  // "asv" scope's meaning); events = every ledger entry for that company, most recent first,
  // for the "Details" popup.
  const investmentYearByCompany = new Map<string, number>();
  const eventsByCompany = new Map<string, CompanyEventRow[]>();
  for (const entry of ledgerEntries) {
    const companyId = entry.company.id;
    const eventWithDetail: CompanyEventRow = { ...entry, detail: detailByEntry.get(entry.id) ?? [] };
    eventsByCompany.set(companyId, [...(eventsByCompany.get(companyId) ?? []), eventWithDetail]);

    if (INVESTMENT_ROUND_TYPES.has(entry.type)) {
      const year = Number(entry.eventDate.slice(0, 4));
      const existing = investmentYearByCompany.get(companyId);
      if (existing === undefined || year < existing) investmentYearByCompany.set(companyId, year);
    }
  }
  for (const events of eventsByCompany.values()) {
    events.sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));
  }

  // A held company with no CompanyUpdate yet (e.g. a recent investment with no news yet) has
  // no entry in healthByCompany at all — defaults it to GREEN ("no news is good news") rather
  // than being silently excluded from the health-mix chart/table.
  for (const companyId of investmentYearByCompany.keys()) {
    if (!healthByCompany.has(companyId)) {
      healthByCompany.set(companyId, CompanyHealth.GREEN);
    }
  }

  return { healthByCompany, investmentYearByCompany, eventsByCompany };
}

async function MineView({ authUid, scenario }: { authUid: string; scenario: ScenarioType }) {
  const [{ allocations }, { memberValuations }, context] = await Promise.all([
    listMemberAllocations(authUid, { scenario }),
    listMemberValuations(authUid, { scenario }),
    loadPortfolioEventContext(scenario),
  ]);
  const { healthByCompany, eventsByCompany } = context;

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  const byCompany = new Map<
    string,
    {
      name: string;
      sector: string | null;
      allocated: number;
      hasExited: boolean;
      realizedValue: number;
      latestValuationDate?: string;
      latestValuationValue?: number;
    }
  >();
  // Investment year is THIS member's own earliest allocation in the company — deliberately
  // not the portfolio-wide value from loadPortfolioEventContext, since a member may have
  // joined a company at a later round than ASV's first investment in it.
  const investmentYearByCompany = new Map<string, number>();
  for (const a of allocations) {
    const key = a.ledgerEntry.company.id;
    const entry = byCompany.get(key) ?? {
      name: a.ledgerEntry.company.tradeName ?? a.ledgerEntry.company.name,
      sector: a.ledgerEntry.company.sector ?? null,
      allocated: 0,
      hasExited: false,
      realizedValue: 0,
    };
    entry.allocated += a.amount;
    byCompany.set(key, entry);

    const year = Number(a.ledgerEntry.eventDate.slice(0, 4));
    const existingYear = investmentYearByCompany.get(key);
    if (existingYear === undefined || year < existingYear) investmentYearByCompany.set(key, year);
  }
  // Mirrors computeCompanyRollup's own logic (functions/src/lib/rollups.ts) rather than
  // summing every value row: each member_valuation is a point-in-time snapshot, not an
  // independent payment, so summing all of them (the previous bug here) double- or
  // triple-counts a company that's been re-valued more than once — and since scenarios get
  // re-valued at different times, that made Conservative appear to beat Balanced.
  for (const v of memberValuations) {
    const key = v.ledgerEntry.company.id;
    const entry = byCompany.get(key) ?? {
      name: v.ledgerEntry.company.tradeName ?? v.ledgerEntry.company.name,
      sector: v.ledgerEntry.company.sector ?? null,
      allocated: 0,
      hasExited: false,
      realizedValue: 0,
    };
    if (v.ledgerEntry.type === LedgerEntryType.EXIT_EVENT) {
      entry.hasExited = true;
      entry.realizedValue += v.value;
    } else if (!entry.latestValuationDate || v.ledgerEntry.eventDate > entry.latestValuationDate) {
      entry.latestValuationDate = v.ledgerEntry.eventDate;
      entry.latestValuationValue = v.value;
    }
    byCompany.set(key, entry);
  }

  let unrealizedValue = 0;
  let realizedValue = 0;
  const sectorTotals = new Map<string, number>();
  for (const c of byCompany.values()) {
    const companyUnrealized = c.hasExited ? 0 : (c.latestValuationValue ?? c.allocated);
    unrealizedValue += companyUnrealized;
    realizedValue += c.realizedValue;

    const sector = c.sector ?? "Uncategorized";
    sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + companyUnrealized + c.realizedValue);
  }
  const moic = totalAllocated > 0 ? (unrealizedValue + realizedValue) / totalAllocated : 0;
  const sectorData: SectorValue[] = [...sectorTotals.entries()]
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  // Health mix scoped to just the companies this member holds — same portfolio-wide
  // CompanyUpdate feed as the "All of ASV" scope, filtered down here.
  const myCompanyIds = new Set([...byCompany.keys()]);
  const healthCounts = healthCountsFromMap(
    new Map([...healthByCompany].filter(([companyId]) => myCompanyIds.has(companyId)))
  );

  // Same plain-object flattening as AsvView — CompanyRollupTable is a Client Component and
  // can't take Map instances as props.
  const companyRows: CompanyRollupRow[] = [...byCompany.entries()].map(([companyId, c]) => {
    const companyUnrealized = c.hasExited ? 0 : (c.latestValuationValue ?? c.allocated);
    const moicForCompany = c.allocated > 0 ? (companyUnrealized + c.realizedValue) / c.allocated : 0;
    return {
      companyKey: companyId,
      name: c.name,
      sector: c.sector,
      health: healthByCompany.get(companyId),
      investmentYear: investmentYearByCompany.get(companyId),
      invested: c.allocated,
      moic: moicForCompany,
      unrealizedValue: companyUnrealized,
      realizedValue: c.realizedValue,
      events: eventsByCompany.get(companyId) ?? [],
    };
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="MOIC" value={formatMoic(moic)} variant="green" />
        <StatTile label="Total invested" value={formatCurrencyCompact(totalAllocated)} variant="amber" />
        <StatTile label="Unrealized value" value={formatCurrencyCompact(unrealizedValue)} variant="violet" />
        <StatTile label="Realized value" value={formatCurrencyCompact(realizedValue)} variant="cream" />
      </div>

      <PortfolioCharts healthCounts={healthCounts} sectorData={sectorData} />

      <CompanyRollupTable rows={companyRows} />
    </>
  );
}

async function AsvView({ scenario }: { scenario: ScenarioType }) {
  const [portfolio, { rollupCaches }, { allocations }, context] = await Promise.all([
    getPortfolioRollup({ scenario }),
    listCompanyRollups({ scenario }),
    listAllocationsForScenario({ scenario }),
    loadPortfolioEventContext(scenario),
  ]);
  const { healthByCompany, investmentYearByCompany, eventsByCompany } = context;
  const totals = portfolio.rollupCaches[0];

  // Real invested-per-company totals — NOT reverse-derived from moic. That trick
  // (unrealized+realized)/moic breaks whenever moic is legitimately 0, which happens for a
  // total-loss write-off with real money invested, not just a company nobody put money into
  // (found via SafKan, Inc., which exited for $0 after a real $130K round).
  const investedByCompany = new Map<string, number>();
  for (const a of allocations) {
    const key = a.ledgerEntry.company.id;
    investedByCompany.set(key, (investedByCompany.get(key) ?? 0) + a.amount);
  }
  const totalInvested = [...investedByCompany.values()].reduce((sum, v) => sum + v, 0);

  const sectorTotals = new Map<string, number>();
  for (const row of rollupCaches) {
    if (!row.company) continue; // the portfolio-level row has no company
    const sector = row.company.sector ?? "Uncategorized";
    const value = row.unrealizedValue + row.realizedValue;
    sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + value);
  }
  const sectorData: SectorValue[] = [...sectorTotals.entries()]
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  const healthCounts = healthCountsFromMap(healthByCompany);

  // Flattened into plain objects (no Maps) here, since CompanyRollupTable is a Client
  // Component and Map instances can't cross that boundary as props.
  const companyRows: CompanyRollupRow[] = rollupCaches
    .filter((row) => row.company)
    .map((row) => {
      const companyId = row.company!.id;
      return {
        companyKey: row.companyKey,
        name: row.company!.tradeName ?? row.company!.name,
        sector: row.company!.sector ?? null,
        health: healthByCompany.get(companyId),
        investmentYear: investmentYearByCompany.get(companyId),
        invested: investedByCompany.get(companyId) ?? 0,
        moic: row.moic,
        unrealizedValue: row.unrealizedValue,
        realizedValue: row.realizedValue,
        events: eventsByCompany.get(companyId) ?? [],
      };
    });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="MOIC" value={totals ? formatMoic(totals.moic) : "—"} variant="green" />
        <StatTile label="Total invested" value={formatCurrencyCompact(totalInvested)} variant="amber" />
        <StatTile
          label="Unrealized value"
          value={totals ? formatCurrencyCompact(totals.unrealizedValue) : "—"}
          variant="violet"
        />
        <StatTile
          label="Realized value"
          value={totals ? formatCurrencyCompact(totals.realizedValue) : "—"}
          variant="cream"
        />
      </div>

      <PortfolioCharts healthCounts={healthCounts} sectorData={sectorData} />

      <CompanyRollupTable rows={companyRows} />
    </>
  );
}

// Latest CompanyUpdate per company for this scenario — reduced here rather than trusting
// Company.currentHealth, a single scenario-agnostic cache column that can't represent
// scenarios that legitimately disagree. `onlyCompanyIds` narrows to the mine-scope's holdings.
function reduceLatestHealth(
  companyUpdateDetails: ListCompanyUpdatesForScenarioData["companyUpdateDetails"],
  onlyCompanyIds?: Set<string>
): Map<string, CompanyHealth> {
  const latestByCompany = new Map<string, { eventDate: string; health: CompanyHealth }>();
  for (const row of companyUpdateDetails) {
    const companyId = row.ledgerEntry.company.id;
    if (onlyCompanyIds && !onlyCompanyIds.has(companyId)) continue;
    const existing = latestByCompany.get(companyId);
    if (!existing || row.ledgerEntry.eventDate > existing.eventDate) {
      latestByCompany.set(companyId, { eventDate: row.ledgerEntry.eventDate, health: row.health });
    }
  }
  const healthByCompany = new Map<string, CompanyHealth>();
  for (const [companyId, { health }] of latestByCompany) {
    healthByCompany.set(companyId, health);
  }
  return healthByCompany;
}

function healthCountsFromMap(healthByCompany: Map<string, CompanyHealth>): Record<CompanyHealth, number> {
  const healthCounts: Record<CompanyHealth, number> = {
    [CompanyHealth.GREEN]: 0,
    [CompanyHealth.YELLOW]: 0,
    [CompanyHealth.RED]: 0,
  };
  for (const health of healthByCompany.values()) {
    healthCounts[health] += 1;
  }
  return healthCounts;
}

function PortfolioCharts({
  healthCounts,
  sectorData,
}: {
  healthCounts: Record<CompanyHealth, number>;
  sectorData: SectorValue[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Company health mix</h2>
        <HealthMixDonut counts={healthCounts} />
      </section>
      <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Value by sector</h2>
        <SectorValueBars data={sectorData} />
      </section>
    </div>
  );
}
