import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { ApiError } from "@google/genai";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { generateContent, generateGroundedContent, createContextCache, type ContentPart } from "../lib/vertexAi";
import { generateContent as openRouterGenerateContent } from "../lib/openRouter";
import { openRouterKeyDocumentAnalysis } from "../lib/openRouterSecrets";
import { dispatchGenerateContent } from "../lib/aiDispatch";
import { serperApiKey, serperSearch } from "../lib/serper";
import { getAiProviderSetting, type SearchBackend } from "../lib/aiProviderSettings";
import { getPromptSetting } from "../lib/aiPrompts";
import { fetchLedgerRecordsForCompany } from "../lib/legacyRecordShape";
import { checkValuationGuardrails } from "../lib/valuationGuardrails";
import { fetchAllMemberIds, findUnknownMemberReferences } from "../lib/memberIds";
import portfolioSchema from "../../schema/asv_master_portfolio_schema.json";

// Phase 2 AI: admin uploads one or more documents straight from the browser (no Drive
// persistence yet — that's deferred until real OAuth is set up for the personal-Gmail-owned
// Drive folder; a bare service account has no storage quota on personal Drive, see
// documents-onDriveUpload.ts/drive.ts, which remain unused by this flow for now). Records come
// back in the exact legacy JSON shape ledger-massImportDiff/-Commit already consume — the
// review UI just needs to produce records in this shape and call those two callables
// unchanged, same as a hand-uploaded JSON import file.

export interface DocumentsAnalyzeFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface DocumentsAnalyzeInput {
  companyId?: string;
  newCompanyName?: string;
  files: DocumentsAnalyzeFile[];
  // Conversational refinement (plan: "modify, then re-check" loop) — when present, this call
  // revises `previousRecords` per `instruction` instead of drafting from scratch. `checkErrors`
  // is optionally included when the admin asks for a change right after a failed Check, so the
  // model sees the exact validation failure, not just the admin's own paraphrase of it.
  instruction?: string;
  previousRecords?: Record<string, unknown>[];
  checkErrors?: string[];
}

export interface RecordGroup {
  scenarios: string[]; // lowercase, e.g. ["optimistic", "balanced"]
  recordIndexes: number[]; // into proposedRecords, aligned 1:1 with `scenarios`
  visible: boolean; // per the reviewing user's own role-tier scenario setting
}

export interface DocumentsAnalyzeOutput {
  proposedRecords: Record<string, unknown>[];
  warnings: string[];
  groups: RecordGroup[];
  // Deduplicated raw dict-key strings (allocations/member_valuations/member_payouts) that don't
  // match any real Member.id — either a genuinely new investor the document mentions, or a name
  // the model failed to resolve against the member list it was given. Surfaced separately from
  // `warnings` so the review UI can offer a direct "add this member" action per reference.
  unknownMemberReferences: string[];
}

