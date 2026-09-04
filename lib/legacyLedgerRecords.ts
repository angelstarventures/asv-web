import {
  ENUM_TO_AUDIT_TYPE,
  ENUM_TO_EXIT_TYPE,
  ENUM_TO_HEALTH,
  ENUM_TO_TRAJECTORY,
  ENUM_TO_VIEWPOINT_SCENARIO,
} from "@/lib/legacyEnumMap";
import type {
  ListCompanyUpdatesForScenarioData,
  ListComplianceFlagDetailsForScenarioData,
  ListExitEventDetailsForScenarioData,
  ListNonParticipatingRoundDetailsForScenarioData,
  ListPricedRoundDetailsForScenarioData,
  ListSafeRoundDetailsForScenarioData,
  ListValuationAssessmentDetailsForScenarioData,
} from "@/lib/dataconnect/generated";

// Reshapes the same 6 per-type detail queries (plus CompanyUpdateDetail) that
// lib/eventDetails.ts's buildEventDetailIndex already turns into UI label/value pairs — this
// instead reshapes them into the legacy asv_master_portfolio_schema.json field names, for the
// member-facing full-ledger export (app/api/ledger/my-full-ledger). Mirrors
// functions/src/functions/ledger-massExport.ts's per-type switch (the admin export), minus
// the allocations/member_payouts/member_valuations dicts — those are member-specific and
// built separately by the caller, scoped to just the requesting member.

function omitNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

export interface LegacyRecordSources {
  companyUpdateDetails: ListCompanyUpdatesForScenarioData["companyUpdateDetails"];
  pricedRoundDetails: ListPricedRoundDetailsForScenarioData["pricedRoundDetails"];
  safeRoundDetails: ListSafeRoundDetailsForScenarioData["safeRoundDetails"];
  nonParticipatingRoundDetails: ListNonParticipatingRoundDetailsForScenarioData["nonParticipatingRoundDetails"];
  exitEventDetails: ListExitEventDetailsForScenarioData["exitEventDetails"];
  valuationAssessmentDetails: ListValuationAssessmentDetailsForScenarioData["valuationAssessmentDetails"];
  complianceFlagDetails: ListComplianceFlagDetailsForScenarioData["complianceFlagDetails"];
}

// Keyed by ledgerEntry.id. Each value is the type-specific fields only (company/date/type are
// added by the caller from the base ledger entry) — never allocations/member_payouts/
// member_valuations, which the caller must add itself, scoped to one member.
export function buildLegacyRecordFragments(sources: LegacyRecordSources): Map<string, Record<string, unknown>> {
  const byEntry = new Map<string, Record<string, unknown>>();

  for (const d of sources.pricedRoundDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      omitNullish({
        company_url: d.companyUrl,
        doc_link: d.docLink,
        asv_total: d.asvTotal,
        round_name: d.roundName,
        price_per_share: d.pricePerShare,
        post_money_valuation: d.postMoneyValuation,
      })
    );
  }

  for (const d of sources.safeRoundDetails) {
    const hasWarrants = [
      d.warrantShares,
      d.warrantShareClass,
      d.warrantExercisePrice,
      d.warrantExpirationYears,
      d.warrantVestingTerms,
    ].some((v) => v !== null && v !== undefined);
    byEntry.set(
      d.ledgerEntry.id,
      omitNullish({
        company_url: d.companyUrl,
        doc_link: d.docLink,
        asv_total: d.asvTotal,
        post_money_val_cap: d.postMoneyValCap,
        discount: d.discount,
        notes: d.notes,
        warrants: hasWarrants
          ? {
              shares: d.warrantShares,
              share_class: d.warrantShareClass,
              exercise_price: d.warrantExercisePrice,
              expiration_years: d.warrantExpirationYears,
              vesting_terms: d.warrantVestingTerms,
            }
          : undefined,
      })
    );
  }

  for (const d of sources.nonParticipatingRoundDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      omitNullish({
        round_name: d.roundName,
        new_price_per_share: d.newPricePerShare,
        new_post_money_valuation: d.newPostMoneyValuation,
        doc_link: d.docLink,
        notes: d.notes,
      })
    );
  }

  for (const d of sources.exitEventDetails) {
    byEntry.set(
      d.ledgerEntry.id,
      omitNullish({
        exit_type: ENUM_TO_EXIT_TYPE[d.exitType],
        total_exit_value: d.totalExitValue,
        asv_total_payout: d.asvTotalPayout,
        doc_link: d.docLink,
      })
    );
  }

  for (const d of sources.valuationAssessmentDetails) {
    // viewpointScenario is only ever set for INTERNAL_VALUATION_ASSESSMENT rows — null on every
    // TRANSACTION_VALUATION_CHANGE row, which this table is also shared by.
    const hasViewpoint = d.viewpointScenario != null;
    byEntry.set(
      d.ledgerEntry.id,
      omitNullish({
        driving_event_date: d.drivingEventDate,
        asv_total_fair_market_value: d.asvTotalFairMarketValue,
        implied_enterprise_value: d.impliedEnterpriseValue,
        assessment_rationale: d.assessmentRationale,
        viewpoint_analysis: hasViewpoint
          ? {
              scenario: ENUM_TO_VIEWPOINT_SCENARIO[d.viewpointScenario as keyof typeof ENUM_TO_VIEWPOINT_SCENARIO],
              market_research_grounding: d.viewpointMarketResearchGrounding,
              valuation_impact_summary: d.viewpointValuationImpactSummary,
            }
          : undefined,
      })
    );
  }

  for (const d of sources.complianceFlagDetails) {
    byEntry.set(d.ledgerEntry.id, {
      compliance_status: { status: "Non-Halal", flagged_date: d.flaggedDate, reason: d.reason },
      audit_type: ENUM_TO_AUDIT_TYPE[d.auditType],
      compliance_officer_notes: d.complianceOfficerNotes,
    });
  }

  for (const d of sources.companyUpdateDetails) {
    byEntry.set(d.ledgerEntry.id, {
      health: ENUM_TO_HEALTH[d.health],
      trajectory: ENUM_TO_TRAJECTORY[d.trajectory],
      summary: { highlights: d.highlights, lowlights: d.lowlights, upcoming_plans: d.upcomingPlans },
      viewpoint_analysis: {
        scenario: ENUM_TO_VIEWPOINT_SCENARIO[d.viewpointScenario as keyof typeof ENUM_TO_VIEWPOINT_SCENARIO],
        market_research_grounding: d.viewpointMarketResearchGrounding,
        valuation_impact_summary: d.viewpointValuationImpactSummary,
        ...(d.viewpointWebSources?.length && { web_sources: d.viewpointWebSources }),
      },
    });
  }

  return byEntry;
}
