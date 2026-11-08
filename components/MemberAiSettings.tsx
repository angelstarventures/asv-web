"use client";

import { useState } from "react";
import { updateMemberAiSettings, type ScenarioLockValue } from "@/lib/functions/adminMembers";

const SCENARIO_LOCK_OPTIONS: { value: ScenarioLockValue; label: string }[] = [
  { value: "", label: "Unlocked (all three scenarios)" },
  { value: "optimistic", label: "Optimistic only" },
  { value: "balanced", label: "Balanced only" },
  { value: "conservative", label: "Conservative only" },
];

// A member's AI-chat and scenario-lock settings, on the admin member detail page (site admins
// only; updateMemberAiSettings enforces that server-side). Saves on change. "Unlocked" gives the
// member the scenario toggle on their dashboard; a lock hides it and pins them to one scenario.
export function MemberAiSettings({
  memberId,
  aiChatEnabled: initialAiChat,
  lockedScenario: initialLock,
}: {
  memberId: string;
  aiChatEnabled: boolean;
  lockedScenario: ScenarioLockValue;
}) {
  const [aiChatEnabled, setAiChatEnabled] = useState(initialAiChat);
  const [lockedScenario, setLockedScenario] = useState<ScenarioLockValue>(initialLock);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(next: { aiChatEnabled: boolean; lockedScenario: ScenarioLockValue }, revert: () => void) {
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateMemberAiSettings({ memberId, ...next });
      setSaved(true);
    } catch (err) {
      revert();
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 text-sm dark:border-zinc-800">
      <h2 className="font-medium">Dashboard settings</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={aiChatEnabled}
          disabled={busy}
          onChange={(e) => {
            const prev = aiChatEnabled;
            setAiChatEnabled(e.target.checked);
            save({ aiChatEnabled: e.target.checked, lockedScenario }, () => setAiChatEnabled(prev));
          }}
        />
        AI chat enabled
      </label>
      <label className="flex flex-col gap-1">
        Scenarios
        <select
          value={lockedScenario}
          disabled={busy}
          onChange={(e) => {
            const prev = lockedScenario;
            const next = e.target.value as ScenarioLockValue;
            setLockedScenario(next);
            save({ aiChatEnabled, lockedScenario: next }, () => setLockedScenario(prev));
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SCENARIO_LOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {saved && <p role="status" className="text-xs text-green-700 dark:text-green-400">Saved.</p>}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
