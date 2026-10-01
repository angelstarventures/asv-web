import {
  getCompanyById,
  getPortfolioRollup,
  listAllocationsForScenario,
  listCompanyRollups,
  listCompanyUpdatesForScenario,
  listExitEventDetailsForScenario,
  listLedgerEntriesForScenario,
  listMemberAllocations,
  listMemberValuations,
  listNonParticipatingRoundDetailsForScenario,
  listPricedRoundDetailsForScenario,
  listSafeRoundDetailsForScenario,
} from "@/lib/dataconnect/client";
import {
  CompanyHealth,
  CompanyStatus,
  CompanyTrajectory,
  LedgerEntryType,
  type ListCompanyUpdatesForScenarioData,
  type Scenario as ScenarioType,
} from "@/lib/dataconnect/generated";
import { type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { xirr, type CashFlow } from "@/lib/xirr";
import { loadAsvReportsData, loadMineReportsData } from "@/lib/reportsData";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import { ScenarioScopeToggle } from "@/components/ScenarioScopeToggle";
import { PortfolioTabs } from "@/components/PortfolioTabs";
import type { PortfolioTab } from "@/lib/portfolioTab";
import { CompanyRollupTable, type CompanyRollupRow } from "@/components/CompanyRollupTable";
import { DownloadFullLedgerButton } from "@/components/DownloadFullLedgerButton";
import { PortfolioAiChat } from "@/components/PortfolioAiChat";
import { HealthMixDonut } from "@/components/HealthMixDonut";
import { SectorValueBars, type SectorValue } from "@/components/SectorValueBars";
import { ExitsTable, type ExitRow } from "@/components/ExitsTable";
import { WriteOffsTable, type WriteOffRow } from "@/components/WriteOffsTable";
import { ReportPanel } from "@/components/charts/ReportPanel";
import { HealthByYearPanel } from "@/components/charts/HealthByYearPanel";
import { NewVsFollowOnPanel } from "@/components/charts/NewVsFollowOnPanel";

// Exported for lib/reportsData.ts's new-vs-follow-on and by-year breakdowns — same definition
// of "an investment round" used everywhere else in this app.
export const INVESTMENT_ROUND_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PARTICIPATING_PRICED_ROUND,
  LedgerEntryType.PARTICIPATING_SAFE_ROUND,
  LedgerEntryType.NON_PARTICIPATING_ROUND,
]);

// Shared by /member/dashboard (the viewer's own portfolio) and /admin/portfolios (a site-admin
// in root mode viewing another member's portfolio, same rendering, different authUid passed to
// the underlying impersonated queries — see lib/dataconnect/client.ts's impersonate() helper,
// which already supports fetching any authUid's data from trusted server code, not just the
// real caller's own). Reorganized into 4 sub-tabs (Overview/Details/Exits & Write-offs/Reports),
// all sharing the one header row (title + scope/scenario toggle) and tab nav above them.
export async function PortfolioView({
  authUid,
  scope,
  scenario,
  lockedScenario,
  aiChatEnabled,
  tab,
  detailHrefBase,
  detailExtraQuery,
}: {
  authUid: string;
  scope: Scope;
  scenario: ScenarioType;
  lockedScenario: ScenarioParam | "";
  aiChatEnabled: boolean;
  tab: PortfolioTab;
  detailHrefBase: string;
  detailExtraQuery?: string;
}) {
  const data = scope === "mine" ? await loadMinePortfolioData(authUid, scenario) : await loadAsvPortfolioData(scenario);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PortfolioTabs active={tab} />
        <ScenarioScopeToggle lockedScenario={lockedScenario || undefined} />
      </div>

      {tab === "overview" && <OverviewTab data={data} scope={scope} aiChatEnabled={aiChatEnabled} />}
      {tab === "details" && (
        <DetailsTab
          data={data}
          scenario={scenario}
          scope={scope}
          detailHrefBase={detailHrefBase}
          detailExtraQuery={detailExtraQuery}
        />
      )}
      {tab === "exits" && (
        <ExitsWriteOffsTab
          data={data}
          scenario={scenario}
          scope={scope}
          detailHrefBase={detailHrefBase}
          detailExtraQuery={detailExtraQuery}
        />
      )}
      {tab === "reports" && <ReportsTab scope={scope} authUid={authUid} scenario={scenario} />}
    </>
  );
}

