import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { requireAdmin, requireCaller, requireSiteAdmin, validateRoleForOrganization, clearOrgNameCache, getOrgName } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { sendEmail } from "../lib/gmail";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import { tenantConfig } from "../lib/tenantConfig";

// The ONLY path that ever sets role/status custom claims (plan §3/§4). Backs the admin
// "add member" flow at app/admin/members/page.tsx.

// ── Helpers ───────────────────────────────────────────────────────────────────

const APP_DOMAIN = tenantConfig.appDomain;
const ORG_NAME = tenantConfig.orgDisplayName;

// Generates a random token and stores it with a 48-hour expiry on the member row.
// Returns the custom link the user will receive via email.
async function storePasswordResetToken(memberId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "password_reset_token" = $1, "password_reset_expires_at" = $2 WHERE id = $3`,
      [token, expiresAt.toISOString(), memberId]
    );
  });

  return `${APP_DOMAIN}/set-password?token=${token}`;
}

// Sends a password-set/reset email via Gmail. The link goes through our app's
// /set-password page which validates the 48-hour token, then redirects to a
// fresh Firebase password reset link.
async function sendPasswordSetEmail(
  email: string,
  displayName: string,
  memberId: string
): Promise<void> {
  const customLink = await storePasswordResetToken(memberId);

  await sendEmail({
    to: email,
    subject: `Set your ${ORG_NAME} account password`,
    body: [
      `Hi ${displayName},`,
      "",
      `An admin has created an account for you on the ${ORG_NAME} member portal.`,
      "Click the link below to set your password and sign in:",
      "",
      customLink,
      "",
      "This link expires in 48 hours. If you didn't expect this email, you can safely ignore it.",
      "",
      `— ${ORG_NAME}`,
    ].join("\n"),
  });
}

// Sends a password-reset email via Gmail — distinct from the provisioning email above.
// Called when an admin explicitly requests a password reset for an existing member.
async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  memberId: string
): Promise<void> {
  const customLink = await storePasswordResetToken(memberId);

  await sendEmail({
    to: email,
    subject: `Password reset request for ${ORG_NAME}`,
    body: [
      `Hi ${displayName},`,
      "",
      `An admin has requested that you reset your ${ORG_NAME} member portal password.`,
      "Click the link below to choose a new password and sign in:",
      "",
      customLink,
      "",
      "This link expires in 48 hours. If you didn't request this, you can safely ignore this email.",
      "",
      `— ${ORG_NAME}`,
    ].join("\n"),
  });
}

export interface ProvisionMemberInput {
  memberId: string; // existing zero-padded 5-digit Member.id (row must already exist)
  email: string;
  role: "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";
  displayName: string; // used in the invitation email
}

export interface ProvisionMemberOutput {
  authUid: string;
  email: string;
}

export const provisionMember = onCall<ProvisionMemberInput, Promise<ProvisionMemberOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    const caller = await requireAdmin(request);

    // Admin callers can only provision "user" or "admin" roles — no escalation to
    // site_admin/dev_site_admin/developer (those require explicit site_admin/dev_site_admin action).
    if (caller.role === "admin") {
      const ALLOWED_FOR_ADMIN = ["user", "admin"] as const;
      if (!ALLOWED_FOR_ADMIN.includes(request.data.role as typeof ALLOWED_FOR_ADMIN[number])) {
        throw new HttpsError(
          "permission-denied",
          "As an admin, you can only provision regular members (user or admin role)."
        );
      }
    }

    const { memberId, email, role, displayName } = request.data;
    if (!memberId || !email || !role || !displayName) {
      throw new HttpsError("invalid-argument", "memberId, email, role, and displayName are required.");
    }

    const members = await query<{ id: string; authUid: string | null }>(
      `SELECT id, "auth_uid" AS "authUid" FROM "member" WHERE id = $1`,
      [memberId]
    );
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}". Create the member row first.`);
    }
    const existingAuthUid = members[0].authUid;
    if (existingAuthUid) {
      // Member already has an auth account — delete the old one first so it can be
      // re-created with the (possibly updated) email. This handles the case where the
      // Firebase Auth user was deleted from the console but the member row still has
      // a stale authUid, or the admin is changing the email and wants a fresh account.
      try {
        await getAuth().deleteUser(existingAuthUid);
      } catch (err) {
        console.warn(`provisionMember: failed to delete old auth user ${existingAuthUid}:`, err);
        // Continue — the old account may already be gone.
      }
    }

    // Generate a random temporary password for the Firebase Auth account — the member will
    // reset it via the email link, but the account must have a password to exist.
    const temporaryPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "A1!";

    const userRecord = await getAuth().createUser({ email, password: temporaryPassword });

    // Custom claims are the sole enforcement input for proxy.ts (formerly middleware.ts) —
    // set them in the same call that links the auth account so there's never a window where
    // an account exists without claims.
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

    // Send the password-set link via email
    try {
      await sendPasswordSetEmail(email, displayName, memberId);
    } catch (err) {
      console.error("provisionMember: failed to send invitation email", err);
      throw new HttpsError(
        "internal",
        "Account created but could not send the invitation email. The email-sending account may not have been granted email-send permission, or the OAuth credentials need to be refreshed."
      );
    }

    return { authUid: userRecord.uid, email };
  }
);

