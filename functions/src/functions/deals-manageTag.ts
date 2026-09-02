import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// Admin-managed deal-list filter tags (create/rename/delete) — the left-panel "Filter by
// Label" checkboxes on the member/admin deal list read these via ListDealTags.
export interface DealsManageTagInput {
  action: "create" | "rename" | "delete";
  tagId?: string;
  name?: string;
  color?: string;
}

export const dealsManageTag = onCall<DealsManageTagInput, Promise<{ ok: true; tagId?: string }>>(
  async (request) => {
    await requireAdmin(request);
    const { action, tagId, name, color } = request.data;

    if (action === "create") {
      if (!name?.trim()) {
        throw new HttpsError("invalid-argument", "name is required.");
      }
      const newTagId = await withTransaction(async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO "deal_tag" (name, color, "created_at") VALUES ($1, $2, now()) RETURNING id`,
          [name.trim(), color ?? null]
        );
        return rows[0].id;
      });
      return { ok: true, tagId: newTagId };
    }

    if (!tagId) {
      throw new HttpsError("invalid-argument", "tagId is required.");
    }

    if (action === "rename") {
      if (!name?.trim()) {
        throw new HttpsError("invalid-argument", "name is required.");
      }
      await withTransaction(async (client) => {
        const { rowCount } = await client.query(
          `UPDATE "deal_tag" SET name = $1, color = $2 WHERE id = $3`,
          [name.trim(), color ?? null, tagId]
        );
        if (rowCount === 0) throw new HttpsError("not-found", "Tag not found.");
      });
      return { ok: true };
    }

    if (action === "delete") {
      await withTransaction(async (client) => {
        await client.query(`DELETE FROM "deal_tag_assignment" WHERE "tag_id" = $1`, [tagId]);
        await client.query(`DELETE FROM "deal_tag" WHERE id = $1`, [tagId]);
      });
      return { ok: true };
    }

    throw new HttpsError("invalid-argument", "action must be create, rename, or delete.");
  }
);
