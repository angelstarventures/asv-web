import { listAiPromptSettings, listAppSettings } from "@/lib/dataconnect/client";
import { AiPromptSettingsForm } from "@/components/AiPromptSettingsForm";
import { AppSettingsForm } from "@/components/AppSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [{ aiPromptSettings }, { appSettings }] = await Promise.all([listAiPromptSettings(), listAppSettings()]);
  const byKey = new Map(aiPromptSettings.map((s) => [s.key, s.prompt]));
  const appByKey = new Map(appSettings.map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <AppSettingsForm
        aiChatEnabled={(appByKey.get("member_ai_chat_enabled") ?? "true") === "true"}
        lockedScenario={appByKey.get("member_locked_scenario") ?? ""}
      />

      <AiPromptSettingsForm
        settingKey="document_analysis"
        label="Document analysis prompt"
        description="Used when an admin uploads a document (SPA, unit schedule, company update, exit or compliance notice) and asks the AI to draft ledger record(s) for review."
        currentPrompt={byKey.get("document_analysis") ?? null}
      />

      <AiPromptSettingsForm
        settingKey="portfolio_chat"
        label="Portfolio chat prompt"
        description="Used to seed the AI query chat pane in the member Portfolio tab."
        currentPrompt={byKey.get("portfolio_chat") ?? null}
      />
    </div>
  );
}
