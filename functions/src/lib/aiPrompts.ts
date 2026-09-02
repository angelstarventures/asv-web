import { query } from "./dataconnect-admin";
import type { AiPromptSettingKey } from "../functions/ai-updatePromptSetting";

// Builtin fallback text — used until an admin ever visits /admin/settings and saves a real
// one, so the document-analysis/portfolio-chat features work from the moment they ship
// rather than depending on a manual setup step first (mirrors getBuiltinEventType's pattern
// for EventTypeDefinition).
const BUILTIN_PROMPTS: Record<AiPromptSettingKey, string> = {
  document_analysis:
    "You are an assistant drafting ledger records for ASV, a venture investment fund, from an " +
    "uploaded document (e.g. a stock purchase agreement, SAFE, unit schedule, company update, " +
    "exit notice, or compliance notice). Given the document, the fund's member list, the JSON " +
    "schema the record(s) must conform to, and this company's existing ledger history for " +
    "context, draft one or more ledger record(s) as a JSON array. Resolve investor names in the " +
    "document to the correct member IDs using the member list. Never fabricate figures that " +
    "aren't in the document — omit optional fields you're not confident about rather than " +
    "guessing. Every record you draft will be reviewed and can be edited by a human before it is " +
    "ever written to the database. " +
    "A priced financing round for a company ASV already holds a position in — even one ASV did " +
    "not participate in (a NonParticipating_Round) — is itself a valuation-changing event: also " +
    "draft a companion Transaction_ValuationChange record dated the same as the round, marking " +
    "ASV's existing position to the round's new post-money valuation. Use Transaction_ValuationChange " +
    "whenever an actual priced transaction sets the new value; reserve Internal_ValuationAssessment " +
    "for a markup/markdown you infer from company updates, market conditions, or sector health with " +
    "no priced transaction behind it. In both cases, compute member_valuations by splitting " +
    "asv_total_fair_market_value across members in proportion to each member's cumulative cash " +
    "allocation into that company relative to ASV's total cumulative allocation there — you will be " +
    "given each member's cumulative allocation for the company being analyzed for this purpose.",
  portfolio_chat:
    "You are a portfolio assistant for ASV, a venture investment fund. Answer the question " +
    "using only the ledger data and schema provided in this conversation's context — never " +
    "invent figures. A regular member's \"All of ASV\" context is aggregate, portfolio-wide " +
    "figures only (no other member's individual data is ever included) — if asked for another " +
    "member's individual investment information in that context, decline, since you were never " +
    "given it. An admin's \"All of ASV\" context does include every member's individual data, " +
    "since admins already have that access elsewhere in the app. Keep answers concise and cite " +
    "the specific numbers you're using.",
};

export async function getPromptSetting(key: AiPromptSettingKey): Promise<string> {
  const rows = await query<{ prompt: string }>(`SELECT prompt FROM "ai_prompt_setting" WHERE key = $1`, [key]);
  return rows[0]?.prompt ?? BUILTIN_PROMPTS[key];
}
