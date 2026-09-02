"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAppSetting } from "@/lib/functions/adminSettings";

const SCENARIO_LOCK_OPTIONS = [
  { value: "", label: "Let members choose (Optimistic / Balanced / Conservative)" },
  { value: "optimistic", label: "Optimistic only" },
  { value: "balanced", label: "Balanced only" },
  { value: "conservative", label: "Conservative only" },
];

// Simplified-member-view controls: hide the AI portfolio chat, and/or lock every member's
// ledger view to one scenario (hiding the Optimistic/Balanced/Conservative picker entirely).
// Both read app_setting via ListAppSettings and write through the single updateAppSetting
// callable, same shape as AiPromptSettingsForm.
export function AppSettingsForm({
  aiChatEnabled,
  lockedScenario,
}: {
  aiChatEnabled: boolean;
  lockedScenario: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"chat" | "scenario" | null>(null);

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

  async function handleScenarioChange(value: string) {
    setError(null);
    setNotice(null);
    setBusy("scenario");
    try {
      await updateAppSetting({ key: "member_locked_scenario", value });
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
        <h2 className="text-sm font-medium">Simplified member view</h2>
        <p className="text-sm text-zinc-500">
          Reduce what members see on their Portfolio tab — useful for a simpler, less
          overwhelming rollout.
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

      <label className="flex flex-col gap-1 text-sm">
        Ledger scenario shown to members
        <select
          value={lockedScenario}
          disabled={busy === "scenario"}
          onChange={(e) => handleScenarioChange(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        >
          {SCENARIO_LOCK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
