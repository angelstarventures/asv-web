import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { assertValidDealCoreFields, type DealCoreFields } from "../lib/dealFields";

// Lets an admin correct anything an entrepreneur got wrong (or an AI mis-detected — sector/
// keywords/companyLocation are editable here too) after the pitch is already in. Deliberately
// separate from dealsSubmitPitch: no file uploads, no Drive folder, no AI re-detection — just an
// update of the same core fields, admin-gated. Funding history stays entrepreneur-only/immutable
// (a deliberate earlier decision), so it's not part of this input.
export interface DealsUpdateFieldsInput extends DealCoreFields {
  dealId: string;
}

export const dealsUpdateFields = onCall<DealsUpdateFieldsInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const input = request.data;

  if (typeof input.dealId !== "string" || !input.dealId) {
    throw new HttpsError("invalid-argument", "dealId is required.");
  }
  assertValidDealCoreFields(input);

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
  });

  return { ok: true };
});
