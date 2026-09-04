import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin, requireCaller } from "../lib/auth";
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
    // an account exists without claims. mustChangePassword: true since the admin (not the
    // member) chose this password — proxy.ts redirects to /change-password until they set
    // their own, cleared by memberCompletePasswordChange below.
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role,
      status: "active",
      memberId,
      mustChangePassword: true,
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

export interface CreateMemberInput {
  displayName: string;
  email: string;
  role: "admin" | "member";
}

export interface CreateMemberOutput {
  memberId: string;
}

// Member rows otherwise only ever come from the legacy migration (functions/scripts/
// migrate-legacy-data.ts) — this is the only path that inserts a brand-new one. It only
// creates the row; linking a Firebase Auth account is still a separate provisionMember call,
// same as it is for every migrated member.
export const createMember = onCall<CreateMemberInput, Promise<CreateMemberOutput>>(async (request) => {
  await requireAdmin(request);

  const { displayName, email, role } = request.data;
  if (!displayName?.trim() || !email?.trim() || !role) {
    throw new HttpsError("invalid-argument", "displayName, email, and role are required.");
  }

  const memberId = await withTransaction(async (client) => {
    // Member.id is a zero-padded 5-digit string (plan §2) with gaps from the legacy import —
    // max+1 rather than a sequence, since this only ever runs one at a time from the admin UI.
    const { rows } = await client.query<{ max: string | null }>(`SELECT MAX(id) AS max FROM "member"`);
    const nextId = (Number(rows[0]?.max ?? "0") + 1).toString().padStart(5, "0");

    try {
      // investing_entity_name defaults to display_name (same as every backfilled row) — no
      // separate input for it on the "new member" form yet, since it's meant to be edited
      // independently later rather than collected up front.
      await client.query(
        `INSERT INTO "member" (id, "display_name", "investing_entity_name", email, role, status, "created_at")
         VALUES ($1, $2, $2, $3, $4, 'ACTIVE', now())`,
        [nextId, displayName.trim(), email.trim(), role.toUpperCase()]
      );
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      if (code === "23505") {
        throw new HttpsError("already-exists", `Email "${email}" is already in use.`);
      }
      throw err;
    }

    return nextId;
  });

  return { memberId };
});

const MEMBERSHIP_TYPES = ["BOARD_MEMBER", "MEMBER", "ASSOCIATE", "EMERITUS"] as const;
type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

export interface UpdateMemberInput {
  memberId: string;
  displayName: string;
  investingEntityName: string;
  membershipType: MembershipType;
  profileText?: string | null;
  phoneNumber?: string | null;
  expertiseKeywords?: string[] | null;
}

// Backs the "Edit member" form on app/admin/members/[memberId] — the only path that changes
// an existing Member row's name/investing-entity/membership-type/profile-text fields after
// creation. membershipType is an org classification (board member/member/associate/emeritus),
// admin-only, distinct from Role (a pure app-permission level).
export const updateMember = onCall<UpdateMemberInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);

  const { memberId, displayName, investingEntityName, membershipType, profileText, phoneNumber, expertiseKeywords } =
    request.data;
  if (!memberId || !displayName?.trim() || !investingEntityName?.trim() || !membershipType) {
    throw new HttpsError(
      "invalid-argument",
      "memberId, displayName, investingEntityName, and membershipType are required."
    );
  }
  if (!MEMBERSHIP_TYPES.includes(membershipType)) {
    throw new HttpsError("invalid-argument", `membershipType must be one of: ${MEMBERSHIP_TYPES.join(", ")}.`);
  }

  const members = await query<{ id: string }>(`SELECT id FROM "member" WHERE id = $1`, [memberId]);
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "display_name" = $1, "investing_entity_name" = $2, "membership_type" = $3, "profile_text" = $4,
              "phone_number" = $5, "expertise_keywords" = $6
       WHERE id = $7`,
      [
        displayName.trim(),
        investingEntityName.trim(),
        membershipType,
        profileText?.trim() || null,
        phoneNumber?.trim() || null,
        expertiseKeywords && expertiseKeywords.length > 0 ? expertiseKeywords : null,
        memberId,
      ]
    );
  });

  return { ok: true };
});

export interface UpdateOwnProfileInput {
  displayName: string;
  investingEntityName: string;
  profileText?: string | null;
  phoneNumber?: string | null;
  expertiseKeywords?: string[] | null;
}

// Self-service analog of updateMember, for app/member/settings — memberId is never a
// client-supplied input here, only the caller's own (requireCaller re-derives it from the
// verified token), so a member can only ever edit their own row, matching the Data Isolation
// principle enforced everywhere else in this app. membershipType is deliberately NOT
// self-editable — it's an admin-controlled org classification, same posture as Role.
export const updateOwnProfile = onCall<UpdateOwnProfileInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);

  const { displayName, investingEntityName, profileText, phoneNumber, expertiseKeywords } = request.data;
  if (!displayName?.trim() || !investingEntityName?.trim()) {
    throw new HttpsError("invalid-argument", "displayName and investingEntityName are required.");
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "display_name" = $1, "investing_entity_name" = $2, "profile_text" = $3,
              "phone_number" = $4, "expertise_keywords" = $5
       WHERE id = $6`,
      [
        displayName.trim(),
        investingEntityName.trim(),
        profileText?.trim() || null,
        phoneNumber?.trim() || null,
        expertiseKeywords && expertiseKeywords.length > 0 ? expertiseKeywords : null,
        caller.memberId,
      ]
    );
  });

  return { ok: true };
});

