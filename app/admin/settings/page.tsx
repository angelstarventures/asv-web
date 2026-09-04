import { redirect } from "next/navigation";
import { listAiPromptSettings, listAppSettings } from "@/lib/dataconnect/client";
import { AiPromptSettingsForm } from "@/components/AiPromptSettingsForm";
import { AppSettingsForm } from "@/components/AppSettingsForm";
import { getCurrentMember } from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // Defense in depth — proxy.ts already gates /admin/settings to site_admin, but this page
  // doesn't only trust the middleware, matching the pattern elsewhere in the admin surface.
  const current = await getCurrentMember();
  if (current?.role !== "site_admin") redirect("/admin/members");

  const [{ aiPromptSettings }, { appSettings }] = await Promise.all([listAiPromptSettings(), listAppSettings()]);
  const byKey = new Map(aiPromptSettings.map((s) => [s.key, s.prompt]));
  const appByKey = new Map(appSettings.map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <AppSettingsForm
        aiChatEnabled={(appByKey.get("member_ai_chat_enabled") ?? "true") === "true"}
        siteAdminLockedScenario={appByKey.get("site_admin_locked_scenario") ?? ""}
        adminLockedScenario={appByKey.get("admin_locked_scenario") ?? ""}
        memberLockedScenario={appByKey.get("member_locked_scenario") ?? ""}
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
