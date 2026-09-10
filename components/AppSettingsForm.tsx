"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAppSetting, type AppSettingKey } from "@/lib/functions/adminSettings";

// Fund-wide dues settings — the AI-chat/scenario-lock controls that used to live here (one pair
// per role tier) moved to per-member settings on the members table, editable only in site-admin
// root mode (see components/MembersTable.tsx) — a viewer's own tier no longer determines what
// they see; each member is configured individually now.
export function AppSettingsForm({
  memberAnnualDuesAmount,
  associateAnnualDuesAmount,
  duesReminderTemplate,
}: {
  memberAnnualDuesAmount: string;
  associateAnnualDuesAmount: string;
  duesReminderTemplate: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<AppSettingKey | null>(null);
  const [template, setTemplate] = useState(duesReminderTemplate);

  async function save(key: AppSettingKey, value: string) {
    setError(null);
    setNotice(null);
    setBusy(key);
    try {
      await updateAppSetting({ key, value });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this setting.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5">
      <div>
        <h2 className="text-sm font-medium">Membership dues</h2>
        <p className="text-sm text-zinc-500">
          Annual fee amounts, used when sending a dues reminder from the members table.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700">{notice}</p>}

      <label className="flex flex-col gap-1 text-sm">
        Annual dues — Member ($)
        <input
          type="number"
          min="0"
          step="1"
          defaultValue={memberAnnualDuesAmount}
          disabled={busy === "member_annual_dues_amount"}
          onBlur={(e) => save("member_annual_dues_amount", e.target.value.trim())}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Annual dues — Associate ($)
        <input
          type="number"
          min="0"
          step="1"
          defaultValue={associateAnnualDuesAmount}
          disabled={busy === "associate_annual_dues_amount"}
          onBlur={(e) => save("associate_annual_dues_amount", e.target.value.trim())}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Reminder message template — placeholders: {"{name}"}, {"{amount}"}, {"{year}"}
        <textarea
          rows={3}
          value={template}
          disabled={busy === "dues_reminder_template"}
          onChange={(e) => setTemplate(e.target.value)}
          onBlur={(e) => save("dues_reminder_template", e.target.value.trim())}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}