const MEMBERSHIP_TYPES = ["BOARD_MEMBER", "MEMBER", "ASSOCIATE", "EMERITUS"] as const;
type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

export interface CreateMemberInput {
  displayName: string;
  email: string;
  role: "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";
  // Defaults to MEMBER (matching the schema's own default) when omitted — most new members
  // created via the admin UI are regular members; this only needs to be set explicitly for a
  // batch/import path adding an Associate or Emeritus member directly.
  membershipType?: MembershipType;
  // Which organization this member belongs to. When omitted:
  //   - developer/dev_site_admin callers: must specify (no default)
  //   - admin callers: defaults to the venture group (the non-VentureDesk org)
  organizationId?: string;
}

export interface CreateMemberOutput {
  memberId: string;
  authUid: string;
}

// Member rows otherwise only ever come from the legacy migration (functions/scripts/
// migrate-legacy-data.ts) — this is the only path that inserts a brand-new one.
// Auto-provisions the Firebase Auth account so the member can sign in immediately,
// rather than requiring a separate provisionMember call.
export const createMember = onCall<CreateMemberInput, Promise<CreateMemberOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
  const caller = await requireAdmin(request);

  // Admin callers can only create "user" or "admin" roles (same restriction as provisionMember)
  if (caller.role === "admin") {
    const ALLOWED_FOR_ADMIN = ["user", "admin"] as const;
    if (!ALLOWED_FOR_ADMIN.includes(request.data.role as typeof ALLOWED_FOR_ADMIN[number])) {
      throw new HttpsError(
        "permission-denied",
        "As an admin, you can only assign regular member roles (user or admin)."
      );
    }
  }

  const { displayName, email, role, membershipType, organizationId } = request.data;
  if (!displayName?.trim() || !email?.trim() || !role) {
    throw new HttpsError("invalid-argument", "displayName, email, and role are required.");
  }
  if (membershipType && !MEMBERSHIP_TYPES.includes(membershipType)) {
    throw new HttpsError("invalid-argument", `membershipType must be one of: ${MEMBERSHIP_TYPES.join(", ")}.`);
  }

  // ── Resolve organization ──────────────────────────────────────────────────
  // Admin callers always create venture-group members (non-VentureDesk org).
  // Dev/dev_site_admin callers must specify the organization explicitly.
  let resolvedOrgId = organizationId;
  if (caller.role === "admin") {
    if (resolvedOrgId) {
      // Admin specified an org — validate it's not VentureDesk (admins can only create
      // venture group members).
      const orgName = await getOrgName(resolvedOrgId);
      if (orgName.toLowerCase().includes("venturedesk")) {
        throw new HttpsError(
          "permission-denied",
          "As an admin, you can only create members for the venture group, not VentureDesk."
        );
      }
    } else {
      // Default to the non-VentureDesk org (the venture group).
      const orgRows = await query<{ id: string }>(
        `SELECT id FROM "organization" WHERE LOWER(name) != 'venturedesk' LIMIT 1`
      );
      if (orgRows.length === 0) throw new HttpsError("failed-precondition", "No venture group organization found.");
      resolvedOrgId = orgRows[0].id;
    }
  } else {
    // Dev/dev_site_admin callers: organizationId is required.
    if (!resolvedOrgId) {
      throw new HttpsError("invalid-argument", "organizationId is required when creating members as a developer or dev-site-admin.");
    }
  }

  // ── Validate role × organization compatibility ────────────────────────────
  clearOrgNameCache();
  const orgName = await getOrgName(resolvedOrgId);
  validateRoleForOrganization(role, orgName);

  const memberId = await withTransaction(async (client) => {
    // Member.id is a zero-padded 5-digit string (plan §2) with gaps from the legacy import —
    // max+1 rather than a sequence, since this only ever runs one at a time from the admin UI.
    // Cast to int before MAX: id is a varchar column, and a PLAIN string MAX is lexicographic —
    // a throwaway test row like "99998" would sort above every real id and get returned as the
    // "max" even though it's numerically nowhere near the real sequence, corrupting every
    // subsequent id allocation (confirmed: produced id "99999" for a real new member, then
    // "100000" — too long for the column — on the next).
    const { rows } = await client.query<{ max: string | null }>(`SELECT MAX(id::int) AS max FROM "member"`);
    const nextId = (Number(rows[0]?.max ?? "0") + 1).toString().padStart(5, "0");

    try {
      // investing_entity_name defaults to display_name (same as every backfilled row) — no
      // separate input for it on the "new member" form yet, since it's meant to be edited
      // independently later rather than collected up front.
      await client.query(
        `INSERT INTO "member" (id, "display_name", "investing_entity_name", email, role, "membership_type", status, "created_at")
         VALUES ($1, $2, $2, $3, $4, $5, 'ACTIVE', now())`,
        [nextId, displayName.trim(), email.trim(), role.toUpperCase(), membershipType ?? "MEMBER"]
      );
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      if (code === "23505") {
        throw new HttpsError("already-exists", `Email "${email}" is already in use.`);
      }
      throw err;
    }

    // Create the organization_member row linking this new member to their org
    // (VentureDesk or venture group). Since the member was just created, there is no
    // existing row to conflict with.
    await client.query(
      `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
       VALUES ($1, $2, $3, now())`,
      [resolvedOrgId, nextId, role === "developer" ? "Developer" : role === "dev_site_admin" ? "Dev Site Admin" : "Member"]
    );

    return nextId;
  });

  // ── Auto-provision Firebase Auth account ──────────────────────────────────
  const temporaryPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "A1!";
  const userRecord = await getAuth().createUser({ email: email.trim(), password: temporaryPassword });

  await getAuth().setCustomUserClaims(userRecord.uid, {
    role,
    status: "active",
    memberId,
    mustChangePassword: true,
  });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "auth_uid" = $1 WHERE id = $2`,
      [userRecord.uid, memberId]
    );
  });

  try {
    await sendPasswordSetEmail(email.trim(), displayName.trim(), memberId);
  } catch (err) {
    console.error("createMember: failed to send invitation email", err);
    // Don't fail — the auth account exists, the admin can retry the email from the member detail page.
  }

  return { memberId, authUid: userRecord.uid };
});

export interface UpdateMemberInput {
  memberId: string;
  displayName: string;
  investingEntityName: string;
  membershipType: MembershipType;
  profileText?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  professionalProfileUrl?: string | null;
  interests?: string[] | null;
  expertise?: string[] | null;
}

// Backs the "Edit member" form on app/admin/members/[memberId] — the only path that changes
// an existing Member row's name/investing-entity/membership-type/profile-text fields after
// creation. membershipType is an org classification (board member/member/associate/emeritus),
// admin-only, distinct from Role (a pure app-permission level).
export const updateMember = onCall<UpdateMemberInput, Promise<{ ok: true }>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
  await requireAdmin(request);

  const {
    memberId,
    displayName,
    investingEntityName,
    membershipType,
    profileText,
    phoneNumber,
    email,
    professionalProfileUrl,
    interests,
    expertise,
  } = request.data;
  if (!memberId || !displayName?.trim() || !investingEntityName?.trim() || !membershipType) {
    throw new HttpsError(
      "invalid-argument",
      "memberId, displayName, investingEntityName, and membershipType are required."
    );
  }
  if (!MEMBERSHIP_TYPES.includes(membershipType)) {
    throw new HttpsError("invalid-argument", `membershipType must be one of: ${MEMBERSHIP_TYPES.join(", ")}.`);
  }

  const members = await query<{ id: string; email: string; authUid: string | null; role: string }>(
    `SELECT id, email, "auth_uid" AS "authUid", role FROM "member" WHERE id = $1`,
    [memberId]
  );
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }
  const member = members[0];
  const oldEmail = member.email;
  const authUid = member.authUid;
  const newEmail = email?.trim();

  await withTransaction(async (client) => {
    try {
      await client.query(
        `UPDATE "member" SET "display_name" = $1, "investing_entity_name" = $2, "membership_type" = $3, "profile_text" = $4,
                "phone_number" = $5, "email" = COALESCE($6, "email"),
                "professional_profile_url" = $7, "interests" = $8, "expertise" = $9
         WHERE id = $10`,
        [
          displayName.trim(),
          investingEntityName.trim(),
          membershipType,
          profileText?.trim() || null,
          phoneNumber?.trim() || null,
          newEmail,
          professionalProfileUrl?.trim() || null,
          interests && interests.length > 0 ? interests : null,
          expertise && expertise.length > 0 ? expertise : null,
          memberId,
        ]
      );
    } catch (err) {
      const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
      if (code === "23505") {
        throw new HttpsError("already-exists", `Email "${newEmail}" is already in use.`);
      }
      throw err;
    }
  });

  // ── Sync Firebase Auth when email changes ─────────────────────────────────
  if (!newEmail) {
    // No email change — nothing more to do.
    return { ok: true };
  }

  const emailChanged = newEmail !== oldEmail;

  if (authUid && emailChanged) {
    // Member had an Auth account with the old email — delete it so the old email
    // can be reused and no orphaned account remains.
    try {
      await getAuth().deleteUser(authUid);
    } catch (err) {
      console.warn(`updateMember: failed to delete old Firebase Auth user ${authUid}:`, err);
      // Continue — the old account may already be gone. We'll create a new one.
    }
  }

  if (!authUid || emailChanged) {
    // Create a Firebase Auth account (new or with the updated email).
    const temporaryPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "A1!";
    try {
      const userRecord = await getAuth().createUser({ email: newEmail, password: temporaryPassword });

      await getAuth().setCustomUserClaims(userRecord.uid, {
        role: members[0].role.toLowerCase(),
        status: "active",
        memberId,
        mustChangePassword: true,
      });

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE "member" SET "auth_uid" = $1 WHERE id = $2`,
          [userRecord.uid, memberId]
        );
      });

      try {
        await sendPasswordSetEmail(newEmail, displayName.trim(), memberId);
      } catch (err) {
        console.error("updateMember: failed to send invitation email", err);
      }
    } catch (err) {
      console.error(`updateMember: failed to create Firebase Auth user for ${newEmail}:`, err);
      // Don't fail the whole request — the DB was already updated. The admin
      // can re-provision from the member detail page.
    }
  }

  return { ok: true };
});

