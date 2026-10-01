import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireExactRole, requireDevSiteAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";

// ── Organization membership assignment ──────────────────────────────────────
// The angel fund/tenant itself (Organization) is distinct from Company (a portfolio
// startup ASV has invested in) — see schema.gql's comment. Determines which org an admin
// "belongs to" for company_member_management scoping (see the permissions-overhaul plan).
// A member belongs to at most one organization at a time — uniqueness isn't a DB
// constraint, so assigning a member who already has a row moves them rather than creating
// a duplicate. Expect exactly one Organization row (this deployment's own fund) under the
// template-per-deployment model for the foreseeable future.

export interface ListOrganizationsOutput {
  organizations: { id: string; name: string }[];
}

// dev_site_admin or site_admin — read-only, lets the UI look up "the" organization's id
// without hardcoding it.
export const listOrganizations = onCall<Record<string, never>, Promise<ListOrganizationsOutput>>(
  async (request) => {
    await requireDevSiteAdmin(request);
    const rows = await query<{ id: string; name: string }>(`SELECT id, name FROM "organization" ORDER BY name`);
    return { organizations: rows };
  }
);

export interface AssignOrganizationMemberInput {
  memberId: string;
  organizationId: string;
  roleInOrganization?: string;
}

// dev_site_admin only (see requireExactRole's comment for why not requireDevSiteAdmin).
export const assignOrganizationMember = onCall<AssignOrganizationMemberInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireExactRole(request, "dev_site_admin");

    const { memberId, organizationId, roleInOrganization } = request.data;
    if (!memberId || !organizationId) {
      throw new HttpsError("invalid-argument", "memberId and organizationId are required.");
    }

    await withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM "organization_member" WHERE "member_id" = $1`,
        [memberId]
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE "organization_member" SET "organization_id" = $1, "role_in_organization" = $2 WHERE "member_id" = $3`,
          [organizationId, roleInOrganization ?? null, memberId]
        );
      } else {
        await client.query(
          `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
           VALUES ($1, $2, $3, now())`,
          [organizationId, memberId, roleInOrganization ?? null]
        );
      }
    });

    return { ok: true };
  }
);

export interface RemoveOrganizationMemberInput {
  memberId: string;
}

// dev_site_admin only, same boundary as assignOrganizationMember.
export const removeOrganizationMember = onCall<RemoveOrganizationMemberInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireExactRole(request, "dev_site_admin");

    const { memberId } = request.data;
    if (!memberId) {
      throw new HttpsError("invalid-argument", "memberId is required.");
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "organization_member" WHERE "member_id" = $1`, [memberId]);
    });

    return { ok: true };
  }
);

export interface ListOrganizationMembersInput {
  organizationId: string;
}
export interface ListOrganizationMembersOutput {
  members: { memberId: string; displayName: string; email: string; roleInOrganization: string | null }[];
}

// dev_site_admin or site_admin — read-only, useful for both tiers to audit assignments
// (unlike the mutating functions above, this doesn't need the narrower exact-role boundary).
export const listOrganizationMembers = onCall<
  ListOrganizationMembersInput,
  Promise<ListOrganizationMembersOutput>
>(async (request) => {
  await requireDevSiteAdmin(request);

  const { organizationId } = request.data;
  if (!organizationId) {
    throw new HttpsError("invalid-argument", "organizationId is required.");
  }

  const rows = await query<{
    memberId: string;
    displayName: string;
    email: string;
    roleInOrganization: string | null;
  }>(
    `SELECT om."member_id" AS "memberId", m."display_name" AS "displayName", m.email,
            om."role_in_organization" AS "roleInOrganization"
     FROM "organization_member" om
     JOIN "member" m ON m.id = om."member_id"
     WHERE om."organization_id" = $1
     ORDER BY m."display_name"`,
    [organizationId]
  );

  return { members: rows };
});
