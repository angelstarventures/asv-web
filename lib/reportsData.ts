import {
  listAllocationsForScenario,
  listCompanyRollups,
  listCompanyUpdatesForScenario,
  listMemberAllocations,
} from "@/lib/dataconnect/client";
import { CompanyHealth, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { INVESTMENT_ROUND_TYPES } from "@/lib/portfolioView";

export interface BreakdownEntry {
  label: string;
  amount: number; // dollars
  pct: number; // 0-100, of this breakdown's own total
}

export interface CountBreakdownEntry {
  label: string;
  count: number;
  pct: number;
}

export interface HealthYearEntry {
  year: number;
  counts: Record<CompanyHealth, number>;
}

export interface NewVsFollowOnYearEntry {
  year: number;
  newAmount: number;
  followOnAmount: number;
}

export interface ReportsData {
  byCompanyInvested: BreakdownEntry[];
  byCompanyValue: BreakdownEntry[];
  byIndustryInvested: BreakdownEntry[];
  byIndustryValue: BreakdownEntry[];
  byYearInvested: BreakdownEntry[]; // label = year
  companiesByYear: CountBreakdownEntry[]; // label = year
  healthByYear: HealthYearEntry[];
  newVsFollowOnByYear: NewVsFollowOnYearEntry[];
}

interface RoundRow {
  ledgerEntryId: string;
  companyId: string;
  year: number;
  amount: number;
}

interface CompanyInfo {
  id: string;
  label: string;
  sector: string;
}

function toPct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
}

function toBreakdown(totals: Map<string, number>): BreakdownEntry[] {
  const total = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount, pct: toPct(amount, total) }))
    .sort((a, b) => b.amount - a.amount);
}

// The 8 report panels' shared math, independent of scope — both loaders below reduce their
// scope-specific allocation rows down to this exact same shape, then hand off to this one
// function, so "mine" and "asv" can never quietly diverge in how a report is computed.
function buildReportsData(
  rounds: RoundRow[],
  companyValue: Map<string, number>, // companyId -> unrealized+realized, already scope-filtered
  companyInfo: Map<string, CompanyInfo>,
  healthRows: { eventDate: string; health: CompanyHealth; companyId: string }[]
): ReportsData {
  const investedByCompany = new Map<string, number>();
  const roundsByCompany = new Map<string, RoundRow[]>();
  for (const r of rounds) {
    investedByCompany.set(r.companyId, (investedByCompany.get(r.companyId) ?? 0) + r.amount);
    roundsByCompany.set(r.companyId, [...(roundsByCompany.get(r.companyId) ?? []), r]);
  }

  const labelFor = (companyId: string) => companyInfo.get(companyId)?.label ?? companyId;
  const sectorFor = (companyId: string) => companyInfo.get(companyId)?.sector ?? "Uncategorized";

  const investedTotals = new Map<string, number>();
  for (const [companyId, amount] of investedByCompany) investedTotals.set(labelFor(companyId), amount);

  const valueTotals = new Map<string, number>();
  for (const [companyId, value] of companyValue) valueTotals.set(labelFor(companyId), value);

  const investedBySector = new Map<string, number>();
  for (const [companyId, amount] of investedByCompany) {
    const sector = sectorFor(companyId);
    investedBySector.set(sector, (investedBySector.get(sector) ?? 0) + amount);
  }
  const valueBySector = new Map<string, number>();
  for (const [companyId, value] of companyValue) {
    const sector = sectorFor(companyId);
    valueBySector.set(sector, (valueBySector.get(sector) ?? 0) + value);
  }

  // New vs. follow-on: the earliest round (by date) for a company is "new"; every later round
  // for that same company, however many years later, is "follow-on" — a lifetime distinction,
  // not a per-year one.
  const newRoundIdByCompany = new Map<string, string>();
  for (const [companyId, companyRounds] of roundsByCompany) {
    const earliest = companyRounds.reduce((a, b) => (a.year <= b.year ? a : b));
    newRoundIdByCompany.set(companyId, earliest.ledgerEntryId);
  }

  const investedByYear = new Map<number, number>();
  const companiesByYearSet = new Map<number, Set<string>>();
  const newByYear = new Map<number, number>();
  const followOnByYear = new Map<number, number>();
  for (const r of rounds) {
    investedByYear.set(r.year, (investedByYear.get(r.year) ?? 0) + r.amount);
    if (!companiesByYearSet.has(r.year)) companiesByYearSet.set(r.year, new Set());
    companiesByYearSet.get(r.year)!.add(r.companyId);

    const isNew = newRoundIdByCompany.get(r.companyId) === r.ledgerEntryId;
    if (isNew) newByYear.set(r.year, (newByYear.get(r.year) ?? 0) + r.amount);
    else followOnByYear.set(r.year, (followOnByYear.get(r.year) ?? 0) + r.amount);
  }

  const years = [...new Set(rounds.map((r) => r.year))].sort();
  const totalCompanyYearCount = [...companiesByYearSet.values()].reduce((sum, s) => sum + s.size, 0);

  // Current health per company (latest CompanyUpdate overall, not as-of any particular year) —
  // same "no news is good news" GREEN default used elsewhere in this app.
  const latestHealthByCompany = new Map<string, { eventDate: string; health: CompanyHealth }>();
  for (const row of healthRows) {
    const existing = latestHealthByCompany.get(row.companyId);
    if (!existing || row.eventDate > existing.eventDate) {
      latestHealthByCompany.set(row.companyId, { eventDate: row.eventDate, health: row.health });
    }
  }

  // For each year, the companies actually invested in that year (companiesByYearSet already
  // includes a company for every year it received a round, follow-ons included) — bucketed by
  // their CURRENT health, not health as of that year.
  const healthByYear: HealthYearEntry[] = years.map((year) => {
    const counts: Record<CompanyHealth, number> = {
      [CompanyHealth.GREEN]: 0,
      [CompanyHealth.YELLOW]: 0,
      [CompanyHealth.RED]: 0,
    };
    for (const companyId of companiesByYearSet.get(year) ?? []) {
      const health = latestHealthByCompany.get(companyId)?.health ?? CompanyHealth.GREEN;
      counts[health] += 1;
    }
    return { year, counts };
  });

  return {
    byCompanyInvested: toBreakdown(investedTotals),
    byCompanyValue: toBreakdown(valueTotals),
    byIndustryInvested: toBreakdown(investedBySector),
    byIndustryValue: toBreakdown(valueBySector),
    byYearInvested: toBreakdown(new Map(years.map((y) => [String(y), investedByYear.get(y) ?? 0]))),
    companiesByYear: years.map((y) => ({
      label: String(y),
      count: companiesByYearSet.get(y)?.size ?? 0,
      pct: toPct(companiesByYearSet.get(y)?.size ?? 0, totalCompanyYearCount),
    })),
    healthByYear,
    newVsFollowOnByYear: years.map((y) => ({
      year: y,
      newAmount: newByYear.get(y) ?? 0,
      followOnAmount: followOnByYear.get(y) ?? 0,
    })),
  };
}