const SCENARIO_LOCK_VALUES = ["", "optimistic", "balanced", "conservative"] as const;
type ScenarioLockValue = (typeof SCENARIO_LOCK_VALUES)[number];

export interface UpdateMemberAiSettingsInput {
  memberId: string;
  aiChatEnabled: boolean;
  lockedScenario: ScenarioLockValue; // "" = unlocked
}

// Per-member AI-chat/scenario-lock settings (replaces the old per-role-tier app_setting pair) —
// root-only: only a genuine site_admin may change how ANY member's dashboard/document-review
// behaves, matching this feature's "site-admin as root" posture. Backs the members table's
// root-mode-only controls (components/MembersTable.tsx), not a separate form.
export const updateMemberAiSettings = onCall<UpdateMemberAiSettingsInput, Promise<{ ok: true }>>(
  async (request) => {
    await requireSiteAdmin(request);

    const { memberId, aiChatEnabled, lockedScenario } = request.data;
    if (!memberId || typeof aiChatEnabled !== "boolean" || !SCENARIO_LOCK_VALUES.includes(lockedScenario)) {
      throw new HttpsError(
        "invalid-argument",
        `memberId and aiChatEnabled are required; lockedScenario must be one of: ${SCENARIO_LOCK_VALUES.join(", ")}.`
      );
    }

    const members = await query<{ id: string }>(`SELECT id FROM "member" WHERE id = $1`, [memberId]);
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE "member" SET "ai_chat_enabled" = $1, "locked_scenario" = $2 WHERE id = $3`,
        [aiChatEnabled, lockedScenario ? lockedScenario.toUpperCase() : null, memberId]
      );
    });

    return { ok: true };
  }
);

export interface UpdateOwnProfileInput {
  displayName: string;
  investingEntityName: string;
  profileText?: string | null;
  phoneNumber?: string | null;
  expertise?: string[] | null;
}

// Self-service analog of updateMember, for app/member/settings — memberId is never a
// client-supplied input here, only the caller's own (requireCaller re-derives it from the
// verified token), so a member can only ever edit their own row, matching the Data Isolation
// principle enforced everywhere else in this app. membershipType is deliberately NOT
// self-editable — it's an admin-controlled org classification, same posture as Role.
export const updateOwnProfile = onCall<UpdateOwnProfileInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);

  const { displayName, investingEntityName, profileText, phoneNumber, expertise } = request.data;
  if (!displayName?.trim() || !investingEntityName?.trim()) {
    throw new HttpsError("invalid-argument", "displayName and investingEntityName are required.");
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "display_name" = $1, "investing_entity_name" = $2, "profile_text" = $3,
              "phone_number" = $4, "expertise" = $5
       WHERE id = $6`,
      [
        displayName.trim(),
        investingEntityName.trim(),
        profileText?.trim() || null,
        phoneNumber?.trim() || null,
        expertise && expertise.length > 0 ? expertise : null,
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

export interface SetSiteAdminModeInput {
  on: boolean;
}

// Self-service, site_admin-only: toggles the "root mode" claim that reveals the extra
// site-admin-only surfaces (Settings, per-member AI/scenario editing, viewing another member's
// portfolio) — see lib/siteAdminMode.ts's own header comment for why this is a pure UI-visibility
// gate, never a security boundary by itself. Stored as a custom claim (not a second cookie)
// because Firebase Hosting only ever forwards the `__session` cookie to the SSR backend —
// confirmed in lib/firebase/session.ts's own header comment — so any other cookie a client sets
// is silently dropped before it reaches proxy.ts or any server component. The client must force
// a fresh ID token and re-mint its session cookie after this call for the new claim to take
// effect, same pattern as ForcedPasswordChangeScreen's mustChangePassword clear.
export const setSiteAdminMode = onCall<SetSiteAdminModeInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);
  if (caller.role !== "site_admin") {
    throw new HttpsError("permission-denied", "Site-admin role required.");
  }

  const { on } = request.data;
  if (typeof on !== "boolean") {
    throw new HttpsError("invalid-argument", "on (boolean) is required.");
  }

  const user = await getAuth().getUser(caller.uid);
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  await getAuth().setCustomUserClaims(caller.uid, { ...existingClaims, siteAdminMode: on });

  return { ok: true };
});

