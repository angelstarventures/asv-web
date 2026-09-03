import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// A deal is "above the line" simply by having a non-null rank — this is the one write path
// for that, covering add-to-list, remove-from-list (rank: null), and reordering (batched after
// a drag-and-drop in the UI, committed in one call rather than one request per row moved).
export interface DealRankUpdate {
  dealId: string;
  rank: number | null;
}

export interface DealsSetRanksInput {
  updates: DealRankUpdate[];
}

export const dealsSetRanks = onCall<DealsSetRanksInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { updates } = request.data;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new HttpsError("invalid-argument", "updates must be a non-empty array.");
  }
  for (const u of updates) {
    if (!u.dealId || (u.rank !== null && (!Number.isInteger(u.rank) || u.rank < 1))) {
      throw new HttpsError("invalid-argument", "Each update needs a dealId and a rank that is null or a positive integer.");
    }
  }

  await withTransaction(async (client) => {
    for (const u of updates) {
      await client.query(`UPDATE "deal" SET rank = $1, "updated_at" = now() WHERE id = $2`, [u.rank, u.dealId]);
    }
  });

  return { ok: true };
});
