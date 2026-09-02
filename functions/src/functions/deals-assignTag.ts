import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

export interface DealsAssignTagInput {
  dealId: string;
  tagId: string;
  assign: boolean;
}

export const dealsAssignTag = onCall<DealsAssignTagInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { dealId, tagId, assign } = request.data;

  if (!dealId || !tagId) {
    throw new HttpsError("invalid-argument", "dealId and tagId are required.");
  }

  await withTransaction(async (client) => {
    if (assign) {
      const { rows } = await client.query(
        `SELECT id FROM "deal_tag_assignment" WHERE "deal_id" = $1 AND "tag_id" = $2`,
        [dealId, tagId]
      );
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO "deal_tag_assignment" ("deal_id", "tag_id") VALUES ($1, $2)`,
          [dealId, tagId]
        );
      }
    } else {
      await client.query(`DELETE FROM "deal_tag_assignment" WHERE "deal_id" = $1 AND "tag_id" = $2`, [
        dealId,
        tagId,
      ]);
    }
  });

  return { ok: true };
});
