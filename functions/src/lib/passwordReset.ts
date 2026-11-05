import { randomBytes } from "node:crypto";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { HttpsError } from "firebase-functions/v2/https";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./dataconnect-admin";
import { tenantConfig } from "./tenantConfig";

export const PASSWORD_RESET_TTL_MS = 48 * 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 5 * 60 * 1000;
const INVALID_LINK = "This link has expired, has already been used, or was replaced by a newer link. Request a new password reset email.";
type ResetMember = { id: string; email: string; authUid: string | null; expiresAt: Date | string | null };
const RESET_MEMBER_SQL = `SELECT id, email, auth_uid AS "authUid", password_reset_expires_at AS "expiresAt"
  FROM member WHERE password_reset_token = $1`;

function assertToken(token: unknown): asserts token is string {
  if (typeof token !== "string" || !/^[a-f0-9]{32,64}$/i.test(token)) {
    throw new HttpsError("failed-precondition", INVALID_LINK);
  }
}

function expiryMs(value: Date | string | null): number {
  return value instanceof Date ? value.getTime() : value ? Date.parse(value) : NaN;
}

async function readResetMember(token: string, client?: PoolClient): Promise<ResetMember> {
  const rows = client
    ? (await client.query<ResetMember>(RESET_MEMBER_SQL + " FOR UPDATE", [token])).rows
    : await query<ResetMember>(RESET_MEMBER_SQL, [token]);
  const member = rows[0];
  if (!member || !Number.isFinite(expiryMs(member.expiresAt)) || expiryMs(member.expiresAt) <= Date.now()) {
    throw new HttpsError("failed-precondition", INVALID_LINK);
  }
  return member;
}

async function resetUser(member: ResetMember): Promise<UserRecord> {
  if (!member.authUid || !member.email) throw new HttpsError("failed-precondition", "This account is not ready. Ask an admin for a new invitation.");
  let user: UserRecord;
  try { user = await getAuth().getUser(member.authUid); }
  catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") throw new HttpsError("failed-precondition", INVALID_LINK);
    throw new HttpsError("unavailable", "Could not check this link. Please try again.");
  }
  // Account changes and password resets invalidate older emailed links too.
  const issuedAt = expiryMs(member.expiresAt) - PASSWORD_RESET_TTL_MS;
  const revokedAt = Date.parse(user.tokensValidAfterTime ?? "");
  if (user.disabled || user.email?.toLowerCase() !== member.email.toLowerCase() || revokedAt > issuedAt) {
    throw new HttpsError("failed-precondition", INVALID_LINK);
  }
  return user;
}

// Opening a link (including a mail preview or repeated browser request) never consumes it.
export async function inspectPasswordReset(token: unknown) {
  assertToken(token);
  const member = await readResetMember(token);
  await resetUser(member);
  return {
    email: member.email,
    expiresAt: new Date(expiryMs(member.expiresAt)).toISOString(),
    // Older /set-password clients can redirect to the new form through this existing route.
    resetLink: `${tenantConfig.appDomain}/auth/action?mode=resetPassword&resetToken=${encodeURIComponent(token)}`,
  };
}

