"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAiProviderSetting, type AiFeatureKey, type AiProvider, type SearchBackend } from "@/lib/functions/adminSettings";

// One editable section per feature key — site-admin-only switch between Vertex AI (the
// existing Gemini-via-Vertex default) and OpenRouter (any model reachable through
// openrouter.ai, e.g. a free-tier one), same per-key form shape as AiPromptSettingsForm. A
// feature with no row yet defaults to Vertex, so this never blocks real AI calls until an
// admin actively opts a feature into OpenRouter.
export function AiProviderSettingsForm({
  settingKey,
  label,
  description,
  currentProvider,
  currentModel,
  currentProviderSlug,
  allowKeywordMatch,
  allowEmbeddingMatch,
  currentSearchBackend,
  allowSearchBackend,
}: {
  settingKey: AiFeatureKey;
  label: string;
  description: string;
  currentProvider: AiProvider;
  currentModel: string | null;
  currentProviderSlug: string | null;
  // Only meaningful for deal_reviewer_matching — these two non-generative fallbacks
  // (functions/src/lib/keywordMatch.ts, embeddingMatch.ts) have no equivalent for the other 3
  // features.
  allowKeywordMatch?: boolean;
  allowEmbeddingMatch?: boolean;
  // Only meaningful for document_analysis/portfolio_chat — the other 2 features never do a
  // live web search, so this control is hidden for them.
  currentSearchBackend?: SearchBackend;
  allowSearchBackend?: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<AiProvider>(currentProvider);
  const [model, setModel] = useState(currentModel ?? "");
  const [providerSlug, setProviderSlug] = useState(currentProviderSlug ?? "");
  const [searchBackend, setSearchBackend] = useState<SearchBackend>(currentSearchBackend ?? "vertex");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    setNotice(null);
    if (provider === "openrouter" && !model.trim()) {
      setError("An OpenRouter model id is required (e.g. meta-llama/llama-3.3-70b-instruct:free).");
      return;
    }
    setBusy(true);
    try {
      await updateAiProviderSetting({
        key: settingKey,
        provider,
        openrouterModel: provider === "openrouter" ? model.trim() : null,
        openrouterProviderSlug: provider === "openrouter" ? providerSlug.trim() || null : null,
        searchBackend: allowSearchBackend ? searchBackend : undefined,
      });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
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
        Provider
        <select
          value={provider}
          disabled={busy}
          onChange={(e) => setProvider(e.target.value as AiProvider)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="vertex">Vertex AI (Gemini)</option>
          <option value="openrouter">OpenRouter</option>
          {allowKeywordMatch && <option value="keyword_match">Keyword match (no AI)</option>}
          {allowEmbeddingMatch && <option value="embedding_match">Semantic match (embeddings)</option>}
        </select>
      </label>
      {provider === "keyword_match" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Deterministic keyword/expertise overlap scoring — no AI call, no cost, no latency
          variance. Less precise than a true semantic match (won&apos;t catch e.g. &quot;ML&quot;
          vs. &quot;Machine Learning&quot; unless they share a word or substring).
        </p>
      )}
      {provider === "embedding_match" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Cosine similarity between Vertex AI text embeddings — genuinely catches synonyms like
          &quot;ML&quot; vs. &quot;Machine Learning&quot;, unlike keyword match. One lightweight
          embedding call per candidate (parallelized), not a full generative completion — cheap
          and fast, but not free like keyword match.
        </p>
      )}
      {provider === "openrouter" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            OpenRouter model id
            <input
              type="text"
              value={model}
              disabled={busy}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pin to provider (optional)
            <input
              type="text"
              value={providerSlug}
              disabled={busy}
              onChange={(e) => setProviderSlug(e.target.value)}
              placeholder="e.g. deepinfra — leave blank to let OpenRouter choose"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            The model id above (e.g. deepseek/deepseek-v3.2) can itself be served by several
            different upstream resellers on OpenRouter — leaving this blank lets OpenRouter pick
            or rotate between them. Set a provider slug (check the model&apos;s page on
            openrouter.ai for the exact slugs it supports, e.g. &quot;deepinfra&quot;) to always
            route to that one reseller and never silently fall back to another.
          </p>
        </>
      )}
      {allowSearchBackend && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Web search backend
            <select
              value={searchBackend}
              disabled={busy}
              onChange={(e) => setSearchBackend(e.target.value as SearchBackend)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="vertex">Vertex AI (Google Search grounding)</option>
              <option value="serper">Serper.dev (cheaper raw search)</option>
            </select>
          </label>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            This feature does a live web search for market research/current-events questions,
            separate from the Provider setting above (which only controls drafting/chat). Vertex
            AI&apos;s bundled Google Search grounding costs roughly $0.014-0.035 per grounded
            call; Serper.dev fetches raw search results directly for about $0.001 per query and
            has that same result synthesized by whichever Provider is set above — cheaper, and
            avoids Vertex AI entirely when Provider is also OpenRouter. Requires a Serper API key
            to be configured as a secret.
          </p>
        </>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="mt-1 self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
