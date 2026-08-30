import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";

// The ONLY path that ever sets role/status custom claims (plan §3/§4). Backs the admin
// "add member" flow at app/admin/members/page.tsx. This is the frontend/backend contract
// point — input/output shape here must be nailed down before Milestone 3.

export interface ProvisionMemberInput {
  memberId: string; // existing zero-padded 5-digit Member.id (row must already exist)
  email: string;
  role: "admin" | "member";
  temporaryPassword: string; // shown once to the admin to relay out-of-band
}

export interface ProvisionMemberOutput {
  authUid: string;
  email: string;
}

export const provisionMember = onCall<ProvisionMemberInput, Promise<ProvisionMemberOutput>>(
  async (request) => {
    await requireAdmin(request);

    const { memberId, email, role, temporaryPassword } = request.data;
    if (!memberId || !email || !role || !temporaryPassword) {
      throw new HttpsError("invalid-argument", "memberId, email, role, and temporaryPassword are required.");
    }

    const members = await query<{ id: string; authUid: string | null }>(
      `SELECT id, "auth_uid" AS "authUid" FROM "member" WHERE id = $1`,
      [memberId]
    );
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}". Create the member row first.`);
    }
    if (members[0].authUid) {
      throw new HttpsError("already-exists", `Member "${memberId}" is already linked to an auth account.`);
    }

    const userRecord = await getAuth().createUser({ email, password: temporaryPassword });

    // Custom claims are the sole enforcement input for proxy.ts (formerly middleware.ts) —
    // set them in the same call that links the auth account so there's never a window where
    // an account exists without claims.
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role,
      status: "active",
      memberId,
    });

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE "member" SET "auth_uid" = $1, role = $2, status = 'ACTIVE', email = $3 WHERE id = $4`,
        [userRecord.uid, role.toUpperCase(), email, memberId]
      );
    });

    return { authUid: userRecord.uid, email };
  }
);

export interface AdminTriggerPasswordResetInput {
  memberId: string;
}

export const adminTriggerPasswordReset = onCall<AdminTriggerPasswordResetInput, Promise<{ resetLink: string }>>(
  async (request) => {
    await requireAdmin(request);

    const { memberId } = request.data;
    const members = await query<{ email: string }>(`SELECT email FROM "member" WHERE id = $1`, [memberId]);
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }

    const resetLink = await getAuth().generatePasswordResetLink(members[0].email);
    return { resetLink };
  }
);

export interface SetMemberStatusInput {
  memberId: string;
  status: "active" | "disabled";
}

// Disabling a member here revokes refresh tokens too, so proxy.ts's checkRevoked=true
// session-cookie check takes effect immediately rather than waiting for token expiry.
export const setMemberStatus = onCall<SetMemberStatusInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);

  const { memberId, status } = request.data;
  const members = await query<{ authUid: string | null }>(
    `SELECT "auth_uid" AS "authUid" FROM "member" WHERE id = $1`,
    [memberId]
  );
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET status = $1 WHERE id = $2`, [status.toUpperCase(), memberId]);
  });

  const authUid = members[0].authUid;
  if (authUid) {
    const user = await getAuth().getUser(authUid);
    const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
    await getAuth().setCustomUserClaims(authUid, { ...existingClaims, status });
    if (status === "disabled") {
      await getAuth().revokeRefreshTokens(authUid);
    }
  }

  return { ok: true };
});