export interface UpdateOwnPhotoInput {
  // A full `data:image/<type>;base64,<data>` URI, or null to remove the current photo.
  photoDataUrl: string | null;
}

const PHOTO_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+=*)$/;
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // decoded size — a profile photo, not a document

// Self-service, same Data Isolation posture as updateOwnProfile — memberId always comes from
// requireCaller, never client input. Stored as a data: URL directly on the member row rather
// than in a separate object-storage bucket (no Cloud Storage bucket exists in this project yet,
// and a profile photo is small enough that this is a reasonable V1 shortcut).
export const updateOwnPhoto = onCall<UpdateOwnPhotoInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);
  const { photoDataUrl } = request.data;

  if (photoDataUrl === null) {
    await withTransaction(async (client) => {
      await client.query(`UPDATE "member" SET "photo_url" = NULL WHERE id = $1`, [caller.memberId]);
    });
    return { ok: true };
  }

  const match = PHOTO_DATA_URL_PATTERN.exec(photoDataUrl ?? "");
  if (!match) {
    throw new HttpsError("invalid-argument", "photoDataUrl must be a data:image/(png|jpeg|webp|gif);base64,... URI.");
  }
  const decodedBytes = Buffer.from(match[2], "base64").byteLength;
  if (decodedBytes > MAX_PHOTO_BYTES) {
    throw new HttpsError("invalid-argument", `Photo exceeds the ${MAX_PHOTO_BYTES / (1024 * 1024)}MB limit.`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET "photo_url" = $1 WHERE id = $2`, [photoDataUrl, caller.memberId]);
  });

  return { ok: true };
});

export interface UpdatePhotoForMemberInput {
  memberId: string;
  // A full `data:image/<type>;base64,<data>` URI, or null to remove the current photo.
  photoDataUrl: string | null;
}

// Admin analog of updateOwnPhoto, for the "Edit member" flow on app/admin/members/[memberId]
// — memberId is an explicit input here (unlike updateOwnPhoto's caller-derived id) since an
// admin edits someone else's row, gated by requireAdmin rather than Data Isolation.
export const updatePhotoForMember = onCall<UpdatePhotoForMemberInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { memberId, photoDataUrl } = request.data;
  if (!memberId) {
    throw new HttpsError("invalid-argument", "memberId is required.");
  }

  const members = await query<{ id: string }>(`SELECT id FROM "member" WHERE id = $1`, [memberId]);
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }

  if (photoDataUrl === null) {
    await withTransaction(async (client) => {
      await client.query(`UPDATE "member" SET "photo_url" = NULL WHERE id = $1`, [memberId]);
    });
    return { ok: true };
  }

  const match = PHOTO_DATA_URL_PATTERN.exec(photoDataUrl ?? "");
  if (!match) {
    throw new HttpsError("invalid-argument", "photoDataUrl must be a data:image/(png|jpeg|webp|gif);base64,... URI.");
  }
  const decodedBytes = Buffer.from(match[2], "base64").byteLength;
  if (decodedBytes > MAX_PHOTO_BYTES) {
    throw new HttpsError("invalid-argument", `Photo exceeds the ${MAX_PHOTO_BYTES / (1024 * 1024)}MB limit.`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET "photo_url" = $1 WHERE id = $2`, [photoDataUrl, memberId]);
  });

  return { ok: true };
});

