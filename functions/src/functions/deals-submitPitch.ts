import { onCall, HttpsError } from "firebase-functions/v2/https";
import { withTransaction } from "../lib/dataconnect-admin";
import { createDealFolder, uploadDealFile, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import { generateContent } from "../lib/vertexAi";
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

// Best-effort only — a slow/unreachable company site or a flaky Gemini call must never block a
// real pitch submission, so every failure here just leaves sector/keywords/location null rather
// than throwing. Fetches the site's raw HTML (no JS rendering) and lets Gemini work from that; a
// company URL that's JS-only client-rendered may yield weaker results, which is an acceptable
// tradeoff for not running a full headless browser inside this function.
async function detectCompanyProfile(
  url: string
): Promise<{ sector: string | null; keywords: string[] | null; location: string | null }> {
  const empty = { sector: null, keywords: null, location: null };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    // A real browser User-Agent — some sites (confirmed: tesla.com) return a bare 403 to
    // Node's default fetch UA as basic bot-blocking. This doesn't get past JS-challenge-based
    // protection (Cloudflare etc.), which is an accepted limitation for a best-effort feature.
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return empty;
    const html = (await res.text()).slice(0, 50_000);

    const text = await generateContent({
      systemPrompt:
        "You classify early-stage startup companies from their website's raw HTML. Respond with ONLY a JSON object " +
        'of the exact shape {"sector": string, "keywords": string[], "location": string|null} — sector is a short ' +
        '(1-4 word) industry classification (e.g. "Biotech", "Medical Devices", "CPG", "IT/Software"). keywords is ' +
        "3-8 professional skill/expertise-area terms relevant to this company's specific domain and technology — " +
        "these are used to match this deal against fund members who might have that skill or expertise, so phrase " +
        "each one the way a person would list it as a skill on their own resume or LinkedIn profile (e.g. " +
        '"Machine Learning", "Synthetic Biology", "Medical Device Regulatory Affairs", "Supply Chain Management", ' +
        '"B2B SaaS Sales", "Embedded Systems Engineering"), NOT product/marketing buzzwords describing the company ' +
        "itself (avoid things like \"AI-powered\" or \"next-generation platform\") — every keyword should read as " +
        "something a qualified person could plausibly claim as their own expertise. location is the company's " +
        'headquarters city and state/country (e.g. "San Francisco, CA" or "London, UK") if it can be determined ' +
        "from the page, otherwise null. No prose, no markdown, just the JSON object.",
      parts: [`Company website HTML:\n\n${html}`],
      responseMimeType: "application/json",
    });

    const parsed = JSON.parse(text) as { sector?: unknown; keywords?: unknown; location?: unknown };
    const sector = typeof parsed.sector === "string" && parsed.sector.trim() ? parsed.sector.trim() : null;
    const keywords =
      Array.isArray(parsed.keywords) && parsed.keywords.every((k) => typeof k === "string")
        ? (parsed.keywords as string[]).map((k) => k.trim()).filter(Boolean)
        : null;
    const location = typeof parsed.location === "string" && parsed.location.trim() ? parsed.location.trim() : null;
    return { sector, keywords: keywords && keywords.length > 0 ? keywords : null, location };
  } catch (err) {
    // Logged (not rethrown) so a silent sector/keywords/location miss is still visible in Cloud
    // Logging without ever surfacing as a failed submission to the entrepreneur.
    console.error("detectCompanyProfile: best-effort classification failed", err);
    return empty;
  }
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

    const [folder, { sector, keywords, location }] = await Promise.all([
      createDealFolder(rootFolderId, input.companyName),
      detectCompanyProfile(input.companyUrl),
    ]);
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
          sector,
          keywords,
          location,
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

      return id;
    });

    return { dealId };
  }
);