// Investment-round records are always drafted as 3 identical copies (DRAFTING_FORMAT_INSTRUCTIONS
// below); other types may or may not actually differ by scenario. Rather than showing the
// reviewer three near-duplicate cards (part of how the House of Biryan bug went unnoticed), group
// records for the same logical event — matched by (date, company, type), same natural-key fields
// importDiff.ts already uses for diffing — by deep content equality *ignoring* the `scenario`
// field, so identical drafts collapse into one group covering every scenario they match, and only
// genuinely-scenario-specific drafts (e.g. a valuation narrative that differs by scenario) get
// their own group.
function groupRecordsByContent(records: Record<string, unknown>[]): Omit<RecordGroup, "visible">[] {
  const buckets = new Map<string, number[]>(); // natural key (no scenario) -> record indexes
  records.forEach((record, i) => {
    const key = `${record.date}::${record.company}::${record.type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(i);
  });

  const groups: Omit<RecordGroup, "visible">[] = [];
  for (const indexes of buckets.values()) {
    const contentGroups = new Map<string, number[]>(); // content signature (no scenario) -> record indexes
    for (const i of indexes) {
      const { scenario: _drop, ...contentOnly } = records[i];
      void _drop;
      const signature = JSON.stringify(contentOnly, Object.keys(contentOnly).sort());
      if (!contentGroups.has(signature)) contentGroups.set(signature, []);
      contentGroups.get(signature)!.push(i);
    }
    for (const groupIndexes of contentGroups.values()) {
      groups.push({
        scenarios: groupIndexes.map((i) => String(records[i].scenario ?? "").toLowerCase()),
        recordIndexes: groupIndexes,
      });
    }
  }
  return groups;
}

const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB total across all files in one analysis call

const DRAFTING_FORMAT_INSTRUCTIONS =
  'Respond with a single JSON object of the shape {"records": [...], "warnings": [...]} — no prose, no markdown fences. `records` is an array of record objects; `warnings` is an array of plain-language strings (empty if none) describing anything you found inconsistent with the ledger history you were given, anything you couldn\'t reconcile with the source document, or any figure you had to derive rather than read directly — see the self-verification instructions above. Each record needs an explicit lowercase "scenario" field ("optimistic", "balanced", or "conservative"). Investment-round records (Participating_PricedRound, Participating_SAFERound, NonParticipating_Round) never diverge by scenario — return one identical copy of the record per scenario (3 copies total). Other types may legitimately differ by scenario; draft your best assessment for each.';

// Module-level, reused across warm invocations of this function (Cloud Functions instance
// reuse) — the schema + format instructions are ~200 lines and identical on every call
// regardless of company/document, so caching them (instead of resending on every
// documentsAnalyze invocation) cuts token cost meaningfully. Invalidated when the admin-editable
// prompt text changes; a Vertex AI ApiError on an expired/invalid cache name (1-hour TTL)
// triggers a one-time rebuild-and-retry, same pattern as ai-portfolioQuery.ts's own cache reuse.
let draftingCache: { name: string; promptSignature: string } | undefined;

async function getDraftingCache(prompt: string): Promise<string> {
  if (draftingCache && draftingCache.promptSignature === prompt) {
    return draftingCache.name;
  }
  const name = await createContextCache({
    systemPrompt: prompt,
    contextText: [
      `The JSON schema every record you draft must conform to:\n${JSON.stringify(portfolioSchema)}`,
      DRAFTING_FORMAT_INSTRUCTIONS,
    ].join("\n\n"),
  });
  draftingCache = { name, promptSignature: prompt };
  return name;
}

// The exact discriminator strings from asv_master_portfolio_schema.json's `type` enum — every
// downstream check in this file (VIEWPOINT_TYPES, VALUATION_TYPES, ROUND_TYPES_WITH_ALLOCATIONS,
// groupRecordsByContent's natural key) does an exact-string Set lookup against these, so a
// model that drifts on casing/separators (seen in practice on a non-Gemini OpenRouter model:
// e.g. "companyupdate" instead of "CompanyUpdate") silently falls through every one of those
// checks at once — no grounding, no member_valuations split, no companion-record bookkeeping —
// without ever throwing, since an unrecognized type is still a syntactically valid record.
// normalizeRecordTypes (below) re-maps any case/separator variant back to the canonical string
// right after parsing, before any of those checks run.
const CANONICAL_RECORD_TYPES = [
  "Participating_PricedRound",
  "Participating_SAFERound",
  "NonParticipating_Round",
  "Exit_Event",
  "Transaction_ValuationChange",
  "Internal_ValuationAssessment",
  "Compliance_FlagChange",
  "CompanyUpdate",
] as const;

function typeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CANONICAL_TYPE_BY_KEY = new Map(CANONICAL_RECORD_TYPES.map((t) => [typeKey(t), t]));

function normalizeRecordTypes(records: Record<string, unknown>[]): void {
  for (const record of records) {
    if (typeof record.type !== "string") continue;
    const canonical = CANONICAL_TYPE_BY_KEY.get(typeKey(record.type));
    if (canonical) record.type = canonical;
  }
}

const VIEWPOINT_TYPES = new Set(["Internal_ValuationAssessment", "CompanyUpdate"]);
type ViewpointScenario = "Optimistic" | "Balanced" | "Conservative";
const SCENARIO_LABELS: Record<string, ViewpointScenario> = {
  optimistic: "Optimistic",
  balanced: "Balanced",
  conservative: "Conservative",
};

interface MarketResearchResult {
  marketResearchGrounding: string;
  impactByScenario: Record<ViewpointScenario, string>;
  sources: string[];
}

const RESEARCH_FORMAT_INSTRUCTIONS = [
  "Respond in EXACTLY this plain-text format, nothing else (no JSON, no markdown, no extra commentary):",
  "MARKET_RESEARCH_GROUNDING: <2-4 sentence summary of your findings and how they relate to this company>",
  "OPTIMISTIC_IMPACT: <1-2 sentences: under an optimistic scenario, does this research support a markup, markdown, or no change, and why>",
  "BALANCED_IMPACT: <same, under a balanced/base-case scenario>",
  "CONSERVATIVE_IMPACT: <same, under a conservative scenario>",
].join("\n");

function extractResearchFields(text: string, fallback: MarketResearchResult): Omit<MarketResearchResult, "sources"> {
  const extract = (label: string) => text.match(new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"))?.[1]?.trim();
  return {
    marketResearchGrounding: extract("MARKET_RESEARCH_GROUNDING") ?? fallback.marketResearchGrounding,
    impactByScenario: {
      Optimistic: extract("OPTIMISTIC_IMPACT") ?? fallback.impactByScenario.Optimistic,
      Balanced: extract("BALANCED_IMPACT") ?? fallback.impactByScenario.Balanced,
      Conservative: extract("CONSERVATIVE_IMPACT") ?? fallback.impactByScenario.Conservative,
    },
  };
}

// Grounded, plain-text research — deliberately never JSON mode: Vertex AI rejects combining
// Google Search grounding with controlled/JSON generation ("controlled generation is not
// supported with Search tool", confirmed empirically against the live API). Parses a small
// delimited plain-text format instead of structured output, and falls back to a generic note on
// any failure (malformed response, safety block, network error) rather than throwing — this is
// an enrichment step, not something that should ever block a real analysis from completing.
//
// searchBackend "serper" is the cheaper alternative to Vertex's bundled Google Search grounding
// tool (~$0.001/query for raw Serper results vs. Vertex grounding's ~$0.014-0.035/query) —
// fetches raw snippets directly, then synthesizes the same plain-text format via that feature's
// own AiProviderSetting.provider (dispatchGenerateContent, so this reuses whichever model
// document_analysis is already configured for — OpenRouter or Vertex — instead of always paying
// for Vertex's grounding tool on top of the drafting call).
async function researchMarketContext(
  companyName: string,
  fileParts: ContentPart[],
  searchBackend: SearchBackend
): Promise<MarketResearchResult> {
  const fallback: MarketResearchResult = {
    marketResearchGrounding: "Market research unavailable for this analysis.",
    impactByScenario: {
      Optimistic: "No additional assessment.",
      Balanced: "No additional assessment.",
      Conservative: "No additional assessment.",
    },
    sources: [],
  };
  try {
    if (searchBackend === "serper") {
      const results = await serperSearch(serperApiKey.value(), `${companyName} funding valuation market news`, 8);
      if (results.length === 0) return fallback;
      const snippetsText = results
        .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.link}`)
        .join("\n\n");
      const prompt = [
        `Using ONLY the web search results below, assess current market conditions relevant to "${companyName}"'s sector: comparable company valuations, recent funding rounds, M&A or exit activity, and broader sector trends. The attached document(s) describe a specific update or valuation event for this company — ground your assessment in what's relevant to it.`,
        `Web search results:\n${snippetsText}`,
        RESEARCH_FORMAT_INSTRUCTIONS,
      ].join("\n\n");

      const text = await dispatchGenerateContent("document_analysis", {
        systemPrompt: "You are a market research analyst supporting a venture fund's portfolio valuation process.",
        parts: [prompt, ...fileParts],
      });

      return {
        ...extractResearchFields(text, fallback),
        sources: results.map((r) => r.link),
      };
    }

    const prompt = [
      `Using Google Search, research current market conditions relevant to "${companyName}"'s sector: comparable company valuations, recent funding rounds, M&A or exit activity, and broader sector trends. The attached document(s) describe a specific update or valuation event for this company — ground your research in what's relevant to assessing it.`,
      RESEARCH_FORMAT_INSTRUCTIONS,
    ].join("\n");

    const { text, sources } = await generateGroundedContent({
      systemPrompt: "You are a market research analyst supporting a venture fund's portfolio valuation process.",
      parts: [prompt, ...fileParts],
    });

    return {
      ...extractResearchFields(text, fallback),
      sources: sources.map((s) => s.uri),
    };
  } catch (err) {
    console.error("researchMarketContext: best-effort grounding failed", err);
    return fallback;
  }
}

