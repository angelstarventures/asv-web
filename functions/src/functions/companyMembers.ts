import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireExactRole, requireDevSiteAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";

// ── Company membership assignment ───────────────────────────────────────────
// Determines which company an admin "belongs to" for company_member_management scoping
// (see the permissions-overhaul plan). A member belongs to at most one company at a time —
// uniqueness isn't a DB constraint (see schema.gql's CompanyMember comment), so assigning a
// member who already has a row moves them to the new company rather than creating a
// duplicate.

export interface AssignCompanyMemberInput {
  memberId: string;
  companyId: string;
  roleInCompany?: string;
}

// dev_site_admin only (see requireExactRole's comment for why not requireDevSiteAdmin).
export const assignCompanyMember = onCall<AssignCompanyMemberInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireExactRole(request, "dev_site_admin");

    const { memberId, companyId, roleInCompany } = request.data;
    if (!memberId || !companyId) {
      throw new HttpsError("invalid-argument", "memberId and companyId are required.");
    }

    await withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM "company_member" WHERE "member_id" = $1`,
        [memberId]
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE "company_member" SET "company_id" = $1, "role_in_company" = $2 WHERE "member_id" = $3`,
          [companyId, roleInCompany ?? null, memberId]
        );
      } else {
        await client.query(
          `INSERT INTO "company_member" ("company_id", "member_id", "role_in_company", "created_at")
           VALUES ($1, $2, $3, now())`,
          [companyId, memberId, roleInCompany ?? null]
        );
      }
    });

    return { ok: true };
  }
);

export interface RemoveCompanyMemberInput {
  memberId: string;
}

// dev_site_admin only, same boundary as assignCompanyMember.
export const removeCompanyMember = onCall<RemoveCompanyMemberInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireExactRole(request, "dev_site_admin");

    const { memberId } = request.data;
    if (!memberId) {
      throw new HttpsError("invalid-argument", "memberId is required.");
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "company_member" WHERE "member_id" = $1`, [memberId]);
    });

    return { ok: true };
  }
);

export interface ListCompanyMembersInput {
  companyId: string;
}
export interface ListCompanyMembersOutput {
  members: { memberId: string; displayName: string; email: string; roleInCompany: string | null }[];
}

// dev_site_admin or site_admin — read-only, useful for both tiers to audit assignments
// (unlike the mutating functions above, this doesn't need the narrower exact-role boundary).
export const listCompanyMembers = onCall<ListCompanyMembersInput, Promise<ListCompanyMembersOutput>>(
  async (request) => {
    await requireDevSiteAdmin(request);

    const { companyId } = request.data;
    if (!companyId) {
      throw new HttpsError("invalid-argument", "companyId is required.");
    }

    const rows = await query<{
      memberId: string;
      displayName: string;
      email: string;
      roleInCompany: string | null;
    }>(
      `SELECT cm."member_id" AS "memberId", m."display_name" AS "displayName", m.email,
              cm."role_in_company" AS "roleInCompany"
       FROM "company_member" cm
       JOIN "member" m ON m.id = cm."member_id"
       WHERE cm."company_id" = $1
       ORDER BY m."display_name"`,
      [companyId]
    );

    return { members: rows };
  }
);