function roundsFromAllocations(
  allocations: { amount: number; ledgerEntry: { id: string; eventDate: string; type: string; company: { id: string } } }[]
): RoundRow[] {
  const byRound = new Map<string, RoundRow>();
  for (const a of allocations) {
    if (!INVESTMENT_ROUND_TYPES.has(a.ledgerEntry.type as never)) continue;
    const existing = byRound.get(a.ledgerEntry.id);
    if (existing) {
      existing.amount += a.amount;
    } else {
      byRound.set(a.ledgerEntry.id, {
        ledgerEntryId: a.ledgerEntry.id,
        companyId: a.ledgerEntry.company.id,
        year: new Date(a.ledgerEntry.eventDate).getFullYear(),
        amount: a.amount,
      });
    }
  }
  return [...byRound.values()];
}

export async function loadAsvReportsData(scenario: ScenarioType): Promise<ReportsData> {
  const [{ allocations }, { rollupCaches }, { companyUpdateDetails }] = await Promise.all([
    listAllocationsForScenario({ scenario }),
    listCompanyRollups({ scenario }),
    listCompanyUpdatesForScenario({ scenario }),
  ]);

  const rounds = roundsFromAllocations(allocations);

  const companyValue = new Map<string, number>();
  const companyInfo = new Map<string, CompanyInfo>();
  for (const row of rollupCaches) {
    if (!row.company) continue;
    companyValue.set(row.company.id, row.unrealizedValue + row.realizedValue);
    companyInfo.set(row.company.id, {
      id: row.company.id,
      label: row.company.tradeName ?? row.company.name,
      sector: row.company.sector ?? "Uncategorized",
    });
  }

  const healthRows = companyUpdateDetails.map((d) => ({
    eventDate: d.ledgerEntry.eventDate,
    health: d.health,
    companyId: d.ledgerEntry.company.id,
  }));

  return buildReportsData(rounds, companyValue, companyInfo, healthRows);
}

export async function loadMineReportsData(authUid: string, scenario: ScenarioType): Promise<ReportsData> {
  const { allocations } = await listMemberAllocations(authUid, { scenario });

  const rounds = roundsFromAllocations(allocations);

  // "Current value" in mine-scope mirrors MineView's own logic (lib/portfolioView.tsx) — the
  // latest mark per company from this member's own allocation cost basis, since there's no
  // per-member rollup cache; a member with no valuation event yet is carried at cost.
  const companyValue = new Map<string, number>();
  const companyInfo = new Map<string, CompanyInfo>();
  for (const a of allocations) {
    const c = a.ledgerEntry.company;
    if (!companyInfo.has(c.id)) {
      companyInfo.set(c.id, { id: c.id, label: c.tradeName ?? c.name, sector: c.sector ?? "Uncategorized" });
    }
    companyValue.set(c.id, (companyValue.get(c.id) ?? 0) + a.amount);
  }

  // No member-scoped health-history query exists (health is portfolio-wide reporting data, not
  // member-specific, same posture as ListCompanyUpdatesForScenario elsewhere) — mine-scope
  // health-by-year reuses that same portfolio-wide history, narrowed to just the companies this
  // member has ever held (buildReportsData already only counts a company once it's been
  // invested in, via roundsByCompany — the `companyInfo` filter here just avoids fetching/
  // reducing health rows for companies this member never touched at all).
  const { companyUpdateDetails } = await listCompanyUpdatesForScenario({ scenario });
  const healthRows = companyUpdateDetails
    .filter((d) => companyInfo.has(d.ledgerEntry.company.id))
    .map((d) => ({ eventDate: d.ledgerEntry.eventDate, health: d.health, companyId: d.ledgerEntry.company.id }));

  return buildReportsData(rounds, companyValue, companyInfo, healthRows);
}