// Unified shape both scopes' loaders produce — one fetch per page load (only one tab's JSX
// actually renders, but all 4 tabs' worth of data comes from the same underlying
// company-level aggregation, so computing it once here avoids duplicating that aggregation
// per tab). Reports is the one exception (lib/reportsData.ts's own, separate loaders) since
// it pulls a materially different, larger data set not needed by the other 3 tabs.
interface PortfolioData {
  moic: number | null;
  irr: number | null;
  totalInvested: number;
  unrealizedValue: number;
  realizedValue: number;
  activeCount: number;
  exitedCount: number;
  writtenOffCount: number;
  healthCounts: Record<CompanyHealth, number>;
  sectorData: SectorValue[];
  companyRows: CompanyRollupRow[];
  exitRows: ExitRow[];
  writeOffRows: WriteOffRow[];
}

// The portfolio-wide, scenario-scoped queries behind health/investment-year/exits are
// identical for both scopes ("mine" only narrows/re-derives from them afterward) — fetched
// once here rather than duplicated in the mine/asv loaders.
interface PortfolioEventContext {
  healthByCompany: Map<string, CompanyHealth>;
  investmentYearByCompany: Map<string, number>;
  exitEventRows: ExitEventRow[];
}

interface ExitEventRow {
  companyId: string;
  companyName: string;
  sector: string | null;
  eventDate: string;
  exitType: string;
  totalExitValue: number;
  asvTotalPayout: number;
}

async function loadPortfolioEventContext(scenario: ScenarioType): Promise<PortfolioEventContext> {
  const [{ companyUpdateDetails }, { ledgerEntries }, { exitEventDetails }] = await Promise.all([
    listCompanyUpdatesForScenario({ scenario }),
    listLedgerEntriesForScenario({ scenario }),
    listExitEventDetailsForScenario({ scenario }),
  ]);

  const healthByCompany = reduceLatestHealth(companyUpdateDetails);

  // Investment year = earliest investment-round entry per company (portfolio-wide — the
  // "asv" scope's meaning). exitEventRows = every EXIT_EVENT entry joined with its
  // ExitEventDetail, for the Exits & Write-offs tab's Exits table.
  const investmentYearByCompany = new Map<string, number>();
  const exitDetailByEntryId = new Map(exitEventDetails.map((d) => [d.ledgerEntry.id, d]));
  const exitEventRows: ExitEventRow[] = [];
  for (const entry of ledgerEntries) {
    const companyId = entry.company.id;

    if (INVESTMENT_ROUND_TYPES.has(entry.type)) {
      const year = Number(entry.eventDate.slice(0, 4));
      const existing = investmentYearByCompany.get(companyId);
      if (existing === undefined || year < existing) investmentYearByCompany.set(companyId, year);
    }

    if (entry.type === LedgerEntryType.EXIT_EVENT) {
      const detail = exitDetailByEntryId.get(entry.id);
      if (detail) {
        exitEventRows.push({
          companyId,
          companyName: entry.company.tradeName ?? entry.company.name,
          sector: entry.company.sector ?? null,
          eventDate: entry.eventDate,
          exitType: detail.exitType,
          totalExitValue: detail.totalExitValue,
          asvTotalPayout: detail.asvTotalPayout,
        });
      }
    }
  }

  // A held company with no CompanyUpdate yet (e.g. a recent investment with no news yet) has
  // no entry in healthByCompany at all — defaults it to GREEN ("no news is good news") rather
  // than being silently excluded from the health-mix chart/table.
  for (const companyId of investmentYearByCompany.keys()) {
    if (!healthByCompany.has(companyId)) {
      healthByCompany.set(companyId, CompanyHealth.GREEN);
    }
  }

  return { healthByCompany, investmentYearByCompany, exitEventRows };
}

