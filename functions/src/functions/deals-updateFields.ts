import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { assertValidDealCoreFields, assertValidFundingHistory, type DealCoreFields, type DealFundingRoundEntryInput } from "../lib/dealFields";
import { syncAutoTagsForDeal } from "../lib/dealAutoTags";

// Lets an admin correct anything an entrepreneur got wrong (sector/keywords/companyLocation are
// editable here too) after the pitch is already in. Deliberately
// separate from dealsSubmitPitch: no file uploads, no Drive folder, no AI re-detection — just an
// update of the same core fields, admin-gated. fundingHistory is a full replace (delete every
// existing row, insert this list) rather than a diff — matches how the edit form always submits
// its complete current state for every other field, and keeps this function simple.
export interface DealsUpdateFieldsInput extends DealCoreFields {
  dealId: string;
  fundingHistory: DealFundingRoundEntryInput[];
}

export const dealsUpdateFields = onCall<DealsUpdateFieldsInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const input = request.data;

  if (typeof input.dealId !== "string" || !input.dealId) {
    throw new HttpsError("invalid-argument", "dealId is required.");
  }
  assertValidDealCoreFields(input);
  const fundingHistory = assertValidFundingHistory(input.fundingHistory);

  const isSafe = input.securityType === "SAFE";
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE "deal" SET
         "company_name" = $1,
         "company_email" = $2,
         "company_url" = $3,
         "entrepreneur_name" = $4,
         "entrepreneur_email" = $5,
         "entrepreneur_phone" = $6,
         "executive_summary" = $7,
         "team_information" = $8,
         "round" = $9,
         "security_type" = $10,
         "seeking_amount" = $11,
         "currency" = $12,
         "pre_money_valuation" = $13,
         "valuation_cap" = $14,
         "discount_percent" = $15,
         "has_lead_investor" = $16,
         "lead_investor_name" = $17,
         "will_have_interest_bearing_debt_after_close" = $18,
         "has_existing_interest_bearing_debt" = $19,
         "has_restricted_business_lines" = $20,
         "raise_method" = $21,
         "referred_by" = $22,
         "sector" = $23,
         "keywords" = $24,
         "company_location" = $25,
         "updated_at" = now()
       WHERE id = $26`,
      [
        input.companyName,
        input.companyEmail,
        input.companyUrl,
        input.entrepreneurName,
        input.entrepreneurEmail,
        input.entrepreneurPhone,
        input.executiveSummary?.trim() || null,
        input.teamInformation?.trim() || null,
        input.round,
        input.securityType,
        input.seekingAmount,
        input.currency.trim().toUpperCase(),
        isSafe ? null : input.preMoneyValuation,
        isSafe ? input.valuationCap : null,
        isSafe ? (input.discountPercent ?? null) : null,
        input.hasLeadInvestor,
        input.leadInvestorName?.trim() || null,
        input.willHaveInterestBearingDebtAfterClose,
        input.hasExistingInterestBearingDebt,
        input.hasRestrictedBusinessLines,
        input.raiseMethod?.trim() || null,
        input.referredBy?.trim() || null,
        input.sector?.trim() || null,
        input.keywords && input.keywords.length > 0 ? input.keywords : null,
        input.companyLocation?.trim() || null,
        input.dealId,
      ]
    );
    if (rowCount === 0) {
      throw new HttpsError("not-found", "Deal not found.");
    }

    await client.query(`DELETE FROM "deal_funding_round_entry" WHERE "deal_id" = $1`, [input.dealId]);
    for (const entry of fundingHistory) {
      await client.query(
        `INSERT INTO "deal_funding_round_entry" ("deal_id", "round", "amount", "currency", "created_at")
         VALUES ($1, $2, $3, $4, now())`,
        [input.dealId, entry.round, entry.amount, entry.currency.trim().toUpperCase()]
      );
    }

    await syncAutoTagsForDeal(client, input.dealId, {
      hasLeadInvestor: input.hasLeadInvestor,
      willHaveInterestBearingDebtAfterClose: input.willHaveInterestBearingDebtAfterClose,
      hasRestrictedBusinessLines: input.hasRestrictedBusinessLines,
    });
  });

  return { ok: true };
});
