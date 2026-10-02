import type { PoolClient } from "pg";
import { tenantConfig } from "./tenantConfig";

// "Has Lead"/"Halal" are auto-managed tags: unlike the admin-only manual tags (deals-manageTag.ts/
// deals-assignTag.ts), these always reflect the deal's own current field state — every submit/
// update call re-syncs the assignment instead of leaving it to drift. Both tag rows are seeded
// lazily (create-if-missing) the first time either is needed, so there's no manual setup step.

export const AUTO_TAG_NAMES = {
  HAS_LEAD: "Has Lead",
  HALAL: "Halal",
} as const;

export interface DealAutoTagFlags {
  hasLeadInvestor: boolean;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasRestrictedBusinessLines: boolean;
}

async function resolveTagId(client: PoolClient, name: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(`SELECT id FROM "deal_tag" WHERE name = $1`, [name]);
  if (rows.length > 0) return rows[0].id;
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO "deal_tag" (name, "created_at") VALUES ($1, now()) RETURNING id`,
    [name]
  );
  return inserted.rows[0].id;
}

async function setAssignment(client: PoolClient, dealId: string, tagId: string, shouldHaveTag: boolean): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM "deal_tag_assignment" WHERE "deal_id" = $1 AND "tag_id" = $2`,
    [dealId, tagId]
  );
  const has = rows.length > 0;
  if (shouldHaveTag && !has) {
    await client.query(`INSERT INTO "deal_tag_assignment" ("deal_id", "tag_id") VALUES ($1, $2)`, [dealId, tagId]);
  } else if (!shouldHaveTag && has) {
    await client.query(`DELETE FROM "deal_tag_assignment" WHERE id = $1`, [rows[0].id]);
  }
}

// Deliberately doesn't fold in hasExistingInterestBearingDebt — "Halal" here is specifically
// about debt the round itself would leave the company with, which is what
// willHaveInterestBearingDebtAfterClose already means; pre-existing debt is a separate signal.
export async function syncAutoTagsForDeal(client: PoolClient, dealId: string, flags: DealAutoTagFlags): Promise<void> {
  const hasLeadTagId = await resolveTagId(client, AUTO_TAG_NAMES.HAS_LEAD);
  await setAssignment(client, dealId, hasLeadTagId, flags.hasLeadInvestor);

  // Halal/Shariah compliance auto-tag — only runs when compliance screening is enabled for this
  // deployment. A disabled tenant never gets the tag created at all, not just relabeled.
  if (tenantConfig.complianceScreening.enabled) {
    const halalTagId = await resolveTagId(client, AUTO_TAG_NAMES.HALAL);
    await setAssignment(
      client,
      dealId,
      halalTagId,
      !flags.willHaveInterestBearingDebtAfterClose && !flags.hasRestrictedBusinessLines
    );
  }
}