export interface CompanyDetailRound {
  ledgerEntryId: string;
  date: string;
  roundName: string;
  roundType: LedgerEntryType;
  amountRaised: number | null;
  valuationLabel: string;
  valuation: number;
  discount: number | null;
  notes: string | null;
  asvInvested: number;
  yourInvested?: number;
  yourApproxValue?: number;
  driveFolderId: string | null;        // Drive folder ID for this round's documents
}

export interface CompanyDetailUpdate {
  id: string;
  eventDate: string;
  health: CompanyHealth;
  trajectory: CompanyTrajectory;
  highlights: string[];
  lowlights: string[];
  upcomingPlans: string[];
  driveFileId: string | null;          // Drive file ID for this update's document
  driveUrl: string | null;             // Drive web link to the update document
}

export interface CompanyDetail {
  id: string;
  name: string;
  tagline: string | null;
  sector: string | null;
  website: string | null;
  logoUrl: string | null;
  status: CompanyStatus;
  ceoName: string | null;
  ceoContact: string | null;
  health: CompanyHealth | undefined;
  invested: number;
  unrealizedValue: number;
  realizedValue: number;
  moic: number;
  rounds: CompanyDetailRound[];
  updates: CompanyDetailUpdate[];
}

// Backs the dedicated company-detail page (app/member/dashboard/companies/[companyKey] and
// app/admin/portfolios/companies/[companyKey]) — replaces the old flat event-history page.
// Financials/health are pulled straight from the same per-company rows the Details tab's table
// already computes (loadMinePortfolioData/loadAsvPortfolioData), rather than re-deriving that
// math a third time. Rounds/Updates are joined here from the underlying scenario-wide lists,
// same "fetch all, filter/join in TS" shape as loadPortfolioEventContext.
export async function getCompanyDetail(
  scenario: ScenarioType,
  companyKey: string,
  scope: Scope,
  authUid?: string
): Promise<CompanyDetail | null> {
  const [
    { company },
    portfolioData,
    { ledgerEntries },
    { pricedRoundDetails },
    { safeRoundDetails },
    { nonParticipatingRoundDetails },
    { allocations },
    memberAllocations,
    { companyUpdateDetails },
  ] = await Promise.all([
    getCompanyById({ id: companyKey }),
    scope === "mine" && authUid ? loadMinePortfolioData(authUid, scenario) : loadAsvPortfolioData(scenario),
    listLedgerEntriesForScenario({ scenario }),
    listPricedRoundDetailsForScenario({ scenario }),
    listSafeRoundDetailsForScenario({ scenario }),
    listNonParticipatingRoundDetailsForScenario({ scenario }),
    listAllocationsForScenario({ scenario }),
    scope === "mine" && authUid ? listMemberAllocations(authUid, { scenario }) : Promise.resolve(null),
    listCompanyUpdatesForScenario({ scenario }),
  ]);

  if (!company) return null;

  const companyRow = portfolioData.companyRows.find((r) => r.companyKey === companyKey);

  const pricedByEntry = new Map(pricedRoundDetails.map((d) => [d.ledgerEntry.id, d]));
  const safeByEntry = new Map(safeRoundDetails.map((d) => [d.ledgerEntry.id, d]));
  const nonPartByEntry = new Map(nonParticipatingRoundDetails.map((d) => [d.ledgerEntry.id, d]));

  const asvByEntry = new Map<string, number>();
  for (const a of allocations) {
    asvByEntry.set(a.ledgerEntry.id, (asvByEntry.get(a.ledgerEntry.id) ?? 0) + a.amount);
  }
  const yourByEntry = new Map<string, number>();
  if (memberAllocations) {
    for (const a of memberAllocations.allocations) {
      yourByEntry.set(a.ledgerEntry.id, (yourByEntry.get(a.ledgerEntry.id) ?? 0) + a.amount);
    }
  }

  const rounds: CompanyDetailRound[] = ledgerEntries
    .filter((e) => e.company.id === companyKey && INVESTMENT_ROUND_TYPES.has(e.type))
    .map((e) => {
      const priced = pricedByEntry.get(e.id);
      const safe = safeByEntry.get(e.id);
      const nonPart = nonPartByEntry.get(e.id);
      const roundName = priced?.roundName ?? safe?.roundName ?? nonPart?.roundName ?? "SAFE";
      const amountRaised = priced?.totalRoundSize ?? safe?.totalRoundSize ?? nonPart?.totalRoundSize ?? null;
      // SAFE terms are a valuation CAP (not a firm valuation) plus a discount — a priced round
      // or a non-participating round's re-mark both have a firm post-money valuation instead.
      const valuationLabel = safe ? "Valuation cap" : "Valuation";
      const valuation = priced?.postMoneyValuation ?? safe?.postMoneyValCap ?? nonPart?.newPostMoneyValuation ?? 0;
      const discount = safe?.discount ?? null;
      const notes = safe?.notes ?? nonPart?.notes ?? null;
      const asvInvested = asvByEntry.get(e.id) ?? 0;
      const round: CompanyDetailRound = {
        ledgerEntryId: e.id,
        date: e.eventDate,
        roundName,
        roundType: e.type,
        amountRaised,
        valuationLabel,
        valuation,
        discount,
        notes,
        asvInvested,
        driveFolderId: priced?.driveFolderId ?? safe?.driveFolderId ?? nonPart?.driveFolderId ?? null,
      };
      // "Your value post-raise" is an approximation — there's no true per-round-per-member
      // valuation history, so this scales your dollars into that round by the company's
      // CURRENT overall MOIC rather than a round-specific one.
      if (scope === "mine") {
        const yourInvested = yourByEntry.get(e.id);
        if (yourInvested != null) {
          round.yourInvested = yourInvested;
          round.yourApproxValue = companyRow ? yourInvested * companyRow.moic : undefined;
        }
      }
      return round;
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const updates: CompanyDetailUpdate[] = companyUpdateDetails
    .filter((u) => u.ledgerEntry.company.id === companyKey)
    .map((u) => ({
      id: u.ledgerEntry.id,
      eventDate: u.ledgerEntry.eventDate,
      health: u.health,
      trajectory: u.trajectory,
      highlights: u.highlights,
      lowlights: u.lowlights,
      upcomingPlans: u.upcomingPlans,
      driveFileId: u.driveFileId ?? null,
      driveUrl: u.driveUrl ?? null,
    }))
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));

  return {
    id: company.id,
    name: company.tradeName ?? company.name,
    tagline: company.tagline ?? null,
    sector: company.sector ?? null,
    website: company.website ?? null,
    logoUrl: company.logoUrl ?? null,
    status: company.status,
    ceoName: company.ceoName ?? null,
    ceoContact: company.ceoContact ?? null,
    health: companyRow?.health,
    invested: companyRow?.invested ?? 0,
    unrealizedValue: companyRow?.unrealizedValue ?? 0,
    realizedValue: companyRow?.realizedValue ?? 0,
    moic: companyRow?.moic ?? 0,
    rounds,
    updates,
  };
}