export interface SetDevSiteAdminModeInput {
  on: boolean;
}

// Self-service, dev_site_admin-only: toggles the mode claim that reveals the extra
// dev-site-admin surfaces — same pattern as setSiteAdminMode. A dev_site_admin with this off
// sees what a developer sees; on reveals full dev-site-admin surfaces.
export const setDevSiteAdminMode = onCall<SetDevSiteAdminModeInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireCaller(request);
  if (caller.role !== "dev_site_admin") {
    throw new HttpsError("permission-denied", "Dev-site-admin role required.");
  }

  const { on } = request.data;
  if (typeof on !== "boolean") {
    throw new HttpsError("invalid-argument", "on (boolean) is required.");
  }

  const user = await getAuth().getUser(caller.uid);
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  await getAuth().setCustomUserClaims(caller.uid, { ...existingClaims, devSiteAdminMode: on });

  return { ok: true };
});

export interface DeleteMemberInput {
  memberId: string;
}

// Deletes a member only if they have no investment history (allocations or member valuations).
// Prevents accidental deletion of members with financial data. Once a member has any allocation
// or valuation, they're considered a historical investor and cannot be removed from the system.
export const deleteMember = onCall<DeleteMemberInput, Promise<{ ok: true }>>(async (request) => {
  try {
    await requireAdmin(request);

    const { memberId } = request.data;
    if (!memberId) {
      throw new HttpsError("invalid-argument", "memberId is required.");
    }

    // Check the member exists
    const members = await query<{ id: string; authUid: string | null }>(
      `SELECT id, "auth_uid" AS "authUid" FROM "member" WHERE id = $1`,
      [memberId]
    );
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }

    const member = members[0];

    // Check for investment history (allocations or valuations)
    const investments = await query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM (
         SELECT 1 FROM "allocation" WHERE "member_id" = $1
         UNION ALL
         SELECT 1 FROM "member_valuation" WHERE "member_id" = $1
       ) t`,
      [memberId]
    );
    if (investments[0]?.cnt && investments[0].cnt > 0) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot delete this member — they have investment history (allocations or valuations)."
      );
    }

    const authUid = member.authUid;

    // Delete the member row and clean up optional references in one transaction
    // (organization_member may not exist for test members — skip if not found)
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "organization_member" WHERE "member_id" = $1`, [memberId]);
      await client.query(`DELETE FROM "member" WHERE id = $1`, [memberId]);
    });

    // If the member had a Firebase Auth account, delete it too
    if (authUid) {
      try {
        await getAuth().deleteUser(authUid);
      } catch (e) {
        console.warn(`deleteMember: failed to delete auth user ${authUid}:`, e);
      }
    }

    return { ok: true };
  } catch (err) {
    console.error("deleteMember error:", err);
    throw err; // re-throw so Firebase Functions returns the appropriate error
  }
});

