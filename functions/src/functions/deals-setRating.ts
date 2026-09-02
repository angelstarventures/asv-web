import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireCaller } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// Any signed-in member (not admin-only) can rate/review a deal — one editable row per
// (deal, member), upserted by lookup rather than a DB-level composite unique constraint
// (see schema.gql's DealRating comment for why).
export interface DealsSetRatingInput {
  dealId: string;
  rating: number;
  review?: string;
}

export const dealsSetRating = onCall<DealsSetRatingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);
  const { dealId, rating, review } = request.data;

  if (typeof dealId !== "string" || !dealId) {
    throw new HttpsError("invalid-argument", "dealId is required.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpsError("invalid-argument", "rating must be an integer between 1 and 5.");
  }

  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "deal_rating" WHERE "deal_id" = $1 AND "member_id" = $2`,
      [dealId, caller.memberId]
    );

    if (rows.length > 0) {
      await client.query(
        `UPDATE "deal_rating" SET rating = $1, review = $2, "updated_at" = now() WHERE id = $3`,
        [rating, review ?? null, rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO "deal_rating" ("deal_id", "member_id", rating, review, "updated_at")
         VALUES ($1, $2, $3, $4, now())`,
        [dealId, caller.memberId, rating, review ?? null]
      );
    }
  });

  return { ok: true };
});