async function loadMinePortfolioData(authUid: string, scenario: ScenarioType): Promise<PortfolioData> {
  const [{ allocations }, { memberValuations }, context] = await Promise.all([
    listMemberAllocations(authUid, { scenario }),
    listMemberValuations(authUid, { scenario }),
    loadPortfolioEventContext(scenario),
  ]);
  const { healthByCompany, exitEventRows } = context;

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  const byCompany = new Map<
    string,
    {
      name: string;
      sector: string | null;
      status: CompanyStatus;
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
  // Dated cash flows for this member's own mark-to-market IRR — capital calls (negative) plus,
  // separately below, any realized distributions (positive) and the terminal unrealized value.
  const cashFlows: CashFlow[] = [];
  for (const a of allocations) {
    const key = a.ledgerEntry.company.id;
    const entry = byCompany.get(key) ?? {
      name: a.ledgerEntry.company.tradeName ?? a.ledgerEntry.company.name,
      sector: a.ledgerEntry.company.sector ?? null,
      status: a.ledgerEntry.company.status,
      allocated: 0,
      hasExited: false,
      realizedValue: 0,
    };
    entry.allocated += a.amount;
    byCompany.set(key, entry);

    const year = Number(a.ledgerEntry.eventDate.slice(0, 4));
    const existingYear = investmentYearByCompany.get(key);
    if (existingYear === undefined || year < existingYear) investmentYearByCompany.set(key, year);

    cashFlows.push({ date: new Date(a.ledgerEntry.eventDate), amount: -a.amount });
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
      status: v.ledgerEntry.company.status,
      allocated: 0,
      hasExited: false,
      realizedValue: 0,
    };
    if (v.ledgerEntry.type === LedgerEntryType.EXIT_EVENT) {
      entry.hasExited = true;
      entry.realizedValue += v.value;
      cashFlows.push({ date: new Date(v.ledgerEntry.eventDate), amount: v.value });
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
  cashFlows.push({ date: new Date(), amount: unrealizedValue });
  const irr = xirr(cashFlows);
  const sectorData: SectorValue[] = [...sectorTotals.entries()]
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  // Health mix scoped to just the companies this member holds — same portfolio-wide
  // CompanyUpdate feed as the "All of ASV" scope, filtered down here.
  const myCompanyIds = new Set([...byCompany.keys()]);
  const healthCounts = healthCountsFromMap(
    new Map([...healthByCompany].filter(([companyId]) => myCompanyIds.has(companyId)))
  );

  // A WRITTEN_OFF company always has a SHUTDOWN/DISSOLUTION Exit_Event behind it
  // (updateCompanyStatusForExit is the only path that sets this status) — reuse the same
  // portfolio-wide exitEventRows this file already fetches for the Exits table, just keyed by
  // company instead of filtered to EXITED.
  const writeOffDateByCompany = new Map(exitEventRows.map((e) => [e.companyId, e.eventDate]));

  let activeCount = 0;
  let exitedCount = 0;
  let writtenOffCount = 0;
  const writeOffRows: WriteOffRow[] = [];
  for (const [companyId, c] of byCompany) {
    if (c.status === CompanyStatus.ACTIVE) activeCount++;
    else if (c.status === CompanyStatus.EXITED) exitedCount++;
    else if (c.status === CompanyStatus.WRITTEN_OFF) {
      writtenOffCount++;
      writeOffRows.push({
        companyKey: companyId,
        name: c.name,
        sector: c.sector,
        invested: c.allocated,
        writeOffDate: writeOffDateByCompany.get(companyId) ?? null,
      });
    }
  }
  // Filtered to Company.status === EXITED, not just "has an EXIT_EVENT ledger row" — a
  // shutdown/write-off can also carry an EXIT_EVENT entry (e.g. a $0-payout SHUTDOWN), but
  // Company.status is the authoritative split between a real exit and a write-off; without
  // this filter a write-off company would wrongly show up in both tables.
  const exitRows: ExitRow[] = exitEventRows
    .filter((e) => byCompany.get(e.companyId)?.status === CompanyStatus.EXITED)
    .map((e) => {
      const invested = byCompany.get(e.companyId)?.allocated ?? 0;
      return {
        companyKey: e.companyId,
        name: e.companyName,
        sector: e.sector,
        exitType: e.exitType,
        exitDate: e.eventDate,
        totalExitValue: e.totalExitValue,
        asvPayout: e.asvTotalPayout,
        moicAtExit: invested > 0 ? e.asvTotalPayout / invested : null,
      };
    });

  // Same plain-object flattening as the asv loader — CompanyRollupTable is a Client Component
  // and can't take Map instances as props.
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
    };
  });

  return {
    moic,
    irr,
    totalInvested: totalAllocated,
    unrealizedValue,
    realizedValue,
    activeCount,
    exitedCount,
    writtenOffCount,
    healthCounts,
    sectorData,
    companyRows,
    exitRows,
    writeOffRows,
  };
}

