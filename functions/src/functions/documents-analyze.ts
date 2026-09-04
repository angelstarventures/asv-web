import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { ApiError } from "@google/genai";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { generateContent, generateGroundedContent, createContextCache, type ContentPart } from "../lib/vertexAi";
import { getPromptSetting } from "../lib/aiPrompts";
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
}

export interface DocumentsAnalyzeOutput {
  proposedRecords: Record<string, unknown>[];
}

const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB total across all files in one analysis call

const DRAFTING_FORMAT_INSTRUCTIONS =
  'Respond with a JSON array of record objects only — no prose, no markdown fences. Each record needs an explicit lowercase "scenario" field ("optimistic", "balanced", or "conservative"). Investment-round records (Participating_PricedRound, Participating_SAFERound, NonParticipating_Round) never diverge by scenario — return one identical copy of the record per scenario (3 copies total). Other types may legitimately differ by scenario; draft your best assessment for each.';

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

// Grounded, plain-text research — deliberately never JSON mode: Vertex AI rejects combining
// Google Search grounding with controlled/JSON generation ("controlled generation is not
// supported with Search tool", confirmed empirically against the live API). Parses a small
// delimited plain-text format instead of structured output, and falls back to a generic note on
// any failure (malformed response, safety block, network error) rather than throwing — this is
// an enrichment step, not something that should ever block a real analysis from completing.
async function researchMarketContext(companyName: string, fileParts: ContentPart[]): Promise<MarketResearchResult> {
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
    const prompt = [
      `Using Google Search, research current market conditions relevant to "${companyName}"'s sector: comparable company valuations, recent funding rounds, M&A or exit activity, and broader sector trends. The attached document(s) describe a specific update or valuation event for this company — ground your research in what's relevant to assessing it.`,
      "Respond in EXACTLY this plain-text format, nothing else (no JSON, no markdown, no extra commentary):",
      "MARKET_RESEARCH_GROUNDING: <2-4 sentence summary of your findings and how they relate to this company>",
      "OPTIMISTIC_IMPACT: <1-2 sentences: under an optimistic scenario, does this research support a markup, markdown, or no change, and why>",
      "BALANCED_IMPACT: <same, under a balanced/base-case scenario>",
      "CONSERVATIVE_IMPACT: <same, under a conservative scenario>",
    ].join("\n");

    const { text, sources } = await generateGroundedContent({
      systemPrompt: "You are a market research analyst supporting a venture fund's portfolio valuation process.",
      parts: [prompt, ...fileParts],
    });

    const extract = (label: string) => text.match(new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"))?.[1]?.trim();

    return {
      marketResearchGrounding: extract("MARKET_RESEARCH_GROUNDING") ?? fallback.marketResearchGrounding,
      impactByScenario: {
        Optimistic: extract("OPTIMISTIC_IMPACT") ?? fallback.impactByScenario.Optimistic,
        Balanced: extract("BALANCED_IMPACT") ?? fallback.impactByScenario.Balanced,
        Conservative: extract("CONSERVATIVE_IMPACT") ?? fallback.impactByScenario.Conservative,
      },
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
  { timeoutSeconds: 300 },
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
  await requireAdmin(request);

  const { companyId, newCompanyName, files } = request.data;
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
  let existingLedger: { date: string; type: string; scenario: string }[] = [];
  let memberAllocationTotals: { memberId: string; total: number }[] = [];
  if (companyId) {
    const companies = await query<{ name: string }>(`SELECT name FROM "company" WHERE id = $1`, [companyId]);
    const company = companies[0];
    if (!company) {
      throw new HttpsError("not-found", `No company row for id "${companyId}".`);
    }
    companyName = company.name;
    // This company's own history only — context, not a portfolio-wide data dump.
    existingLedger = await query<{ date: string; type: string; scenario: string }>(
      `SELECT le."event_date"::text AS "date", le.type, le.scenario
       FROM "ledger_entry" le WHERE le."company_id" = $1 ORDER BY le."event_date" ASC`,
      [companyId]
    );
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
  const cacheName = await getDraftingCache(prompt);

  // The schema + response-format instructions moved into the drafting cache (getDraftingCache)
  // since they're identical on every call — this context is just the parts that vary per call.
  const context = [
    `Company: ${companyName}`,
    `Member list (id, name, investing entity) — resolve any investor named in the document to the matching id:\n${JSON.stringify(members)}`,
    companyId
      ? `This company's existing ledger entries (date/type/scenario only), for context:\n${JSON.stringify(existingLedger)}`
      : "This is a brand-new company ASV has no prior ledger history with — draft its first investment round record(s) from the document.",
    companyId
      ? `Each member's cumulative cash allocation into this company to date (memberId -> total dollars invested, balanced scenario, which equals every scenario since investment-round records never diverge by scenario). Use this to compute member_valuations proportionally whenever you draft a Transaction_ValuationChange or Internal_ValuationAssessment record for this company: member_valuations[memberId] = (that member's total here / sum of all totals here) * asv_total_fair_market_value:\n${JSON.stringify(memberAllocationTotals)}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  const fileParts: ContentPart[] = files.map((f, i) => ({
    inlineData: { mimeType: f.mimeType, data: fileBuffers[i].toString("base64") },
  }));

  async function draftOnce(cache: string): Promise<unknown> {
    const responseText = await generateContent({
      cachedContentName: cache,
      parts: [context, ...fileParts],
      responseMimeType: "application/json",
    });
    try {
      return JSON.parse(responseText);
    } catch {
      throw new HttpsError("internal", "Gemini did not return valid JSON.");
    }
  }

  let parsed: unknown;
  try {
    parsed = await draftOnce(cacheName);
  } catch (err) {
    // A reused cache can fail if it expired (1-hour TTL) or was otherwise invalidated — rebuild
    // once and retry, same pattern as ai-portfolioQuery.ts's own cache-reuse fallback.
    if (err instanceof ApiError) {
      draftingCache = undefined;
      parsed = await draftOnce(await getDraftingCache(prompt));
    } else {
      throw err;
    }
  }
  if (!Array.isArray(parsed)) {
    throw new HttpsError("internal", "Gemini did not return a JSON array.");
  }

  // member_valuations is arithmetic the model gets wrong in practice (verified: it drafted
  // plausible-looking but fabricated numbers spread across the wrong members instead of using
  // the allocation table above) — proportional splitting is exact, deterministic math, so do it
  // in code rather than trust the model's, overwriting whatever it drafted for these two types.
  const totalAllocated = memberAllocationTotals.reduce((sum, m) => sum + m.total, 0);
  const VALUATION_TYPES = new Set(["Transaction_ValuationChange", "Internal_ValuationAssessment"]);

  // The admin already told us definitively which company this document is about (at upload
  // time) — force it on every record rather than trusting whatever spelling the model used,
  // so a drafted record can never silently create a near-duplicate company row.
  const proposedRecords: Record<string, unknown>[] = (parsed as Record<string, unknown>[]).map((record) => {
    const withCompany = { ...record, company: companyName };
    const fmv = record.asv_total_fair_market_value;
    if (VALUATION_TYPES.has(record.type as string) && totalAllocated > 0 && typeof fmv === "number") {
      const memberValuations: Record<string, number> = {};
      for (const m of memberAllocationTotals) {
        memberValuations[m.memberId] = Math.round((m.total / totalAllocated) * fmv * 100) / 100;
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
    const research = await researchMarketContext(companyName, fileParts);
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

  return { proposedRecords };
}