export interface AdminSetTemporaryPasswordInput {
  memberId: string;
  temporaryPassword: string; // shown once to the admin to relay out-of-band
}

// Replaces the old "generate a reset link" flow — the admin now sets the password directly
// (getAuth().updateUser, same Admin SDK call provisionMember already uses to create one), and
// mustChangePassword forces the member to pick their own on next login, same as provisionMember.
// Revokes refresh tokens so a currently-active stale session can't keep using the old password's
// session past this point (same reasoning as setMemberStatus's disable path).
export const adminSetTemporaryPassword = onCall<AdminSetTemporaryPasswordInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireAdmin(request);

    const { memberId, temporaryPassword } = request.data;
    if (!memberId || !temporaryPassword || temporaryPassword.length < 8) {
      throw new HttpsError(
        "invalid-argument",
        "memberId and a temporaryPassword of at least 8 characters are required."
      );
    }

    const members = await query<{ authUid: string | null }>(
      `SELECT "auth_uid" AS "authUid" FROM "member" WHERE id = $1`,
      [memberId]
    );
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }
    const authUid = members[0].authUid;
    if (!authUid) {
      throw new HttpsError("failed-precondition", "This member has not been provisioned with a login yet.");
    }

    await getAuth().updateUser(authUid, { password: temporaryPassword });

    const user = await getAuth().getUser(authUid);
    const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
    await getAuth().setCustomUserClaims(authUid, { ...existingClaims, mustChangePassword: true });
    await getAuth().revokeRefreshTokens(authUid);

    return { ok: true };
  }
);

// Self-service — called by the member themselves right after they successfully set their own
// password on the forced /change-password screen, clearing the flag so proxy.ts stops
// redirecting them there. No revokeRefreshTokens here (unlike setMemberStatus/setMemberRole):
// the caller is actively completing this flow in their own current session, not being acted on
// by someone else, so there's no stale-session window to close.
export const memberCompletePasswordChange = onCall<Record<string, never>, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);

  const user = await getAuth().getUser(caller.uid);
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  const { mustChangePassword: _drop, ...rest } = existingClaims;
  void _drop;
  await getAuth().setCustomUserClaims(caller.uid, rest);

  return { ok: true };
});

export interface SetMemberRoleInput {
  memberId: string;
  role: "admin" | "member" | "site_admin";
}

// Only meaningful for an already-provisioned member (authUid set) — provisionMember takes its
// own role input at link time and doesn't read the member row's existing role column, so
// changing role before provisioning would just get silently overwritten by whatever role is
// passed to provisionMember later. Self-changes are blocked so an admin can't accidentally
// demote (or redundantly promote) themselves. Revokes refresh tokens on change, same reasoning
// as setMemberStatus's disable path — proxy.ts's checkRevoked=true session-cookie check means
// a stale session cookie would otherwise keep the OLD role active until it naturally expires.
export const setMemberRole = onCall<SetMemberRoleInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);

  const { memberId, role } = request.data;
  if (!memberId || (role !== "admin" && role !== "member" && role !== "site_admin")) {
    throw new HttpsError(
      "invalid-argument",
      "memberId and a valid role ('admin', 'member', or 'site_admin') are required."
    );
  }
  if (memberId === caller.memberId) {
    throw new HttpsError("failed-precondition", "You cannot change your own role.");
  }

  const members = await query<{ authUid: string | null; role: string }>(
    `SELECT "auth_uid" AS "authUid", role FROM "member" WHERE id = $1`,
    [memberId]
  );
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }
  const authUid = members[0].authUid;
  if (!authUid) {
    throw new HttpsError("failed-precondition", "This member has not been provisioned with a login yet.");
  }

  // Granting OR revoking the top tier is site-admin-only — a plain admin can still toggle
  // member<->admin freely (unchanged from before), but can't touch the site-admin tier at all.
  const targetIsSiteAdmin = members[0].role === "SITE_ADMIN";
  if ((role === "site_admin" || targetIsSiteAdmin) && caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Only a site-admin can grant or revoke the site-admin role.");
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET role = $1 WHERE id = $2`, [role.toUpperCase(), memberId]);
  });

  const user = await getAuth().getUser(authUid);
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  await getAuth().setCustomUserClaims(authUid, { ...existingClaims, role });
  await getAuth().revokeRefreshTokens(authUid);

  return { ok: true };
});

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
