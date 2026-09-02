"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateAiPromptSetting, type AiPromptSettingKey } from "@/lib/functions/adminSettings";

// One editable section per prompt key — reused for both "document_analysis" and
// "portfolio_chat" rather than duplicating the same form twice. If no row has ever been
// saved for this key, the textarea starts empty; the feature falls back to a builtin default
// (functions/src/lib/aiPrompts.ts) until an admin saves a real one here.
export function AiPromptSettingsForm({
  settingKey,
  label,
  description,
  currentPrompt,
}: {
  settingKey: AiPromptSettingKey;
  label: string;
  description: string;
  currentPrompt: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateAiPromptSetting({ key: settingKey, prompt: String(form.get("prompt")) });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prompt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-medium">{label}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">{description}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}
      <label className="flex flex-col gap-1 text-sm">
        Prompt
        <textarea
          name="prompt"
          rows={8}
          defaultValue={currentPrompt ?? ""}
          placeholder={currentPrompt === null ? "Using the built-in default — type here to override it." : undefined}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-1 self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
