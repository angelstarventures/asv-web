import { listAiPromptSettings, listAiProviderSettings, listAppSettings } from "@/lib/dataconnect/client";
import { AiPromptSettingsForm } from "@/components/AiPromptSettingsForm";
import { AiProviderSettingsForm } from "@/components/AiProviderSettingsForm";
import { AppSettingsForm } from "@/components/AppSettingsForm";
import { tenantConfig } from "@/lib/config/tenant";
import type { AiProvider, SearchBackend } from "@/lib/functions/adminSettings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [{ aiPromptSettings }, { aiProviderSettings }, { appSettings }] = await Promise.all([
    listAiPromptSettings(),
    listAiProviderSettings(),
    listAppSettings(),
  ]);
  const byKey = new Map(aiPromptSettings.map((s) => [s.key, s.prompt]));
  const providerByKey = new Map(
    aiProviderSettings.map((s) => [
      s.key,
      {
        provider: s.provider as AiProvider,
        model: s.openrouterModel ?? null,
        providerSlug: s.openrouterProviderSlug ?? null,
        searchBackend: s.searchBackend as SearchBackend,
      },
    ])
  );
  const appByKey = new Map(appSettings.map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <AppSettingsForm
        memberAnnualDuesAmount={appByKey.get("member_annual_dues_amount") ?? ""}
        associateAnnualDuesAmount={appByKey.get("associate_annual_dues_amount") ?? ""}
        duesReminderTemplate={
          appByKey.get("dues_reminder_template") ??
          tenantConfig.duesReminderTemplateDefault
        }
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

      <h2 className="text-lg font-semibold tracking-tight">AI providers</h2>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Route any single AI-calling feature through OpenRouter (any model reachable through
        openrouter.ai, e.g. a free-tier one) instead of Vertex AI. Document analysis and
        Portfolio chat lose Vertex&apos;s context caching under OpenRouter (full context is
        resent every call), and each has its own separate Web search backend setting below for
        the live web search they each do (market research / NEEDS_RESEARCH) — defaults to
        Vertex&apos;s Google Search grounding, switchable to cheaper Serper.dev results.
      </p>

      <AiProviderSettingsForm
        settingKey="deal_keyword_generation"
        label="Deal keyword generation"
        description="Runs once per deal, the first time an admin clicks 'Send for review', if the deal has no keywords yet."
        currentProvider={providerByKey.get("deal_keyword_generation")?.provider ?? "vertex"}
        currentModel={providerByKey.get("deal_keyword_generation")?.model ?? null}
        currentProviderSlug={providerByKey.get("deal_keyword_generation")?.providerSlug ?? null}
      />

      <AiProviderSettingsForm
        settingKey="deal_reviewer_matching"
        label="Deal reviewer matching"
        description="Runs every time an admin clicks 'Send for review' on a deal."
        currentProvider={providerByKey.get("deal_reviewer_matching")?.provider ?? "vertex"}
        currentModel={providerByKey.get("deal_reviewer_matching")?.model ?? null}
        currentProviderSlug={providerByKey.get("deal_reviewer_matching")?.providerSlug ?? null}
        allowKeywordMatch
        allowEmbeddingMatch
      />

      <AiProviderSettingsForm
        settingKey="document_analysis"
        label="Document analysis"
        description="Drafts ledger records from an admin's uploaded document(s)."
        currentProvider={providerByKey.get("document_analysis")?.provider ?? "vertex"}
        currentModel={providerByKey.get("document_analysis")?.model ?? null}
        currentProviderSlug={providerByKey.get("document_analysis")?.providerSlug ?? null}
        currentSearchBackend={providerByKey.get("document_analysis")?.searchBackend ?? "vertex"}
        allowSearchBackend
      />

      <AiProviderSettingsForm
        settingKey="portfolio_chat"
        label="Portfolio chat"
        description="The member/admin-facing AI chat pane in the Portfolio tab."
        currentProvider={providerByKey.get("portfolio_chat")?.provider ?? "vertex"}
        currentModel={providerByKey.get("portfolio_chat")?.model ?? null}
        currentProviderSlug={providerByKey.get("portfolio_chat")?.providerSlug ?? null}
        currentSearchBackend={providerByKey.get("portfolio_chat")?.searchBackend ?? "vertex"}
        allowSearchBackend
      />
    </div>
  );
}