export interface AdminSendPasswordResetInput {
  memberId: string;
}

// Sends a password-reset link to an already-provisioned member. Gated to requireAdmin.
export const adminSendPasswordReset = onCall<AdminSendPasswordResetInput, Promise<{ ok: true }>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    await requireAdmin(request);

    const { memberId } = request.data;
    if (!memberId) {
      throw new HttpsError("invalid-argument", "memberId is required.");
    }

    const members = await query<{ authUid: string | null; email: string; displayName: string }>(
      `SELECT "auth_uid" AS "authUid", email, "display_name" AS "displayName" FROM "member" WHERE id = $1`,
      [memberId]
    );
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }
    const member = members[0];
    if (!member.authUid) {
      throw new HttpsError("failed-precondition", "This member has not been provisioned with a login yet.");
    }
    if (!member.email) {
      throw new HttpsError("failed-precondition", "This member has no email address on file.");
    }

    try {
      await sendPasswordResetEmail(member.email, member.displayName, memberId);
    } catch (err) {
      console.error("adminSendPasswordReset: failed to send email", err);
      throw new HttpsError(
        "internal",
        "Could not send the password reset email. The email-sending account may not have been granted email-send permission, or the OAuth credentials need to be refreshed."
      );
    }

    return { ok: true };
  }
);

