import { onCall, HttpsError } from "firebase-functions/v2/https";
import { withTransaction } from "../lib/dataconnect-admin";

// The public review page's submit callable — a non-member reviewer has no Firebase Auth session,
// same posture as dealsSubmitPitch: no requireCaller/requireAdmin, App Check is the abuse-
// prevention layer instead.

export interface DealsSubmitPublicReviewInput {
  dealId: string;
  reviewerName: string;
  reviewerContact: string;
  comment: string;
}

function assertValid(input: DealsSubmitPublicReviewInput) {
  if (typeof input.dealId !== "string" || !input.dealId) {
    throw new HttpsError("invalid-argument", "dealId is required.");
  }
  if (!input.reviewerName?.trim()) {
    throw new HttpsError("invalid-argument", "Your name is required.");
  }
  if (!input.reviewerContact?.trim()) {
    throw new HttpsError("invalid-argument", "An email or phone number is required.");
  }
  if (!input.comment?.trim()) {
    throw new HttpsError("invalid-argument", "A comment is required.");
  }
}

export const dealsSubmitPublicReview = onCall<DealsSubmitPublicReviewInput, Promise<{ ok: true }>>(
  { enforceAppCheck: true },
  async (request) => {
    const input = request.data;
    assertValid(input);

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(`SELECT id FROM "deal" WHERE id = $1`, [input.dealId]);
      if (rows.length === 0) {
        throw new HttpsError("not-found", "Deal not found.");
      }
      await client.query(
        `INSERT INTO "deal_public_review" ("deal_id", "reviewer_name", "reviewer_contact", comment, "created_at")
         VALUES ($1, $2, $3, $4, now())`,
        [input.dealId, input.reviewerName.trim(), input.reviewerContact.trim(), input.comment.trim()]
      );
    });

    return { ok: true };
  }
);
