import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled } from "../lib/organizationFeatureCheck";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { getAppSetting } from "../lib/appSettings";
import { sendEmail } from "../lib/gmail";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

interface MemberDuesRow {
  displayName: string;
  email: string;
  phoneNumber: string | null;
  membershipType: string;
}

async function buildReminderMessage(member: MemberDuesRow): Promise<string> {
  const amountKey = member.membershipType === "ASSOCIATE" ? "associate_annual_dues_amount" : "member_annual_dues_amount";
  const [amount, template] = await Promise.all([getAppSetting(amountKey), getAppSetting("dues_reminder_template")]);
  const year = new Date().getFullYear();
  return template
    .replaceAll("{name}", member.displayName)
    .replaceAll("{amount}", amount || "—")
    .replaceAll("{year}", String(year));
}

export interface MembersSendDuesReminderInput {
  memberId: string;
  channel: "whatsapp" | "email";
}

export interface MembersSendDuesReminderOutput {
  message: string; // built reminder text — the caller opens wa.me with it for "whatsapp";
  // ignored (already sent server-side) for "email"
}

// requireAdmin, not requireSiteAdmin — dues reminders are a regular admin operation, matching
// the fee-amount settings' own posture (functions/src/functions/app-updateSetting.ts).
export const membersSendDuesReminder = onCall<MembersSendDuesReminderInput, Promise<MembersSendDuesReminderOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "MEMBERSHIP_DUES");
    const { memberId, channel } = request.data;
    if (!memberId || (channel !== "whatsapp" && channel !== "email")) {
      throw new HttpsError("invalid-argument", 'memberId and channel ("whatsapp" | "email") are required.');
    }

    const rows = await query<MemberDuesRow>(
      `SELECT "display_name" AS "displayName", email, "phone_number" AS "phoneNumber", "membership_type" AS "membershipType"
       FROM "member" WHERE id = $1`,
      [memberId]
    );
    const member = rows[0];
    if (!member) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }

    const message = await buildReminderMessage(member);

    if (channel === "email") {
      try {
        await sendEmail({ to: member.email, subject: "ASV Membership Dues Reminder", body: message });
      } catch (err) {
        console.error("membersSendDuesReminder: email send failed", err);
        throw new HttpsError(
          "internal",
          "Could not send the email — the sending account likely hasn't been granted email-send permission yet."
        );
      }
    }

    return { message };
  }
);

export interface UpdateMemberDuesStatusInput {
  memberId: string;
  sent: boolean;
}

// A separate, explicit action from actually sending the reminder — a WhatsApp/email send can
// silently fail to land (wrong number, bounce), so this is never auto-set on send; the admin
// confirms it actually went out.
export const updateMemberDuesStatus = onCall<UpdateMemberDuesStatusInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);
  await requireFeatureEnabled(caller, "MEMBERSHIP_DUES");
  const { memberId, sent } = request.data;
  if (!memberId || typeof sent !== "boolean") {
    throw new HttpsError("invalid-argument", "memberId and sent are required.");
  }

  const members = await query<{ id: string }>(`SELECT id FROM "member" WHERE id = $1`, [memberId]);
  if (members.length === 0) {
    throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "member" SET "dues_sent_for_year" = $1 WHERE id = $2`, [
      sent ? new Date().getFullYear() : null,
      memberId,
    ]);
  });

  return { ok: true };
});
