import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ApiError } from "@google/genai";
import { requireCaller } from "../lib/auth";
import { requireFeatureEnabled } from "../lib/organizationFeatureCheck";
import { query } from "../lib/dataconnect-admin";
import { createContextCache, generateChatReply, generateGroundedContent, type ChatTurn } from "../lib/vertexAi";
import { generateChatReply as openRouterGenerateChatReply } from "../lib/openRouter";
import { openRouterKeyPortfolioChat } from "../lib/openRouterSecrets";
import { serperApiKey, serperSearch } from "../lib/serper";
import { getAiProviderSetting, type SearchBackend } from "../lib/aiProviderSettings";
import { getPromptSetting } from "../lib/aiPrompts";
import { fetchAllLedgerRecords, fetchOwnLedgerRecords } from "../lib/legacyRecordShape";
import { fetchAggregateRollups } from "../lib/portfolioAggregates";
import portfolioSchema from "../../schema/asv_master_portfolio_schema.json";

// Phase 2 AI: the member-facing portfolio chat, in both scopes ("my holdings" and "all of
// ASV"). The schema + ledger data + (for admins) member list are seeded once per chat session
// as a Vertex AI context cache (createContextCache) rather than re-sent on every message — see
// vertexAi.ts's comment. The caller's own identity/role is always derived server-side via
// requireCaller, never trusted from client input — the one place client input controls *whose*
// data is used is `scope`, and even then "asv" scope for a non-admin never includes another
// member's individual data (fetchAggregateRollups has no per-member breakdown at all, so there
// is nothing for a prompt-injection attempt to leak even if it tried).

export interface AiPortfolioQueryInput {
  message: string;
  scope: "mine" | "asv";
  cachedContentName?: string; // from a prior reply in this session; omit on the first message
  history?: ChatTurn[]; // turns since the cache was created, empty on the first message
}

export interface AiPortfolioQueryOutput {
  reply: string;
  cachedContentName: string; // caller must store/replace and pass back on the next message
}

async function fetchMemberList(): Promise<{ id: string; displayName: string; investingEntityName: string }[]> {
  return query(
    `SELECT id, "display_name" AS "displayName", "investing_entity_name" AS "investingEntityName" FROM "member" ORDER BY id`
  );
}

// Investment-round records (Participating_PricedRound, Participating_SAFERound,
// NonParticipating_Round) never legitimately differ by scenario — they're always inserted as 3
// identical rows, one per scenario (rollups.ts's own divergence check treats disagreement
// between them as an anomaly). Sending all 3 to the model as full duplicate records roughly
// triples the token count for zero new information; collapsing them to one (scenario omitted,
// since it's the same across all 3) was the fix for a real observed failure — the full,
// non-deduped ~700-entry admin context caused the underlying Vertex AI call to stall past
// Node's fetch headers-timeout (~5 minutes) with no response.
const SCENARIO_INVARIANT_TYPES = new Set(["Participating_PricedRound", "Participating_SAFERound", "NonParticipating_Round"]);

