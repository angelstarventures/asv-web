import { onCall, HttpsError } from "firebase-functions/v2/https";
import { withTransaction } from "../lib/dataconnect-admin";
import { createDealFolder, uploadDealFile, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// The one genuinely public callable in this app — an entrepreneur submitting a pitch has no
// Firebase Auth session at all, so this never calls requireCaller/requireAdmin. Firebase App
// Check (enforceAppCheck below) is the abuse-prevention layer instead of a member/admin check.
// App Check only actually rejects unattested calls once NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set
// to a real key client-side (lib/firebase/client.ts already initializes the provider whenever
// that env var is non-empty) — until then this call is effectively open, by design, so pitch
// intake isn't blocked on that one-time setup step.

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type FundingRound = "PRE_SEED" | "SEED" | "SERIES_A" | "OTHER";
export type SecurityType = "PRICED_ROUND" | "SAFE" | "CONVERTIBLE_NOTE" | "OTHER";

const FUNDING_ROUNDS: readonly FundingRound[] = ["PRE_SEED", "SEED", "SERIES_A", "OTHER"];
const SECURITY_TYPES: readonly SecurityType[] = ["PRICED_ROUND", "SAFE", "CONVERTIBLE_NOTE", "OTHER"];

export interface DealsSubmitPitchFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface DealsSubmitPitchInput {
  companyName: string;
  companyEmail: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary: string;
  teamInformation: string;
  round: FundingRound;
  securityType: SecurityType;
  seekingAmount: number;
  preMoneyValuation: number;
  hasLeadInvestor: boolean;
  leadInvestorName?: string;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasExistingInterestBearingDebt: boolean;
  hasRestrictedBusinessLines: boolean;
  raiseMethod: string;
  referredBy?: string;
  pitchDeck: DealsSubmitPitchFile;
  additionalDocuments?: DealsSubmitPitchFile[];
}

export interface DealsSubmitPitchOutput {
  dealId: string;
}

const REQUIRED_STRING_FIELDS: (keyof DealsSubmitPitchInput)[] = [
  "companyName",
  "companyEmail",
  "entrepreneurName",
  "entrepreneurEmail",
  "entrepreneurPhone",
  "executiveSummary",
  "teamInformation",
  "raiseMethod",
];

function assertValid(input: DealsSubmitPitchInput) {
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof input[field] !== "string" || !(input[field] as string).trim()) {
      throw new HttpsError("invalid-argument", `${field} is required.`);
    }
  }
  if (!FUNDING_ROUNDS.includes(input.round)) {
    throw new HttpsError("invalid-argument", `round must be one of ${FUNDING_ROUNDS.join(", ")}.`);
  }
  if (!SECURITY_TYPES.includes(input.securityType)) {
    throw new HttpsError("invalid-argument", `securityType must be one of ${SECURITY_TYPES.join(", ")}.`);
  }
  if (!Number.isFinite(input.seekingAmount) || input.seekingAmount <= 0) {
    throw new HttpsError("invalid-argument", "seekingAmount must be a positive number.");
  }
  if (!Number.isFinite(input.preMoneyValuation) || input.preMoneyValuation <= 0) {
    throw new HttpsError("invalid-argument", "preMoneyValuation must be a positive number.");
  }
  for (const flag of [
    "hasLeadInvestor",
    "willHaveInterestBearingDebtAfterClose",
    "hasExistingInterestBearingDebt",
    "hasRestrictedBusinessLines",
  ] as const) {
    if (typeof input[flag] !== "boolean") {
      throw new HttpsError("invalid-argument", `${flag} must be a boolean.`);
    }
  }
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
  { enforceAppCheck: true, secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    const input = request.data;
    assertValid(input);

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

    const dealId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "deal" (
           "company_name", "company_email", "entrepreneur_name", "entrepreneur_email",
           "entrepreneur_phone", "executive_summary", "team_information", "round",
           "security_type", "seeking_amount", "pre_money_valuation", "has_lead_investor",
           "lead_investor_name", "will_have_interest_bearing_debt_after_close",
           "has_existing_interest_bearing_debt", "has_restricted_business_lines",
           "raise_method", "referred_by", "stage", "drive_folder_id", "drive_folder_url",
           "created_at", "updated_at"
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
           'NEW', $19, $20, now(), now()
         ) RETURNING id`,
        [
          input.companyName,
          input.companyEmail,
          input.entrepreneurName,
          input.entrepreneurEmail,
          input.entrepreneurPhone,
          input.executiveSummary,
          input.teamInformation,
          input.round,
          input.securityType,
          input.seekingAmount,
          input.preMoneyValuation,
          input.hasLeadInvestor,
          input.leadInvestorName ?? null,
          input.willHaveInterestBearingDebtAfterClose,
          input.hasExistingInterestBearingDebt,
          input.hasRestrictedBusinessLines,
          input.raiseMethod,
          input.referredBy ?? null,
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

      return id;
    });

    return { dealId };
  }
);