// timeoutSeconds: the default 60s is too tight for an AI drafting call — the context includes
// the full member list, this company's ledger history, its allocation table, and the ~200-line
// portfolio schema, and Gemini's own response time varies; seen timing out at the default
// under real use, not just in theory.
export const documentsAnalyze = onCall<DocumentsAnalyzeInput, Promise<DocumentsAnalyzeOutput>>(
  { timeoutSeconds: 300, memory: "512MiB", secrets: [openRouterKeyDocumentAnalysis, serperApiKey] },
  async (request) => {
    try {
      return await documentsAnalyzeImpl(request);
    } catch (err) {
      console.error("documentsAnalyze failed", err instanceof Error ? err.stack : err);
      throw err;
    }
  }
);

async function documentsAnalyzeImpl(request: CallableRequest<DocumentsAnalyzeInput>): Promise<DocumentsAnalyzeOutput> {
  const caller = await requireAdmin(request);

  const { companyId, newCompanyName, files, instruction, previousRecords, checkErrors } = request.data;
  if ((!companyId && !newCompanyName) || !Array.isArray(files) || files.length === 0) {
    throw new HttpsError("invalid-argument", "companyId or newCompanyName, and at least one file, are required.");
  }

  const fileBuffers = files.map((f) => Buffer.from(f.contentBase64, "base64"));
  const totalBytes = fileBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new HttpsError("invalid-argument", `Files exceed the ${MAX_TOTAL_BYTES / (1024 * 1024)}MB total limit.`);
  }

  // A brand-new investment's company has no row yet — applyLedgerRecord (used by
  // ledgerMassImportCommit, which this flow's review UI calls unchanged) already
  // auto-creates the company row by name on commit, so analysis just needs a name to work
  // with; no DB lookup, and no existing-ledger history since none exists yet.
  let companyName: string;
  let existingLedger: Record<string, unknown>[] = [];
  let memberAllocationTotals: { memberId: string; total: number }[] = [];
  if (companyId) {
    const companies = await query<{ name: string }>(`SELECT name FROM "company" WHERE id = $1`, [companyId]);
    const company = companies[0];
    if (!company) {
      throw new HttpsError("not-found", `No company row for id "${companyId}".`);
    }
    companyName = company.name;
    // This company's own history only — context, not a portfolio-wide data dump. Full detail
    // (price-per-share, post-money valuations, every member's allocation/valuation dollars),
    // not just date/type/scenario — the AI needs the real numbers to ground a new round's
    // price-per-share or a new valuation mark against what actually happened before, not just
    // know that "something happened" on a given date (see aiPrompts.ts's document_analysis
    // prompt, which now requires the model self-check its own drafts against this history).
    existingLedger = await fetchLedgerRecordsForCompany(companyId);
    // Each member's cumulative cash allocation into this company — the AI needs this to
    // compute member_valuations proportionally when drafting a Transaction_ValuationChange or
    // Internal_ValuationAssessment record (it has no other way to derive ownership share).
    // scenario = 'BALANCED' only: investment-round records are tripled identically across
    // scenarios (see the response-format instructions below), so summing all three would
    // triple-count every dollar invested.
    memberAllocationTotals = await query<{ memberId: string; total: number }>(
      `SELECT a."member_id" AS "memberId", SUM(a.amount) AS total
       FROM "allocation" a
       JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
       WHERE le."company_id" = $1 AND le.scenario = 'BALANCED'
       GROUP BY a."member_id"
       ORDER BY a."member_id"`,
      [companyId]
    );
  } else {
    companyName = newCompanyName as string;
  }

  // Full member list (not just names) — the AI needs real 5-digit member IDs to resolve
  // investor names it reads in the document into the `allocations`/`member_payouts`/
  // `member_valuations` dict keys the schema requires, the exact problem solved by hand for
  // several companies earlier in this project's history.
  const members = await query<{ id: string; displayName: string; investingEntityName: string }>(
    `SELECT id, "display_name" AS "displayName", "investing_entity_name" AS "investingEntityName" FROM "member" ORDER BY id`
  );

  const prompt = await getPromptSetting("document_analysis");
  const providerSetting = await getAiProviderSetting("document_analysis");
  const useOpenRouter = providerSetting.provider === "openrouter" && Boolean(providerSetting.openrouterModel);

  // OpenRouter has no generic cross-model context-cache API, so its path skips the Vertex
  // drafting cache entirely and resends the schema/format instructions on every call instead
  // (folded into `context` below) — a real cost tradeoff, but the one already called out to
  // whichever site-admin flips this feature onto OpenRouter.
  let cacheName: string | undefined;
  if (!useOpenRouter) {
    try {
      cacheName = await getDraftingCache(prompt);
    } catch (err) {
      // Seen in production on a cold-started instance's very first call: Vertex AI's
      // caches.create rejects with "cached content is of 1 tokens" even though the schema +
      // format instructions being cached are always the same several-thousand-token payload —
      // a transient cold-start hiccup in the outbound request, not a real content problem.
      // Rebuild once and retry, same one-time-retry posture as the draftOnce cache-reuse fallback
      // below (a stale module-level cache is discarded here too, in case it was left half-set).
      if (err instanceof ApiError) {
        draftingCache = undefined;
        cacheName = await getDraftingCache(prompt);
      } else {
        throw err;
      }
    }
  }

  // The schema + response-format instructions moved into the drafting cache (getDraftingCache)
  // since they're identical on every call — this context is just the parts that vary per call.
  const context = [
    `Company: ${companyName}`,
    `Member list (id, name, investing entity) — resolve any investor named in the document to the matching id:\n${JSON.stringify(members)}`,
    companyId
      ? `This company's complete existing ledger history, full detail (round pricing, post-money valuations, every member's allocation/valuation dollars) — use this to ground any new price-per-share or valuation figure you draft, and to self-check your draft before responding:\n${JSON.stringify(existingLedger)}`
      : "This is a brand-new company ASV has no prior ledger history with — draft its first investment round record(s) from the document.",
    companyId
      ? `Each member's cumulative cash allocation into this company to date (memberId -> total dollars invested, balanced scenario, which equals every scenario since investment-round records never diverge by scenario). Use this to compute member_valuations proportionally whenever you draft a Transaction_ValuationChange or Internal_ValuationAssessment record for this company: member_valuations[memberId] = (that member's total here / sum of all totals here) * asv_total_fair_market_value:\n${JSON.stringify(memberAllocationTotals)}`
      : null,
    // Conversational refinement — revise, don't redraft from scratch, so an edit the reviewer
    // already liked (or made by hand in the review UI) doesn't get silently reverted.
    previousRecords && previousRecords.length > 0
      ? `You previously drafted these exact records for this same document/company:\n${JSON.stringify(previousRecords)}\n\nThe reviewer is asking for a specific change, not a fresh draft — revise the records above to address it, keeping everything else the same unless the request implies otherwise. Their request: "${instruction ?? ""}"`
      : null,
    checkErrors && checkErrors.length > 0
      ? `The reviewer tried to check/commit the previous draft and it failed validation with these exact errors — make sure your revision actually resolves them:\n${checkErrors.join("\n")}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  const fileParts: ContentPart[] = files.map((f, i) => ({
    inlineData: { mimeType: f.mimeType, data: fileBuffers[i].toString("base64") },
  }));

  async function draftOnce(cache: string | undefined): Promise<unknown> {
    const responseText = useOpenRouter
      ? await openRouterGenerateContent({
          apiKey: openRouterKeyDocumentAnalysis.value(),
          model: providerSetting.openrouterModel!,
          providerSlug: providerSetting.openrouterProviderSlug,
          systemPrompt: prompt,
          parts: [
            `The JSON schema every record you draft must conform to:\n${JSON.stringify(portfolioSchema)}`,
            DRAFTING_FORMAT_INSTRUCTIONS,
            context,
            ...fileParts,
          ],
          responseMimeType: "application/json",
          // OpenRouter's default timeout (60s) is far too tight here — this call resends the
          // full schema/format instructions plus every uploaded document's raw bytes on every
          // call (no context cache on OpenRouter, unlike the Vertex path above), and document
          // uploads can run to several MB. 280s leaves 20s of headroom under this function's own
          // 300s ceiling (documentsAnalyze's timeoutSeconds, below).
          timeoutMs: 280_000,
        })
      : await generateContent({
          cachedContentName: cache!,
          parts: [context, ...fileParts],
          responseMimeType: "application/json",
        });
    try {
      return JSON.parse(responseText);
    } catch {
      throw new HttpsError("internal", "The AI did not return valid JSON.");
    }
  }

  let parsed: unknown;
  try {
    parsed = await draftOnce(cacheName);
  } catch (err) {
    // A genuinely unreadable file (corrupted, empty, or not a real document despite its
    // extension) — Gemini rejects the whole call outright rather than just skipping that one
    // file, and retrying with a rebuilt cache would only hit the exact same error again. Give a
    // clear, actionable message instead of letting this fall through to the generic retry below,
    // which would otherwise surface to the client as an opaque "internal" error (confirmed in
    // production: an unreadable attachment showed up to the admin as a bare "[500]").
    if (err instanceof ApiError && /no pages/i.test(err.message ?? "")) {
      throw new HttpsError(
        "invalid-argument",
        "One of the uploaded files couldn't be read by the AI — it may be empty, corrupted, or not a valid document. Try re-exporting or re-uploading it."
      );
    }
    // A reused cache can fail if it expired (1-hour TTL) or was otherwise invalidated — rebuild
    // once and retry, same pattern as ai-portfolioQuery.ts's own cache-reuse fallback.
    if (err instanceof ApiError) {
      draftingCache = undefined;
      parsed = await draftOnce(await getDraftingCache(prompt));
    } else {
      throw err;
    }
  }

  // Tolerate the model still returning a bare array despite the {records, warnings} instruction
  // — treat it as "no warnings" rather than fail the whole analysis over a format slip.
  let draftedRecords: unknown;
  let aiWarnings: string[] = [];
  if (Array.isArray(parsed)) {
    draftedRecords = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).records)) {
    draftedRecords = (parsed as Record<string, unknown>).records;
    const rawWarnings = (parsed as Record<string, unknown>).warnings;
    if (Array.isArray(rawWarnings)) aiWarnings = rawWarnings.filter((w): w is string => typeof w === "string");
  } else {
    throw new HttpsError("internal", "Gemini did not return the expected {records, warnings} shape.");
  }
  if (!Array.isArray(draftedRecords)) {
    throw new HttpsError("internal", "Gemini did not return a JSON array of records.");
  }
  normalizeRecordTypes(draftedRecords as Record<string, unknown>[]);
  const parsedRecords = draftedRecords;

  // member_valuations is arithmetic the model gets wrong in practice (verified: it drafted
  // plausible-looking but fabricated numbers spread across the wrong members instead of using
  // the allocation table above) — proportional splitting is exact, deterministic math, so do it
  // in code rather than trust the model's, overwriting whatever it drafted for these two types.
  //
  // memberAllocationTotals only reflects allocations already committed to the DB — a document
  // that drafts a NEW round (new investors included) *and* its companion valuation-change mark
  // in the same batch would otherwise compute that mark's split from a total that doesn't yet
  // include the new round's own money, silently omitting brand-new investors from
  // member_valuations (confirmed: real Nocira document, checkConsistency correctly counted them
  // as allocation-holders via the round record's own `allocations` dict, but this override
  // didn't). Merge in any batch-internal round record's `allocations` before splitting — same
  // "balanced scenario only" dedupe as the DB query, since round records are tripled per scenario.
  const combinedAllocationTotals = new Map(memberAllocationTotals.map((m) => [m.memberId, m.total]));
  const ROUND_TYPES_WITH_ALLOCATIONS = new Set(["Participating_PricedRound", "Participating_SAFERound"]);
  for (const record of parsedRecords as Record<string, unknown>[]) {
    if (
      !ROUND_TYPES_WITH_ALLOCATIONS.has(String(record.type)) ||
      String(record.scenario ?? "").toLowerCase() !== "balanced"
    ) {
      continue;
    }
    const allocations = (record.allocations as Record<string, number> | undefined) ?? {};
    for (const [memberId, amount] of Object.entries(allocations)) {
      if (typeof amount !== "number") continue;
      combinedAllocationTotals.set(memberId, (combinedAllocationTotals.get(memberId) ?? 0) + amount);
    }
  }
  const totalAllocated = [...combinedAllocationTotals.values()].reduce((sum, v) => sum + v, 0);
  const VALUATION_TYPES = new Set(["Transaction_ValuationChange", "Internal_ValuationAssessment"]);

  // The admin already told us definitively which company this document is about (at upload
  // time) — force it on every record rather than trusting whatever spelling the model used,
  // so a drafted record can never silently create a near-duplicate company row.
  const proposedRecords: Record<string, unknown>[] = (parsedRecords as Record<string, unknown>[]).map((record) => {
    const withCompany = { ...record, company: companyName };
    const fmv = record.asv_total_fair_market_value;
    if (VALUATION_TYPES.has(record.type as string) && totalAllocated > 0 && typeof fmv === "number") {
      const memberValuations: Record<string, number> = {};
      for (const [memberId, total] of combinedAllocationTotals) {
        memberValuations[memberId] = Math.round((total / totalAllocated) * fmv * 100) / 100;
      }
      return { ...withCompany, member_valuations: memberValuations };
    }
    return withCompany;
  });

  // Same reasoning as member_valuations above: the model's own viewpoint_analysis guess (drafted
  // from training data alone, since it has no real web access without the grounding tool, which
  // itself can't run in the same JSON-mode call) is replaced with real, grounded research —
  // never trust the model's own citations. Runs once per company, not once per record: the same
  // underlying market facts apply to every optimistic/balanced/conservative scenario copy the
  // model drafted, only the impact interpretation differs, so one grounding call covers all of
  // them.
  const needsResearch = proposedRecords.some((record) => VIEWPOINT_TYPES.has(record.type as string));
  if (needsResearch) {
    const research = await researchMarketContext(companyName, fileParts, providerSetting.searchBackend);
    for (const record of proposedRecords) {
      const type = record.type as string;
      if (!VIEWPOINT_TYPES.has(type)) continue;
      const scenario = SCENARIO_LABELS[String(record.scenario).toLowerCase()] ?? "Balanced";
      record.viewpoint_analysis = {
        scenario,
        market_research_grounding: research.marketResearchGrounding,
        valuation_impact_summary: research.impactByScenario[scenario],
        ...(type === "CompanyUpdate" && research.sources.length > 0 ? { web_sources: research.sources } : {}),
      };
    }
  }

  // Programmatic guardrail, independent of whatever the model self-reported above — same checks
  // that block a commit later (checkConsistency, importDiff.ts), run here too so the admin sees
  // them immediately in review rather than only discovering them if/when they try to commit.
  // Both severities are surfaced as warnings at this review stage (nothing is written to the
  // database yet); only "error" severity actually blocks at commit time.
  const guardrailFindings = await checkValuationGuardrails(proposedRecords);
  const guardrailWarnings = guardrailFindings.map((f) => f.message);

  // Consolidation + silent-add (plan §3): group identical-content scenario copies into one
  // reviewable unit, then mark each group visible/hidden per the REVIEWER's own per-member
  // scenario setting (Member.lockedScenario — replaces the old per-role-tier app_setting) — a
  // reviewer locked to "balanced" only reviews groups covering balanced; everything else is
  // still returned (so it can be committed unedited), just not for display.
  const callerRows = await query<{ lockedScenario: string | null }>(
    `SELECT "locked_scenario" AS "lockedScenario" FROM "member" WHERE id = $1`,
    [caller.memberId]
  );
  const lockedScenario = (callerRows[0]?.lockedScenario ?? "").toLowerCase();
  const groups: RecordGroup[] = groupRecordsByContent(proposedRecords).map((g) => ({
    ...g,
    visible: !lockedScenario || g.scenarios.includes(lockedScenario),
  }));

  // A dict key that isn't a real Member.id — either a genuinely new investor, or a name the
  // model failed to resolve against the member list it was given (see aiPrompts.ts's
  // document_analysis prompt, which now asks it to try harder before giving up) — would
  // otherwise only surface as a raw foreign-key violation at commit time. Caught here instead,
  // with a specific, actionable message, and again (as a hard block) in checkConsistency for
  // every other entry path (hand-typed JSON import, manual edits).
  const knownMemberIds = await fetchAllMemberIds();
  const unknownMemberRefs = findUnknownMemberReferences(proposedRecords, knownMemberIds);
  // Returned separately from `warnings` (not merged in) — the review UI renders these with a
  // dedicated "add this member" action rather than as plain text, so surfacing them twice would
  // just be redundant.
  const unknownMemberReferences = [...new Set(unknownMemberRefs.map((r) => r.reference))];

  return {
    proposedRecords,
    warnings: [...aiWarnings, ...guardrailWarnings],
    groups,
    unknownMemberReferences,
  };
}