export async function completePasswordResetWithToken(token: unknown, password: unknown): Promise<{ ok: true }> {
  assertToken(token);
  if (typeof password !== "string" || password.length < 8 || password.length > 4096) {
    throw new HttpsError("invalid-argument", "Choose a password between 8 and 4096 characters.");
  }
  return withTransaction(async client => {
    // Serialize submissions/resends. The second submission cannot reuse a successful reset.
    const member = await readResetMember(token, client);
    const user = await resetUser(member);
    let link: string;
    try { link = await getAuth().generatePasswordResetLink(member.email); }
    catch { throw new HttpsError("unavailable", "Could not update your password. Please try again."); }
    const params = new URL(link).searchParams;
    const code = params.get("oobCode");
    if (!code) throw new HttpsError("internal", "Password reset is not configured correctly.");
    // Create/consume Firebase's short-lived code only when the user actually submits.
    // This retains Firebase password-policy checks and automatic session revocation.
    const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const endpoint = emulator
      ? `http://${emulator}/identitytoolkit.googleapis.com/v1/accounts:resetPassword`
      : "https://identitytoolkit.googleapis.com/v1/accounts:resetPassword";
    let response: Response;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!emulator) {
        // Use the server's IAM credential, not the referrer-restricted browser API key.
        const app = getAuth().app;
        const credential = app.options.credential;
        if (!credential) throw new Error("Missing server credential");
        headers.Authorization = `Bearer ${(await credential.getAccessToken()).access_token}`;
        const projectId = app.options.projectId ?? process.env.GCLOUD_PROJECT;
        if (projectId) headers["x-goog-user-project"] = projectId;
      }
      response = await fetch(endpoint, {
        method: "POST", headers,
        body: JSON.stringify({ oobCode: code, newPassword: password }), signal: AbortSignal.timeout(20000),
      });
    } catch { throw new HttpsError("unavailable", "Could not update your password. Please try again."); }
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const message = result.error?.message ?? "";
      if (/WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET_REQUIREMENTS/.test(message)) {
        throw new HttpsError("invalid-argument", "This password does not meet the account's password requirements. Choose a stronger password.");
      }
      if (/TOO_MANY_ATTEMPTS/.test(message)) throw new HttpsError("resource-exhausted", "Please wait a moment before trying again.");
      throw new HttpsError("unavailable", "Could not update your password. Please try again.");
    }
    // Only successful password changes can clear the forced-change flag or consume the link.
    try {
      const latest = await getAuth().getUser(user.uid);
      if (latest.customClaims?.mustChangePassword) {
        const claims = { ...latest.customClaims };
        delete claims.mustChangePassword;
        await getAuth().setCustomUserClaims(user.uid, claims);
      }
    } catch { console.error("Password changed but forced-change claim could not be cleared", { memberId: member.id }); }
    await client.query(`UPDATE member SET password_reset_token = NULL, password_reset_expires_at = NULL
      WHERE id = $1 AND password_reset_token = $2`, [member.id, token]);
    return { ok: true };
  });
}

export async function requestMemberPasswordReset(
  email: unknown,
  send: (member: { id: string; email: string; displayName: string }, link: string) => Promise<void>,
): Promise<{ ok: true }> {
  if (typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: true };
  await withTransaction(async client => {
    const { rows } = await client.query<{ id: string; email: string; displayName: string; authUid: string; expiresAt: Date | string | null }>(
      `SELECT id, email, display_name AS "displayName", auth_uid AS "authUid", password_reset_expires_at AS "expiresAt"
       FROM member WHERE lower(email) = $1 AND auth_uid IS NOT NULL FOR UPDATE`, [email.trim().toLowerCase()]);
    const member = rows[0];
    if (!member) return;
    let user: UserRecord;
    try { user = await getAuth().getUser(member.authUid); }
    catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") return;
      throw new HttpsError("unavailable", "Could not request a reset email. Please try again.");
    }
    if (user.disabled || user.email?.toLowerCase() !== member.email.toLowerCase()) return;
    const issuedAt = expiryMs(member.expiresAt) - PASSWORD_RESET_TTL_MS;
    const revokedAt = Date.parse(user.tokensValidAfterTime ?? "");
    if (Number.isFinite(issuedAt) && Date.now() - issuedAt < REQUEST_COOLDOWN_MS && !(revokedAt > issuedAt)) return;
    const token = randomBytes(24).toString("hex");
    await client.query(`UPDATE member SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3`,
      [token, new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(), member.id]);
    await send(member, `${tenantConfig.appDomain}/set-password?token=${token}`);
  });
  // Identical result for unknown, disabled and valid accounts.
  return { ok: true };
}
