import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { tenantConfig } from "@/lib/config/tenant";
import {
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
import { LedgerEntryType, Scenario as ScenarioEnum } from "@/lib/dataconnect/generated";
import { SCENARIOS, type Scenario } from "@/lib/scenarioTypes";
import { ENUM_TO_LEDGER_TYPE } from "@/lib/legacyEnumMap";
import { buildLegacyRecordFragments } from "@/lib/legacyLedgerRecords";
import { loadMemberTransferData } from "@/lib/memberTransfers";

// Full per-scenario ledger export, in the same record shape as the admin's mass export
// (functions/src/functions/ledger-massExport.ts), but member-facing: filtered to companies
// this member has actually put money into (never one they've merely heard about), and never
// containing another member's allocation/payout/valuation amount — only this member's own,
// under the same allocations/member_payouts/member_valuations field names the schema expects.
// API routes aren't covered by proxy.ts's page matcher, so this independently re-verifies the
// session cookie and derives memberId/authUid server-side — never from a query param.
export async function GET(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scenarioParam = new URL(request.url).searchParams.get("scenario");
  if (!scenarioParam || !(SCENARIOS as readonly string[]).includes(scenarioParam)) {
    return NextResponse.json({ error: `scenario must be one of: ${SCENARIOS.join(", ")}` }, { status: 400 });
  }
  const scenario = scenarioParam as Scenario;
  const scenarioEnum = ScenarioEnum[scenario.toUpperCase() as keyof typeof ScenarioEnum];

  const [
    { allocations },
    { memberValuations },
    { ledgerEntries },
    { companyUpdateDetails },
    { pricedRoundDetails },
    { safeRoundDetails },
    { nonParticipatingRoundDetails },
    { exitEventDetails },
    { valuationAssessmentDetails },
    { complianceFlagDetails },
    transfers,
  ] = await Promise.all([
    listMemberAllocations(member.authUid, { scenario: scenarioEnum }),
    listMemberValuations(member.authUid, { scenario: scenarioEnum }),
    listLedgerEntriesForScenario({ scenario: scenarioEnum }),
    listCompanyUpdatesForScenario({ scenario: scenarioEnum }),
    listPricedRoundDetailsForScenario({ scenario: scenarioEnum }),
    listSafeRoundDetailsForScenario({ scenario: scenarioEnum }),
    listNonParticipatingRoundDetailsForScenario({ scenario: scenarioEnum }),
    listExitEventDetailsForScenario({ scenario: scenarioEnum }),
    listValuationAssessmentDetailsForScenario({ scenario: scenarioEnum }),
    listComplianceFlagDetailsForScenario({ scenario: scenarioEnum }),
    loadMemberTransferData(member.authUid, scenarioEnum),
  ]);

  // "Invested in" = has an allocation somewhere — never a company I've only seen a valuation
  // or update for without ever putting money in.
  // A member who only ever bought into a company through a transfer holds it too.
  const heldCompanyIds = new Set([
    ...allocations.map((a) => a.ledgerEntry.company.id),
    ...transfers.legs.map((l) => l.companyId),
  ]);

  const myAllocationByEntry = new Map(allocations.map((a) => [a.ledgerEntry.id, a.amount]));
  const myValuationByEntry = new Map(memberValuations.map((v) => [v.ledgerEntry.id, v.value]));

  const detailByEntry = buildLegacyRecordFragments({
    companyUpdateDetails,
    pricedRoundDetails,
    safeRoundDetails,
    nonParticipatingRoundDetails,
    exitEventDetails,
    valuationAssessmentDetails,
    complianceFlagDetails,
  });

  const ROUND_TYPES = new Set<LedgerEntryType>([
    LedgerEntryType.PARTICIPATING_PRICED_ROUND,
    LedgerEntryType.PARTICIPATING_SAFE_ROUND,
  ]);
  const VALUATION_TYPES = new Set<LedgerEntryType>([
    LedgerEntryType.TRANSACTION_VALUATION_CHANGE,
    LedgerEntryType.INTERNAL_VALUATION_ASSESSMENT,
  ]);

  const records = ledgerEntries
    .filter((entry) => heldCompanyIds.has(entry.company.id))
    .map((entry) => {
      const record: Record<string, unknown> = {
        date: entry.eventDate,
        company: entry.company.name,
        scenario,
        type: ENUM_TO_LEDGER_TYPE[entry.type as keyof typeof ENUM_TO_LEDGER_TYPE] ?? entry.type,
        ...(detailByEntry.get(entry.id) ?? {}),
      };
      if (entry.sourceDocument) record.doc_link = entry.sourceDocument;

      if (ROUND_TYPES.has(entry.type)) {
        const amount = myAllocationByEntry.get(entry.id);
        record.allocations = amount !== undefined ? { [member.memberId]: amount } : {};
      } else if (entry.type === LedgerEntryType.EXIT_EVENT) {
        const payout = myValuationByEntry.get(entry.id);
        record.member_payouts = payout !== undefined ? { [member.memberId]: payout } : {};
      } else if (VALUATION_TYPES.has(entry.type)) {
        const value = myValuationByEntry.get(entry.id);
        record.member_valuations = value !== undefined ? { [member.memberId]: value } : {};
      }

      return record;
    });

  // This member's OWN legs of internal transfers, in the admin export's record shape. Counterparties,
  // their amounts and fees charged to anyone else are never included.
  const companyNameById = new Map(ledgerEntries.map((e) => [e.company.id, e.company.name]));
  for (const t of transfers.legs) {
    const replacement = t.kind === "REPLACEMENT";
    const seller = t.side === "SELLER";
    records.push({
      date: t.date,
      company: transfers.companies.get(t.companyId)?.name ?? companyNameById.get(t.companyId) ?? t.companyId,
      scenario,
      type: "Internal_Transfer",
      transfer_kind: replacement ? "Replacement" : "Sale",
      ...(t.referenceRoundName ? { reference_round_name: t.referenceRoundName } : {}),
      ...(!replacement && t.roundPricePerShare !== null ? { round_price_per_share: t.roundPricePerShare } : {}),
      ...(!replacement && t.transferPricePerShare !== null ? { transfer_price_per_share: t.transferPricePerShare } : {}),
      ...(t.sourceRoundName ? { source_round_name: t.sourceRoundName } : {}),
      ...(t.sourceRoundDate ? { source_round_date: t.sourceRoundDate } : {}),
      ...(t.docLink ? { doc_link: t.docLink } : {}),
      // Amounts are the member's own cost basis moved (what the shares cost them), not counterparties' figures.
      ...(seller
        ? { sellers: { [member.memberId]: Math.round(t.shares * t.costBasisPerShare * 100) / 100 } }
        : { buyers: { [member.memberId]: replacement ? Math.round(t.shares * t.costBasisPerShare * 100) / 100 : t.amount } }),
    });
  }
  records.sort((a, b) => String(b.date).localeCompare(String(a.date))); // same newest-first order as the ledger query

  return new NextResponse(JSON.stringify({ scenario, records }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${tenantConfig.orgAbbreviation.toLowerCase()}-ledger-${scenario}-${member.memberId}.json"`,
    },
  });
}
