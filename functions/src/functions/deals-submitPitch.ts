import { onCall, HttpsError } from "firebase-functions/v2/https";
import { withTransaction } from "../lib/dataconnect-admin";
import { createDealFolder, uploadDealFile, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import { syncAutoTagsForDeal } from "../lib/dealAutoTags";
import {
  assertValidDealCoreFields,
  assertValidFundingHistory,
  type DealCoreFields,
  type DealFundingRoundEntryInput,
  type FundingRound,
  type SecurityType,
} from "../lib/dealFields";

// The one genuinely public callable in this app — an entrepreneur submitting a pitch has no
// Firebase Auth session at all, so this never calls requireCaller/requireAdmin. Firebase App
// Check (enforceAppCheck below) is the abuse-prevention layer instead of a member/admin check.
//
// Deliberately never calls AI: sector is null until an admin sets it by hand (EditDealForm) or
// leaves it for the matching prompt to work around; keywords stay empty until an admin clicks
// "Send for review" (deals-findReviewers.ts), the only AI trigger left in the intake path.

export type { FundingRound, SecurityType };

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface DealsSubmitPitchFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export type DealsSubmitPitchFundingRoundEntry = DealFundingRoundEntryInput;

export interface DealsSubmitPitchInput extends DealCoreFields {
  fundingHistory?: DealsSubmitPitchFundingRoundEntry[];
  pitchDeck: DealsSubmitPitchFile;
  additionalDocuments?: DealsSubmitPitchFile[];
}

export interface DealsSubmitPitchOutput {
  dealId: string;
}

function assertValid(input: DealsSubmitPitchInput) {
  assertValidDealCoreFields(input);
  if (!input.pitchDeck?.filename || !input.pitchDeck?.contentBase64) {
    throw new HttpsError("invalid-argument", "pitchDeck is required.");
  }
}

function decodeAndCheckSize(file: DealsSubmitPitchFile): Buffer {
  const content = Buffer.from(file.contentBase64, "base64");
  if (content.byteLength > MAX_UPLOAD_BYTES) {
    throw new HttpsError("invalid-argument", `${file.filename} exceeds the 25MB upload limit.`);
  }
  return content;
}

export const dealsSubmitPitch = onCall<DealsSubmitPitchInput, Promise<DealsSubmitPitchOutput>>(
  {
    enforceAppCheck: true,
    secrets: [driveOAuthClientSecret, driveOAuthRefreshToken],
    timeoutSeconds: 120,
    // Default 256MiB was getting exhausted in production: decoding uploaded files, buffering
    // the fetched company homepage before truncation, and the Vertex AI SDK together exceed it.
    memory: "512MiB",
  },
  async (request) => {
    const input = request.data;
    assertValid(input);
    const fundingHistory = assertValidFundingHistory(input.fundingHistory);

    const rootFolderId = process.env.DEALS_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new HttpsError("failed-precondition", "Pitch intake is not configured yet.");
    }

    const additionalDocuments = input.additionalDocuments ?? [];
    const deckContent = decodeAndCheckSize(input.pitchDeck);
    const additionalContents = additionalDocuments.map(decodeAndCheckSize);

    const folder = await createDealFolder(rootFolderId, input.companyName);
    const uploads = [
      { docType: "PITCH_DECK" as const, file: input.pitchDeck, content: deckContent },
      ...additionalDocuments.map((file, i) => ({
        docType: "ADDITIONAL_DOCUMENT" as const,
        file,
        content: additionalContents[i],
      })),
    ];

    const uploaded = await Promise.all(
      uploads.map(async ({ docType, file, content }) => {
        const res = await uploadDealFile(folder.driveFileId, file.filename, file.mimeType, content);
        return { docType, filename: file.filename, ...res };
      })
    );

    const isSafe = input.securityType === "SAFE";
    const dealId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "deal" (
           "company_name", "company_email", "company_url", "entrepreneur_name", "entrepreneur_email",
           "entrepreneur_phone", "executive_summary", "team_information", "round",
           "security_type", "seeking_amount", "currency", "pre_money_valuation", "valuation_cap",
           "discount_percent", "has_lead_investor",
           "lead_investor_name", "will_have_interest_bearing_debt_after_close",
           "has_existing_interest_bearing_debt", "has_restricted_business_lines",
           "raise_method", "referred_by", "sector", "keywords", "company_location", "stage",
           "drive_folder_id", "drive_folder_url", "created_at", "updated_at"
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
           'NEW', $26, $27, now(), now()
         ) RETURNING id`,
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
          input.leadInvestorName ?? null,
          input.willHaveInterestBearingDebtAfterClose,
          input.hasExistingInterestBearingDebt,
          input.hasRestrictedBusinessLines,
          input.raiseMethod?.trim() || null,
          input.referredBy ?? null,
          input.sector?.trim() || null,
          null, // keywords stay empty until an admin clicks "Send for review"
          null, // company_location — no longer auto-detected
          folder.driveFileId,
          folder.driveUrl,
        ]
      );
      const id = rows[0].id;

      for (const doc of uploaded) {
        await client.query(
          `INSERT INTO "deal_document" ("deal_id", "doc_type", "drive_file_id", "drive_url", "filename", "uploaded_at")
           VALUES ($1, $2, $3, $4, $5, now())`,
          [id, doc.docType, doc.driveFileId, doc.driveUrl, doc.filename]
        );
      }

      for (const entry of fundingHistory) {
        await client.query(
          `INSERT INTO "deal_funding_round_entry" ("deal_id", "round", "amount", "currency", "created_at")
           VALUES ($1, $2, $3, $4, now())`,
          [id, entry.round, entry.amount, entry.currency.trim().toUpperCase()]
        );
      }

      await syncAutoTagsForDeal(client, id, {
        hasLeadInvestor: input.hasLeadInvestor,
        willHaveInterestBearingDebtAfterClose: input.willHaveInterestBearingDebtAfterClose,
        hasRestrictedBusinessLines: input.hasRestrictedBusinessLines,
      });

      return id;
    });

    return { dealId };
  }
);
