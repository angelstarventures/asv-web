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
  ]);

  // "Invested in" = has an allocation somewhere — never a company I've only seen a valuation
  // or update for without ever putting money in.
  const heldCompanyIds = new Set(allocations.map((a) => a.ledgerEntry.company.id));

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

  return new NextResponse(JSON.stringify({ scenario, records }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${tenantConfig.orgAbbreviation.toLowerCase()}-ledger-${scenario}-${member.memberId}.json"`,
    },
  });
}