async function loadAsvPortfolioData(scenario: ScenarioType): Promise<PortfolioData> {
  const [portfolio, { rollupCaches }, { allocations }, context] = await Promise.all([
    getPortfolioRollup({ scenario }),
    listCompanyRollups({ scenario }),
    listAllocationsForScenario({ scenario }),
    loadPortfolioEventContext(scenario),
  ]);
  const { healthByCompany, investmentYearByCompany, exitEventRows } = context;
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

  // See the equivalent comment in loadMinePortfolioData — every WRITTEN_OFF company has a
  // SHUTDOWN/DISSOLUTION Exit_Event behind it.
  const writeOffDateByCompany = new Map(exitEventRows.map((e) => [e.companyId, e.eventDate]));

  const sectorTotals = new Map<string, number>();
  let activeCount = 0;
  let exitedCount = 0;
  let writtenOffCount = 0;
  const exitedCompanyIds = new Set<string>();
  const writeOffRows: WriteOffRow[] = [];
  for (const row of rollupCaches) {
    if (!row.company) continue; // the portfolio-level row has no company
    const sector = row.company.sector ?? "Uncategorized";
    const value = row.unrealizedValue + row.realizedValue;
    sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + value);

    if (row.company.status === CompanyStatus.ACTIVE) activeCount++;
    else if (row.company.status === CompanyStatus.EXITED) {
      exitedCount++;
      exitedCompanyIds.add(row.company.id);
    } else if (row.company.status === CompanyStatus.WRITTEN_OFF) {
      writtenOffCount++;
      writeOffRows.push({
        companyKey: row.company.id,
        name: row.company.tradeName ?? row.company.name,
        sector: row.company.sector ?? null,
        invested: investedByCompany.get(row.company.id) ?? 0,
        writeOffDate: writeOffDateByCompany.get(row.company.id) ?? null,
      });
    }
  }
  const sectorData: SectorValue[] = [...sectorTotals.entries()]
    .map(([sector, value]) => ({ sector, value }))
    .sort((a, b) => b.value - a.value);

  // Filtered to Company.status === EXITED — see the equivalent comment in the "mine" loader
  // for why an EXIT_EVENT ledger row alone (e.g. a $0-payout SHUTDOWN) isn't enough.
  const exitRows: ExitRow[] = exitEventRows
    .filter((e) => exitedCompanyIds.has(e.companyId))
    .map((e) => {
      const invested = investedByCompany.get(e.companyId) ?? 0;
      return {
        companyKey: e.companyId,
        name: e.companyName,
        sector: e.sector,
        exitType: e.exitType,
        exitDate: e.eventDate,
        totalExitValue: e.totalExitValue,
        asvPayout: e.asvTotalPayout,
        moicAtExit: invested > 0 ? e.asvTotalPayout / invested : null,
      };
    });

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
      };
    });

  return {
    moic: totals ? totals.moic : null,
    irr: totals ? totals.irr ?? null : null,
    totalInvested,
    unrealizedValue: totals ? totals.unrealizedValue : 0,
    realizedValue: totals ? totals.realizedValue : 0,
    activeCount,
    exitedCount,
    writtenOffCount,
    healthCounts,
    sectorData,
    companyRows,
    exitRows,
    writeOffRows,
  };
}

