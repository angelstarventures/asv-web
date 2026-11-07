"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAppSetting, type AppSettingKey } from "@/lib/functions/adminSettings";

// Fund-wide carry settings for internal (member-to-member) transfers: the fixed DD-lead and
// management carry rates, and the one member who receives management carry. A Sale transfer
// cannot be recorded until a recipient is chosen (a plain owner replacement is unaffected).
export function TransferFeeSettingsForm({
  ddLeadPercent,
  managementPercent,
  managementMemberId,
  members,
}: {
  ddLeadPercent: string;
  managementPercent: string;
  managementMemberId: string;
  members: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<AppSettingKey | null>(null);

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
        <h2 className="text-sm font-medium">Transfer carry</h2>
        <p className="text-sm text-zinc-500">
          Applied to each seller&apos;s gain when members sell to each other at a discount to the round price. The same rates
          apply to a full exit.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700">{notice}</p>}

      <label className="flex flex-col gap-1 text-sm">
        DD-lead carry (% of seller gain)
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={ddLeadPercent}
          disabled={busy === "transfer_dd_lead_carry_percent"}
          onBlur={(e) => save("transfer_dd_lead_carry_percent", e.target.value.trim())}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Management carry (% of seller gain)
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={managementPercent}
          disabled={busy === "transfer_management_carry_percent"}
          onBlur={(e) => save("transfer_management_carry_percent", e.target.value.trim())}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Management carry recipient
        <select
          defaultValue={managementMemberId}
          disabled={busy === "transfer_management_carry_member_id"}
          onChange={(e) => e.target.value && save("transfer_management_carry_member_id", e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        >
          <option value="">— not set (sales cannot be recorded) —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.id})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