function dedupeScenarioInvariantRecords(records: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];
  for (const record of records) {
    const type = String(record.type);
    if (!SCENARIO_INVARIANT_TYPES.has(type)) {
      result.push(record);
      continue;
    }
    const key = `${record.date}::${record.company}::${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { scenario: _drop, ...rest } = record;
    void _drop;
    result.push(rest);
  }
  return result;
}

async function buildContext(scope: "mine" | "asv", memberId: string, isAdmin: boolean): Promise<string> {
  const parts: string[] = [
    `asv_master_portfolio_schema.json:\n${JSON.stringify(portfolioSchema)}`,
    "Investment-round records (Participating_PricedRound, Participating_SAFERound, NonParticipating_Round) below have no `scenario` field — they never legitimately differ by scenario, so one copy represents all 3 (optimistic, balanced, conservative). Every other record type does vary by scenario and keeps its explicit `scenario` field.",
  ];

  if (scope === "mine") {
    const records = dedupeScenarioInvariantRecords(await fetchOwnLedgerRecords(memberId));
    parts.push(
      `Your own ledger records, across all 3 scenarios, scoped to only the companies you hold and only your own allocation/valuation/payout amounts (asv_ledger_optimistic.json + asv_ledger_balanced.json + asv_ledger_conservative.json, combined and filtered to you):\n${JSON.stringify(records)}`
    );
  } else if (isAdmin) {
    const [rawRecords, members, aggregate] = await Promise.all([
      fetchAllLedgerRecords(),
      fetchMemberList(),
      fetchAggregateRollups(),
    ]);
    const records = dedupeScenarioInvariantRecords(rawRecords);
    parts.push(`asv_master_member_list.json:\n${JSON.stringify(members)}`);
    parts.push(
      // Pre-computed, not derived by the model — for any question answerable from these
      // totals (portfolio-wide or per-company MOIC/unrealized/realized), use these numbers
      // directly rather than re-deriving them from the raw ledger records below.
      `Pre-computed portfolio-wide totals, one row per scenario:\n${JSON.stringify(aggregate.portfolio)}\n\nPre-computed per-company totals, one row per (company, scenario):\n${JSON.stringify(aggregate.companies)}`
    );
    parts.push(
      `The complete ASV ledger, across all 3 scenarios, every member's individual data included (asv_ledger_optimistic.json + asv_ledger_balanced.json + asv_ledger_conservative.json, combined) — use this for anything the pre-computed totals above don't cover, such as individual member amounts, round terms, or company update narratives:\n${JSON.stringify(records)}`
    );
  } else {
    const aggregate = await fetchAggregateRollups();
    parts.push(
      `Pre-computed portfolio-wide totals, one row per scenario:\n${JSON.stringify(aggregate.portfolio)}\n\nPre-computed per-company totals across all 3 scenarios — MOIC/unrealized/realized value, sector, health, and trajectory only, no individual member information:\n${JSON.stringify(aggregate.companies)}`
    );
  }

  return parts.join("\n\n");
}

// Building the admin "asv" scope's context (the full ~700-entry ledger, reshaped and then
// uploaded as a Vertex AI context cache) comfortably exceeds Cloud Functions' 60s default
// timeout — a real invocation observed during testing took the full 300s and was still killed
// by Cloud Run with a 504, so this is set closer to callable functions' actual ceiling (3600s)
// rather than a number picked without evidence. lib/functions/aiChat.ts's client-side
// httpsCallable timeout must stay >= this value, or the browser gives up first.
const NEEDS_RESEARCH_PREFIX = "NEEDS_RESEARCH:";

// Sentinel cachedContentName for an OpenRouter-mode session, which has no real Vertex cache —
// the client still stores/passes back a `cachedContentName` string per its existing contract,
// this just isn't a real resource name. Every message re-derives which provider to use from
// the CURRENT AiProviderSetting rather than trusting this value's provenance, so a mid-session
// provider switch just means the next message starts fresh (see the ApiError-triggered
// rebuild-and-retry below for the symmetric case: a real Vertex name that's gone stale, or this
// sentinel arriving after a switch back to Vertex, both recover the same way).
const OPENROUTER_SENTINEL = "openrouter";

// Vertex AI rejects combining `cachedContent` with a search tool on the same call (the same
// constraint documents-analyze.ts's researchMarketContext already works around) — the cached
// ledger-data chat call can't ground itself directly. Instead: if the model's own reply says it
// needs external info (see the portfolio_chat prompt's NEEDS_RESEARCH contract), run one
// grounded, tool-enabled call (always Vertex/Google Search, regardless of which provider drafts
// the actual reply) to gather real findings, then re-ask the SAME original question with those
// findings folded in as plain context via the caller-supplied `replyAgain` — the client only
// ever sees the final answer, never the intermediate detour, so its own history stays a
// faithful transcript (no extra turns to desync on the next message).
// searchBackend "serper" is the cheaper alternative to Vertex's Google Search grounding tool
// (see AiProviderSetting's own schema comment) — raw Serper.dev snippets are folded directly
// into the same synthesisMessage the Vertex path builds from its own grounded text, so the one
// replyAgain call that already has to happen does the synthesis itself; no separate "digest the
// search results" model call needed the way documents-analyze.ts's researchMarketContext (which
// has no next chat turn to fold results into) requires.
async function resolveNeedsResearch(
  reply: string,
  message: string,
  replyAgain: (message: string) => Promise<string>,
  searchBackend: SearchBackend
): Promise<string> {
  const trimmed = reply.trim();
  if (!trimmed.startsWith(NEEDS_RESEARCH_PREFIX)) return reply;

  const searchQuery = trimmed.slice(NEEDS_RESEARCH_PREFIX.length).trim() || message;

  let researchText: string;
  let sourceLines: string;
  if (searchBackend === "serper") {
    const results = await serperSearch(serperApiKey.value(), searchQuery, 8);
    researchText = results.length > 0 ? "See search results below." : "No search results found.";
    sourceLines = results.map((r) => `- ${r.title}: ${r.snippet} (${r.link})`).join("\n");
  } else {
    const research = await generateGroundedContent({
      systemPrompt: "You are a research analyst supporting a venture fund's portfolio questions.",
      parts: [searchQuery],
    });
    researchText = research.text;
    sourceLines = research.sources.map((s) => `- ${s.title ?? s.uri}: ${s.uri}`).join("\n");
  }

  const synthesisMessage = [
    `Here is grounded, current research relevant to the question below:\n${researchText}`,
    sourceLines ? `Sources:\n${sourceLines}` : "",
    `Now answer this question, citing the sources above where relevant: ${message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return replyAgain(synthesisMessage);
}

export const aiPortfolioQuery = onCall<AiPortfolioQueryInput, Promise<AiPortfolioQueryOutput>>(
  { timeoutSeconds: 540, secrets: [openRouterKeyPortfolioChat, serperApiKey] },
  async (request) => {
    const caller = await requireCaller(request);
    await requireFeatureEnabled(caller, "AI_CHAT");
    const { message, scope, cachedContentName, history } = request.data;
    if (!message || (scope !== "mine" && scope !== "asv")) {
      throw new HttpsError("invalid-argument", "message and a valid scope ('mine' or 'asv') are required.");
    }
    const isAdmin = caller.role === "admin" || caller.role === "site_admin" || caller.role === "dev_site_admin";
    const chatHistory = history ?? [];

    const providerSetting = await getAiProviderSetting("portfolio_chat");
    if (providerSetting.provider === "openrouter" && providerSetting.openrouterModel) {
      // No context cache on OpenRouter — the schema/ledger context is rebuilt and resent as
      // part of the system prompt on every single message, an accepted cost tradeoff for
      // whichever site-admin flips this feature onto a cheaper/free-tier model.
      const [contextText, prompt] = await Promise.all([
        buildContext(scope, caller.memberId, isAdmin),
        getPromptSetting("portfolio_chat"),
      ]);
      const systemPromptWithContext = `${prompt}\n\n${contextText}`;
      const replyAgain = (msg: string) =>
        openRouterGenerateChatReply({
          apiKey: openRouterKeyPortfolioChat.value(),
          model: providerSetting.openrouterModel!,
          providerSlug: providerSetting.openrouterProviderSlug,
          systemPrompt: systemPromptWithContext,
          history: chatHistory,
          message: msg,
        });

      let reply = await replyAgain(message);
      reply = await resolveNeedsResearch(reply, message, replyAgain, providerSetting.searchBackend);
      return { reply, cachedContentName: OPENROUTER_SENTINEL };
    }

    async function buildFreshCache(): Promise<string> {
      const [contextText, prompt] = await Promise.all([
        buildContext(scope, caller.memberId, isAdmin),
        getPromptSetting("portfolio_chat"),
      ]);
      console.log(
        `[aiPortfolioQuery] scope=${scope} contextText.length=${contextText.length} prompt.length=${prompt.length}`
      );
      return createContextCache({ systemPrompt: prompt, contextText });
    }

    // A cachedContentName carried over from a prior OpenRouter-mode message (our sentinel) is
    // never a real Vertex cache — treated the same as "no cache yet," same recovery path as an
    // expired/invalidated real one below.
    let cacheName = cachedContentName && cachedContentName !== OPENROUTER_SENTINEL ? cachedContentName : undefined;
    let reply: string;
    try {
      if (!cacheName) cacheName = await buildFreshCache();
      reply = await generateChatReply({ cachedContentName: cacheName, history: chatHistory, message });
    } catch (err) {
      // A reused cache name can fail if it expired (1-hour TTL), was otherwise invalidated, or
      // was never a real Vertex cache to begin with (the OpenRouter sentinel case above already
      // clears that specific one, but this also covers any other stale value) — rebuild once and
      // retry rather than failing the whole message. Only retried when a prior session's cache
      // name was actually supplied; a fresh-cache failure propagates immediately.
      if (cachedContentName && err instanceof ApiError) {
        cacheName = await buildFreshCache();
        reply = await generateChatReply({ cachedContentName: cacheName, history: chatHistory, message });
      } else {
        throw err;
      }
    }

    const finalCacheName = cacheName;
    reply = await resolveNeedsResearch(
      reply,
      message,
      (msg) => generateChatReply({ cachedContentName: finalCacheName, history: chatHistory, message: msg }),
      providerSetting.searchBackend
    );

    return { reply, cachedContentName: cacheName };
  }
);