export interface ValidatePasswordResetTokenInput {
  token: string;
}

export interface ValidatePasswordResetTokenOutput {
  resetLink: string;
}

// Validates a password-reset token (checks expiry, clears it), generates a fresh
// Firebase password reset link, and returns it. The caller's browser redirects to it.
export const validatePasswordResetToken = onCall<
  ValidatePasswordResetTokenInput,
  Promise<ValidatePasswordResetTokenOutput>
>(async (request) => {
  const { token } = request.data;
  if (!token) {
    throw new HttpsError("invalid-argument", "Token is required.");
  }

  const rows = await query<{
    id: string;
    email: string;
    passwordResetToken: string | null;
    passwordResetExpiresAt: string | null;
  }>(
    `SELECT id, email, "password_reset_token" AS "passwordResetToken",
            "password_reset_expires_at" AS "passwordResetExpiresAt"
     FROM "member" WHERE "password_reset_token" = $1`,
    [token]
  );

  if (rows.length === 0) {
    throw new HttpsError("invalid-argument", "Invalid or expired token.");
  }

  const member = rows[0];

  // Log the stored expiry for debugging
  console.log(`validatePasswordResetToken: member=${member.id} expiresAt=${member.passwordResetExpiresAt} now=${new Date().toISOString()}`);

  if (!member.passwordResetExpiresAt) {
    console.error(`validatePasswordResetToken: token ${token} has no expiry for member ${member.id}`);
    throw new HttpsError("invalid-argument", "This link was not stored correctly. Ask an admin to send a new one.");
  }

  const expiresAt = new Date(member.passwordResetExpiresAt).getTime();
  const now = Date.now();

  if (Number.isNaN(expiresAt) || expiresAt < now) {
    // Token expired — still clear it so it can't be reused
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE "member" SET "password_reset_token" = NULL, "password_reset_expires_at" = NULL WHERE id = $1`,
        [member.id]
      );
    });
    throw new HttpsError("invalid-argument", "This link has expired. Ask an admin to send a new one.");
  }

  if (!member.email) {
    throw new HttpsError("failed-precondition", "No email on file for this member.");
  }

  // Clear the token (single-use)
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "member" SET "password_reset_token" = NULL, "password_reset_expires_at" = NULL WHERE id = $1`,
      [member.id]
    );
  });

  // Clear the mustChangePassword flag so the user isn't redirected to the
  // change-password page after resetting via the Firebase link.
  let user;
  try {
    user = await getAuth().getUserByEmail(member.email);
  } catch (err) {
    console.error(`validatePasswordResetToken: Firebase Auth user not found for ${member.email}:`, err);
    throw new HttpsError(
      "failed-precondition",
      "This member does not have a login account yet. Ask an admin to send a new invitation from the member detail page."
    );
  }
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  try {
    await getAuth().setCustomUserClaims(user.uid, { ...existingClaims, mustChangePassword: false });
  } catch (err) {
    console.error(`validatePasswordResetToken: failed to update claims for ${user.uid}:`, err);
  }

  // Generate a fresh Firebase password reset link (1-hour expiry from now, which is
  // fine — the user is clicking at this moment)
  let resetLink: string;
  try {
    resetLink = await getAuth().generatePasswordResetLink(member.email, {
      url: `${APP_DOMAIN}/login`,
      handleCodeInApp: false,
    });
  } catch (err) {
    console.error(`validatePasswordResetToken: failed to generate reset link for ${member.email}:`, err);
    throw new HttpsError(
      "internal",
      "Could not generate a password reset link. The member may not have a Firebase Auth account."
    );
  }

  return { resetLink };
});

