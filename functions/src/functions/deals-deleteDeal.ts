import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { deleteDealFolder, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

export interface DealsDeleteDealInput {
  dealId: string;
}

// deal_document/deal_rating/deal_tag_assignment all have ON DELETE CASCADE on deal_id, so
// deleting the deal row is enough at the DB level. The Drive folder is a separate, best-effort
// cleanup (never blocks the DB delete on a Drive failure — an orphaned Drive folder is a much
// smaller problem than a deal an admin can no longer remove).
export const dealsDeleteDeal = onCall<DealsDeleteDealInput, Promise<{ ok: true }>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    await requireAdmin(request);
    const { dealId } = request.data;
    if (!dealId) {
      throw new HttpsError("invalid-argument", "dealId is required.");
    }

    const deals = await query<{ driveFolderId: string | null }>(
      `SELECT "drive_folder_id" AS "driveFolderId" FROM "deal" WHERE id = $1`,
      [dealId]
    );
    if (deals.length === 0) {
      throw new HttpsError("not-found", "Deal not found.");
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "deal" WHERE id = $1`, [dealId]);
    });

    const driveFolderId = deals[0].driveFolderId;
    if (driveFolderId) {
      try {
        await deleteDealFolder(driveFolderId);
      } catch {
        // Best-effort — the deal record is already gone, which is what the admin asked for.
      }
    }

    return { ok: true };
  }
);
