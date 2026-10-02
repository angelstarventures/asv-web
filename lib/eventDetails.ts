import { formatCurrencyCompact } from "@/components/StatTile";
import { tenantConfig } from "@/lib/config/tenant";
import type {
  ListCompanyUpdatesForScenarioData,
  ListComplianceFlagDetailsForScenarioData,
  ListExitEventDetailsForScenarioData,
  ListNonParticipatingRoundDetailsForScenarioData,
  ListPricedRoundDetailsForScenarioData,
  ListSafeRoundDetailsForScenarioData,
  ListValuationAssessmentDetailsForScenarioData,
} from "@/lib/dataconnect/generated";

export interface CompanyEventDetailField {
  label: string;
  value: string;
}

function humanize(value: string): string {
  const lower = value.toLowerCase().replaceAll("_", " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function fields(...pairs: [string, string | number | null | undefined][]): CompanyEventDetailField[] {
  return pairs
    .filter((pair): pair is [string, string | number] => pair[1] !== null && pair[1] !== undefined && pair[1] !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
}

export interface EventDetailSources {
  companyUpdateDetails: ListCompanyUpdatesForScenarioData["companyUpdateDetails"];
  pricedRoundDetails: ListPricedRoundDetailsForScenarioData["pricedRoundDetails"];
  safeRoundDetails: ListSafeRoundDetailsForScenarioData["safeRoundDetails"];
  nonParticipatingRoundDetails: ListNonParticipatingRoundDetailsForScenarioData["nonParticipatingRoundDetails"];
  exitEventDetails: ListExitEventDetailsForScenarioData["exitEventDetails"];
  valuationAssessmentDetails: ListValuationAssessmentDetailsForScenarioData["valuationAssessmentDetails"];
  complianceFlagDetails: ListComplianceFlagDetailsForScenarioData["complianceFlagDetails"];
}

// One label/value field set per LedgerEntry.type's detail table (same type/table mapping as
// functions/src/functions/ledger-massExport.ts), keyed by ledgerEntry.id so the dashboard can
// attach the right detail to each base ledger entry for the events-history popup. CUSTOM has
// no entry here — its data column is jsonb, which Data Connect's GraphQL layer can't read
// (the jsonb spike, plan §2); the popup just shows "no further detail" for those.
export function buildEventDetailIndex(sources: EventDetailSources): Map<string, CompanyEventDetailField[]> {
  const byEntry = new Map<string, CompanyEventDetailField[]>();

  for (const d of sources.pricedRoundDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["Round", d.roundName],
        ["Price per share", formatCurrencyCompact(d.pricePerShare)],
        ["Post-money valuation", formatCurrencyCompact(d.postMoneyValuation)],
        ["ASV total", formatCurrencyCompact(d.asvTotal)],
        ["Company URL", d.companyUrl],
        ["Doc link", d.docLink]
      )
    );
  }

  for (const d of sources.safeRoundDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["ASV total", formatCurrencyCompact(d.asvTotal)],
        ["Post-money valuation cap", formatCurrencyCompact(d.postMoneyValCap)],
        ["Discount", `${d.discount}%`],
        ["Warrant shares", d.warrantShares],
        ["Warrant share class", d.warrantShareClass],
        ["Warrant exercise price", d.warrantExercisePrice != null ? formatCurrencyCompact(d.warrantExercisePrice) : null],
        ["Warrant expiration (years)", d.warrantExpirationYears],
        ["Warrant vesting terms", d.warrantVestingTerms],
        ["Notes", d.notes],
        ["Company URL", d.companyUrl],
        ["Doc link", d.docLink]
      )
    );
  }

  for (const d of sources.nonParticipatingRoundDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["Round", d.roundName],
        ["New price per share", formatCurrencyCompact(d.newPricePerShare)],
        ["New post-money valuation", formatCurrencyCompact(d.newPostMoneyValuation)],
        ["Notes", d.notes],
        ["Doc link", d.docLink]
      )
    );
  }

  for (const d of sources.exitEventDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["Exit type", humanize(d.exitType)],
        ["Total exit value", formatCurrencyCompact(d.totalExitValue)],
        ["ASV total payout", formatCurrencyCompact(d.asvTotalPayout)],
        ["Doc link", d.docLink]
      )
    );
  }

  for (const d of sources.valuationAssessmentDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["Driving event date", d.drivingEventDate],
        ["ASV total fair market value", formatCurrencyCompact(d.asvTotalFairMarketValue)],
        ["Implied enterprise value", d.impliedEnterpriseValue != null ? formatCurrencyCompact(d.impliedEnterpriseValue) : null],
        ["Rationale", d.assessmentRationale],
        // Only ever populated for INTERNAL_VALUATION_ASSESSMENT rows — naturally absent (via
        // fields()'s null filter) for TRANSACTION_VALUATION_CHANGE, which shares this table.
        ["Viewpoint scenario", d.viewpointScenario ? humanize(d.viewpointScenario) : null],
        ["Market research grounding", d.viewpointMarketResearchGrounding],
        ["Valuation impact summary", d.viewpointValuationImpactSummary]
      )
    );
  }

  // Compliance-audit display (Halal/Shariah screening audit trail) — only shown when compliance
  // screening is enabled for this deployment. When disabled the section is hidden entirely,
  // not just relabeled, since the underlying compliance events may not exist for non-ASV tenants.
  if (tenantConfig.complianceScreening.enabled) {
    for (const d of sources.complianceFlagDetails) {
      byEntry.set(
        d.ledgerEntry.id,
        fields(
          ["Status", humanize(d.status)],
          ["Flagged date", d.flaggedDate],
          ["Reason", d.reason],
          ["Audit type", humanize(d.auditType)],
          ["Officer notes", d.complianceOfficerNotes]
        )
      );
    }
  }

  for (const d of sources.companyUpdateDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      fields(
        ["Health", humanize(d.health)],
        ["Trajectory", humanize(d.trajectory)],
        ["Highlights", d.highlights.join("; ")],
        ["Lowlights", d.lowlights.join("; ")],
        ["Upcoming plans", d.upcomingPlans.join("; ")],
        ["Viewpoint scenario", humanize(d.viewpointScenario)],
        ["Market research grounding", d.viewpointMarketResearchGrounding],
        ["Valuation impact summary", d.viewpointValuationImpactSummary],
        ["Web sources", d.viewpointWebSources?.length ? d.viewpointWebSources.join("; ") : null]
      )
    );
  }

  return byEntry;
}