export interface SetMemberRoleInput {
  memberId: string;
  role: "developer" | "dev_site_admin" | "site_admin" | "admin" | "user";
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
  const VALID_ROLES = ["developer", "dev_site_admin", "site_admin", "admin", "user"] as const;
  if (!memberId || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    throw new HttpsError(
      "invalid-argument",
      `memberId and a valid role ('developer', 'dev_site_admin', 'site_admin', 'admin', or 'user') are required.`
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

  // Admin callers may only grant "user" or "admin" roles — no escalation to developer/site_admin tiers.
  // This is checked before the site_admin/dev_site_admin guard below because admin should never even
  // reach those checks; the overlap case (admin trying to set site_admin) would also be caught here.
  if (caller.role === "admin" && role !== "user" && role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "As an admin, you can only assign user or admin roles."
    );
  }

  // Granting OR revoking any role requires developer, dev_site_admin, or site_admin.
  const targetRole = members[0].role;
  const targetIsSiteAdmin = targetRole === "SITE_ADMIN";
  const targetIsDevSiteAdmin = targetRole === "DEV_SITE_ADMIN";
  const roleIsSiteAdmin = role === "site_admin";
  const roleIsDevSiteAdmin = role === "dev_site_admin";

  if ((roleIsSiteAdmin || targetIsSiteAdmin) && caller.role !== "site_admin" && caller.role !== "dev_site_admin" && caller.role !== "developer") {
    throw new HttpsError("permission-denied", "Only a developer, dev-site-admin, or site-admin can grant or revoke the site-admin role.");
  }
  if ((roleIsDevSiteAdmin || targetIsDevSiteAdmin) && caller.role !== "site_admin" && caller.role !== "dev_site_admin" && caller.role !== "developer") {
    throw new HttpsError("permission-denied", "Only a developer, dev-site-admin, or site-admin can grant or revoke the dev-site-admin role.");
  }

  const wasAdmin = targetRole === "ADMIN";
  const becomingAdmin = role === "admin";

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET role = $1 WHERE id = $2`, [role.toUpperCase(), memberId]);

    // Auto-assign on promotion to admin: insert organization_member row so the newly promoted
    // admin isn't locked out by org-scoping. Only remove the row on demotion to user — an admin
    // promoted to site_admin or dev_site_admin keeps their org membership (those are still
    // angel-investing-group roles, not VentureDesk).
    if (!wasAdmin && becomingAdmin) {
      const orgs = await client.query<{ id: string }>(`SELECT id FROM "organization" LIMIT 1`);
      if (orgs.rows.length > 0) {
        const orgId = orgs.rows[0].id;
        // Idempotent: skip if already assigned (e.g. re-promotion after manual reassignment)
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM "organization_member" WHERE "member_id" = $1`,
          [memberId]
        );
        if (existing.rows.length === 0) {
          await client.query(
            `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
             VALUES ($1, $2, NULL, now())`,
            [orgId, memberId]
          );
        }
      }
    } else if (wasAdmin && role === "user") {
      await client.query(`DELETE FROM "organization_member" WHERE "member_id" = $1`, [memberId]);
    }
  });

  let user;
  try {
    user = await getAuth().getUser(authUid);
  } catch (err) {
    console.error(`setMemberRole: Firebase Auth user ${authUid} not found:`, err);
    throw new HttpsError(
      "failed-precondition",
      "The member's Firebase Auth account does not exist. You may need to re-provision them first."
    );
  }
  const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  try {
    await getAuth().setCustomUserClaims(authUid, { ...existingClaims, role });
    await getAuth().revokeRefreshTokens(authUid);
  } catch (err) {
    console.error(`setMemberRole: failed to update Firebase Auth for ${authUid}:`, err);
    throw new HttpsError(
      "internal",
      "Member role was updated in the database but could not be synced to Firebase Auth. The role change will take effect on next sign-in."
    );
  }

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
