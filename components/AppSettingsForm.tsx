"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAppSetting } from "@/lib/functions/adminSettings";

const SCENARIO_LOCK_OPTIONS = [
  { value: "", label: "Let them choose (Optimistic / Balanced / Conservative)" },
  { value: "optimistic", label: "Optimistic only" },
  { value: "balanced", label: "Balanced only" },
  { value: "conservative", label: "Conservative only" },
];

type ScenarioSettingKey = "site_admin_locked_scenario" | "admin_locked_scenario" | "member_locked_scenario";

// Simplified-view controls: hide the AI portfolio chat, and/or lock a role tier's ledger view to
// one scenario (hiding the Optimistic/Balanced/Conservative picker entirely for that tier). Each
// of the three role tiers gets its own independent lock — an admin viewing their own portfolio is
// no longer implicitly bound by whatever's configured for members, and vice versa. Both read
// app_setting via ListAppSettings and write through the single updateAppSetting callable, same
// shape as AiPromptSettingsForm.
export function AppSettingsForm({
  aiChatEnabled,
  siteAdminLockedScenario,
  adminLockedScenario,
  memberLockedScenario,
}: {
  aiChatEnabled: boolean;
  siteAdminLockedScenario: string;
  adminLockedScenario: string;
  memberLockedScenario: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"chat" | ScenarioSettingKey | null>(null);

  async function handleChatToggle(checked: boolean) {
    setError(null);
    setNotice(null);
    setBusy("chat");
    try {
      await updateAppSetting({ key: "member_ai_chat_enabled", value: checked ? "true" : "false" });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this setting.");
    } finally {
      setBusy(null);
    }
  }

  async function handleScenarioChange(key: ScenarioSettingKey, value: string) {
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

  const scenarioRows: { key: ScenarioSettingKey; label: string; value: string }[] = [
    { key: "site_admin_locked_scenario", label: "Scenario shown to site-admins", value: siteAdminLockedScenario },
    { key: "admin_locked_scenario", label: "Scenario shown to admins", value: adminLockedScenario },
    { key: "member_locked_scenario", label: "Scenario shown to members", value: memberLockedScenario },
  ];

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5">
      <div>
        <h2 className="text-sm font-medium">Simplified view</h2>
        <p className="text-sm text-zinc-500">
          Reduce what each role tier sees on their Portfolio tab — useful for a simpler, less
          overwhelming rollout. Each tier&apos;s lock is independent: locking members to one
          scenario doesn&apos;t affect what admins or site-admins see of their own portfolio.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700">{notice}</p>}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={aiChatEnabled}
          disabled={busy === "chat"}
          onChange={(e) => handleChatToggle(e.target.checked)}
        />
        Show the AI portfolio chat to members
      </label>

      {scenarioRows.map((row) => (
        <label key={row.key} className="flex flex-col gap-1 text-sm">
          {row.label}
          <select
            value={row.value}
            disabled={busy === row.key}
            onChange={(e) => handleScenarioChange(row.key, e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            {SCENARIO_LOCK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
