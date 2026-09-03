import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// The DealStage Postgres enum also still has LEAD/DUE_DILIGENCE/PRESENTING/INVESTED/INACTIVE
// (kept for cheap-migration reasons, see schema.gql's DealStage comment) — this app-level list
// is the actual set members/admins can pick from.
const DEAL_STAGES = ["NEW", "OLD", "PASSED", "ARCHIVED"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export interface DealsUpdateStageInput {
  dealId: string;
  stage: DealStage;
}

export const dealsUpdateStage = onCall<DealsUpdateStageInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { dealId, stage } = request.data;

  if (typeof dealId !== "string" || !dealId) {
    throw new HttpsError("invalid-argument", "dealId is required.");
  }
  if (!DEAL_STAGES.includes(stage)) {
    throw new HttpsError("invalid-argument", `stage must be one of ${DEAL_STAGES.join(", ")}.`);
  }

  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE "deal" SET stage = $1, "updated_at" = now() WHERE id = $2`,
      [stage, dealId]
    );
    if (rowCount === 0) {
      throw new HttpsError("not-found", "Deal not found.");
    }
  });

  return { ok: true };
});