// Latest CompanyUpdate per company for this scenario — reduced here rather than trusting
// Company.currentHealth, a single scenario-agnostic cache column that can't represent
// scenarios that legitimately disagree.
function reduceLatestHealth(
  companyUpdateDetails: ListCompanyUpdatesForScenarioData["companyUpdateDetails"]
): Map<string, CompanyHealth> {
  const latestByCompany = new Map<string, { eventDate: string; health: CompanyHealth }>();
  for (const row of companyUpdateDetails) {
    const companyId = row.ledgerEntry.company.id;
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

function OverviewTab({ data, scope, aiChatEnabled }: { data: PortfolioData; scope: Scope; aiChatEnabled: boolean }) {
  const netGainLoss = data.unrealizedValue + data.realizedValue - data.totalInvested;
  return (
    <>
      {aiChatEnabled && <PortfolioAiChat key={scope} scope={scope} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="Total invested" value={formatCurrencyCompact(data.totalInvested)} variant="amber" />
        <StatTile label="Unrealized value" value={formatCurrencyCompact(data.unrealizedValue)} variant="violet" />
        <StatTile label="Total Returned" value={formatCurrencyCompact(data.realizedValue)} variant="cream" />
        <StatTile
          label="Net gain/loss"
          value={`${netGainLoss >= 0 ? "+" : ""}${formatCurrencyCompact(netGainLoss)}`}
          variant={netGainLoss >= 0 ? "green" : "cream"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="MOIC" value={data.moic != null ? formatMoic(data.moic) : "—"} variant="green" />
        <StatTile label="%IRR" value={data.irr != null ? `${(data.irr * 100).toFixed(1)}%` : "—"} variant="amber" />
        <StatTile label="Active companies" value={String(data.activeCount)} variant="violet" />
        <StatTile label="Exits & write-offs" value={`${data.exitedCount} exits · ${data.writtenOffCount} write-offs`} variant="cream" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
          <h2 className="mb-4 text-sm font-medium text-zinc-500">Company health mix</h2>
          <HealthMixDonut counts={data.healthCounts} />
        </section>
        <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
          <h2 className="mb-4 text-sm font-medium text-zinc-500">Value by sector</h2>
          <SectorValueBars data={data.sectorData} />
        </section>
      </div>
    </>
  );
}

function DetailsTab({
  data,
  scenario,
  scope,
  detailHrefBase,
  detailExtraQuery,
}: {
  data: PortfolioData;
  scenario: ScenarioType;
  scope: Scope;
  detailHrefBase: string;
  detailExtraQuery?: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-zinc-500">Companies</h2>
        <DownloadFullLedgerButton scenario={scenario.toLowerCase() as ScenarioParam} />
      </div>
      <CompanyRollupTable
        rows={data.companyRows}
        scenarioParam={scenario.toLowerCase() as ScenarioParam}
        detailHrefBase={detailHrefBase}
        extraQuery={`&scope=${scope}${detailExtraQuery ?? ""}`}
      />
    </>
  );
}

function ExitsWriteOffsTab({
  data,
  scenario,
  scope,
  detailHrefBase,
  detailExtraQuery,
}: {
  data: PortfolioData;
  scenario: ScenarioType;
  scope: Scope;
  detailHrefBase: string;
  detailExtraQuery?: string;
}) {
  const scenarioParam = scenario.toLowerCase() as ScenarioParam;
  const extraQuery = `&scope=${scope}${detailExtraQuery ?? ""}`;
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Exits</h2>
        <ExitsTable rows={data.exitRows} detailHrefBase={detailHrefBase} scenarioParam={scenarioParam} extraQuery={extraQuery} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Write-offs</h2>
        <WriteOffsTable
          rows={data.writeOffRows}
          detailHrefBase={detailHrefBase}
          scenarioParam={scenarioParam}
          extraQuery={extraQuery}
        />
      </section>
    </div>
  );
}

// Every panel formerly on the standalone /member/reports page, moved here — that page no
// longer exists (removed from MEMBER_TABS along with it). Sector panels stay bar-only per an
// earlier explicit ask; every other panel keeps its original pie/bar toggle.
async function ReportsTab({ scope, authUid, scenario }: { scope: Scope; authUid: string; scenario: ScenarioType }) {
  const data = scope === "mine" ? await loadMineReportsData(authUid, scenario) : await loadAsvReportsData(scenario);
  const companiesByYearAsAmount = data.companiesByYear.map((e) => ({ label: e.label, amount: e.count, pct: e.pct }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ReportPanel title="Amount invested by company" entries={data.byCompanyInvested} amountColumnLabel="Invested" />
      <ReportPanel title="Current value by company" entries={data.byCompanyValue} amountColumnLabel="Value" />
      <ReportPanel title="Amount invested by sector" entries={data.byIndustryInvested} amountColumnLabel="Invested" barOnly />
      <ReportPanel title="Value by sector" entries={data.byIndustryValue} amountColumnLabel="Value" barOnly />
      <ReportPanel title="Investment by year" entries={data.byYearInvested} amountColumnLabel="Invested" />
      <ReportPanel
        title="Companies invested in, by year"
        entries={companiesByYearAsAmount}
        unit="count"
        amountColumnLabel="Companies"
      />

      <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Company health by year</h2>
        <HealthByYearPanel data={data.healthByYear} />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Investments per year — new vs. follow-on</h2>
        <NewVsFollowOnPanel data={data.newVsFollowOnByYear} />
      </section>
    </div>
  );
}
