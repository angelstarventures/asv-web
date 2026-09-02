import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ApiError } from "@google/genai";
import { requireCaller } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { createContextCache, generateChatReply, type ChatTurn } from "../lib/vertexAi";
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
export const aiPortfolioQuery = onCall<AiPortfolioQueryInput, Promise<AiPortfolioQueryOutput>>(
  { timeoutSeconds: 540 },
  async (request) => {
    const caller = await requireCaller(request);
    const { message, scope, cachedContentName, history } = request.data;
    if (!message || (scope !== "mine" && scope !== "asv")) {
      throw new HttpsError("invalid-argument", "message and a valid scope ('mine' or 'asv') are required.");
    }

    async function buildFreshCache(): Promise<string> {
      const [contextText, prompt] = await Promise.all([
        buildContext(scope, caller.memberId, caller.role === "admin"),
        getPromptSetting("portfolio_chat"),
      ]);
      console.log(
        `[aiPortfolioQuery] scope=${scope} contextText.length=${contextText.length} prompt.length=${prompt.length}`
      );
      return createContextCache({ systemPrompt: prompt, contextText });
    }

    let cacheName = cachedContentName;
    let reply: string;
    try {
      if (!cacheName) cacheName = await buildFreshCache();
      reply = await generateChatReply({ cachedContentName: cacheName, history: history ?? [], message });
    } catch (err) {
      // A reused cache name can fail if it expired (1-hour TTL) or was otherwise invalidated —
      // rebuild once and retry rather than failing the whole message. Only retried when a prior
      // session's cache name was actually supplied; a fresh-cache failure propagates immediately.
      if (cachedContentName && err instanceof ApiError) {
        cacheName = await buildFreshCache();
        reply = await generateChatReply({ cachedContentName: cacheName, history: history ?? [], message });
      } else {
        throw err;
      }
    }

    return { reply, cachedContentName: cacheName };
  }
);
