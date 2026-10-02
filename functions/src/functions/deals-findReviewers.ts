import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled } from "../lib/organizationFeatureCheck";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { dispatchGenerateContent } from "../lib/aiDispatch";
import { openRouterKeyDealKeywordGeneration, openRouterKeyDealReviewerMatching } from "../lib/openRouterSecrets";
import { getAiProviderSetting } from "../lib/aiProviderSettings";
import { rankByKeywordOverlap } from "../lib/keywordMatch";
import { rankByEmbeddingSimilarity } from "../lib/embeddingMatch";

// Backs the "Find Reviewers" button in the admin deals table — picks up to 4 members whose
// self-reported expertise best matches a deal's sector/keywords, and PERSISTS the result
// (deal_reviewer_match, full delete-then-insert replace) so the deals list can render a
// "message this reviewer" WhatsApp button per match without recomputing on every page load.
// A regular admin can only run this once per deal — once matches exist, a second call is
// rejected (the deals-list UI already hides the button in that state; this is the server-side
// backstop). A site-admin can always re-run it, replacing whatever's there.
//
// Keywords stay empty until this admin-initiated click generates them — exactly once,
// persisted back onto the deal so repeat clicks don't re-spend that call either.

export interface DealsFindReviewersInput {
  dealId: string;
}

export interface ReviewerMatch {
  memberId: string;
  displayName: string;
  phoneNumber: string | null;
  reason: string;
}

export interface DealsFindReviewersOutput {
  matches: ReviewerMatch[];
  companyBlurb: string | null;
  pitchDeckUrl: string | null;
}

interface CandidateRow {
  id: string;
  displayName: string;
  phoneNumber: string | null;
  expertise: string[];
}

// Best-effort only — a slow/unreachable company site or a flaky Gemini call must never block
// "Send for review", so any failure here just leaves keywords null rather than throwing.
// Fetches the site's raw HTML (no JS rendering) for extra signal alongside the deal's own
// sector/executive summary; a company URL that's JS-only client-rendered may yield weaker
// results, an accepted tradeoff for not running a full headless browser inside this function.
async function generateCompanyKeywords(deal: {
  companyName: string;
  companyUrl: string;
  sector: string | null;
  executiveSummary: string | null;
}): Promise<string[] | null> {
  let html = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(deal.companyUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }).finally(() => clearTimeout(timeout));
    if (res.ok) html = (await res.text()).slice(0, 50_000);
  } catch (err) {
    console.error("generateCompanyKeywords: company site fetch failed, continuing without it", err);
  }

  try {
    const text = await dispatchGenerateContent("deal_keyword_generation", {
      systemPrompt:
        "You classify early-stage startup companies for a venture fund. Given a company's name, sector, " +
        "executive summary, and (if reachable) its website's raw HTML, respond with ONLY a JSON object of the " +
        'exact shape {"keywords": string[]} — keywords is 3-8 professional skill/expertise-area terms relevant ' +
        "to this company's specific domain and technology. These are used to match this deal against fund " +
        "members who might have that skill or expertise, so phrase each one the way a person would list it as a " +
        'skill on their own resume or LinkedIn profile (e.g. "Machine Learning", "Synthetic Biology", "Medical ' +
        'Device Regulatory Affairs", "Supply Chain Management", "B2B SaaS Sales", "Embedded Systems ' +
        "Engineering\"), NOT product/marketing buzzwords describing the company itself (avoid things like " +
        '"AI-powered" or "next-generation platform") — every keyword should read as something a qualified ' +
        "person could plausibly claim as their own expertise. No prose, no markdown, just the JSON object.",
      parts: [
        `Company: ${deal.companyName}`,
        `Sector: ${deal.sector ?? "unknown"}`,
        `Executive summary: ${deal.executiveSummary ?? "none provided"}`,
        html ? `Company website HTML:\n\n${html}` : "Company website could not be fetched.",
      ],
      responseMimeType: "application/json",
    });
    const parsed = JSON.parse(text) as { keywords?: unknown };
    const keywords =
      Array.isArray(parsed.keywords) && parsed.keywords.every((k) => typeof k === "string")
        ? (parsed.keywords as string[]).map((k) => k.trim()).filter(Boolean)
        : null;
    return keywords && keywords.length > 0 ? keywords : null;
  } catch (err) {
    console.error("generateCompanyKeywords: keyword generation failed", err);
    return null;
  }
}

export const dealsFindReviewers = onCall<DealsFindReviewersInput, Promise<DealsFindReviewersOutput>>(
  {
    // Default 60s is too tight once either AI call can be routed through OpenRouter — a
    // random-model router like openrouter/free varies a lot in latency per call, and this
    // function can make up to two sequential AI calls (keyword generation, then matching).
    timeoutSeconds: 180,
    secrets: [openRouterKeyDealKeywordGeneration, openRouterKeyDealReviewerMatching],
  },
  async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "AI_DEAL_MATCHING");
    const { dealId } = request.data;
    if (!dealId) {
      throw new HttpsError("invalid-argument", "dealId is required.");
    }

    const existingMatchRows = await query<{ id: string }>(
      `SELECT id FROM "deal_reviewer_match" WHERE "deal_id" = $1 LIMIT 1`,
      [dealId]
    );
    if (existingMatchRows.length > 0 && caller.role !== "site_admin") {
      throw new HttpsError(
        "permission-denied",
        "Reviewers have already been found for this deal — only a site-admin can re-run matching."
      );
    }

    const deals = await query<{
      companyName: string;
      companyUrl: string;
      sector: string | null;
      keywords: string[] | null;
      executiveSummary: string | null;
    }>(
      `SELECT "company_name" AS "companyName", "company_url" AS "companyUrl", sector, keywords,
              "executive_summary" AS "executiveSummary"
       FROM "deal" WHERE id = $1`,
      [dealId]
    );
    const deal = deals[0];
    if (!deal) {
      throw new HttpsError("not-found", `No deal row for id "${dealId}".`);
    }

    if (!deal.keywords || deal.keywords.length === 0) {
      const generated = await generateCompanyKeywords(deal);
      if (generated) {
        deal.keywords = generated;
        await withTransaction(async (client) => {
          await client.query(`UPDATE "deal" SET "keywords" = $1, "updated_at" = now() WHERE id = $2`, [
            generated,
            dealId,
          ]);
        });
      }
    }

    const companyBlurb = deal.executiveSummary?.trim()
      ? deal.executiveSummary.trim().slice(0, 200) + (deal.executiveSummary.trim().length > 200 ? "..." : "")
      : null;

    const deckRows = await query<{ driveUrl: string }>(
      `SELECT "drive_url" AS "driveUrl" FROM "deal_document" WHERE "deal_id" = $1 AND "doc_type" = 'PITCH_DECK' LIMIT 1`,
      [dealId]
    );
    const pitchDeckUrl = deckRows[0]?.driveUrl ?? null;

    const candidates = await query<CandidateRow>(
      `SELECT id, "display_name" AS "displayName", "phone_number" AS "phoneNumber", "expertise"
       FROM "member"
       WHERE status = 'ACTIVE' AND "expertise" IS NOT NULL AND array_length("expertise", 1) > 0`
    );

    let picked: { memberId: string; reason: string }[] = [];
    if (candidates.length > 0) {
      const matchingSetting = await getAiProviderSetting("deal_reviewer_matching");
      const dealPhrases = [deal.sector ?? "", ...(deal.keywords ?? [])].filter(Boolean);
      if (matchingSetting.provider === "keyword_match") {
        // Deterministic, no external call — see keywordMatch.ts's own header comment for what
        // this can and can't catch relative to true semantic matching.
        const ranked = rankByKeywordOverlap(
          dealPhrases,
          candidates.map((c) => ({ memberId: c.id, expertise: c.expertise })),
          4
        );
        picked = ranked.map((r) => ({
          memberId: r.memberId,
          reason: `Keyword overlap: ${r.matchedExpertise.join(", ")}`,
        }));
      } else if (matchingSetting.provider === "embedding_match") {
        try {
          const ranked = await rankByEmbeddingSimilarity(
            dealPhrases,
            candidates.map((c) => ({ memberId: c.id, expertise: c.expertise })),
            4
          );
          picked = ranked.map((r) => ({
            memberId: r.memberId,
            reason: `Semantic match (similarity: ${r.score.toFixed(2)}).`,
          }));
        } catch (err) {
          // Same graceful-degradation posture as the generative-matching catch below — a
          // transient embedding-API failure shouldn't block "Send for review" outright.
          console.error("dealsFindReviewers: embedding match failed, returning zero matches", err);
        }
      } else {
        const candidateList = candidates.map((c) => ({ memberId: c.id, expertise: c.expertise }));
        try {
          const responseText = await dispatchGenerateContent("deal_reviewer_matching", {
            systemPrompt:
              "You match a venture deal to the fund members best positioned to review it, based on domain " +
              "expertise. Given a deal's sector and keywords, and a list of candidate members each with their own " +
              "self-reported expertise keywords, pick up to 4 members whose expertise most closely relates to the " +
              "deal's domain — treat this as a semantic match, not exact string matching (e.g. \"ML\" and \"Machine " +
              'Learning\" are the same skill; \"Medical Devices\" relates to \"FDA Regulatory Affairs\"). If fewer ' +
              "than 4 candidates have any plausible relevance, return fewer rather than padding with irrelevant " +
              'picks. Respond with ONLY a JSON object of the exact shape {"matches": [{"memberId": string, ' +
              '"reason": string}, ...]} — matches is an array of up to 4 objects, memberId is copied verbatim ' +
              "from the candidate list, and reason is a single short sentence explaining the match. No prose, " +
              // A bare top-level JSON array (the original shape here) silently breaks on OpenAI-compatible
              // JSON mode (OpenRouter/most non-Gemini providers): response_format: json_object requires an
              // OBJECT at the top level, so a model given both "respond with a JSON array" and that mode
              // either wraps the array unpredictably or the mode overrides the instruction — either way the
              // exact shape below is what every provider actually delivers reliably. Confirmed: Vertex/Gemini
              // tolerated the old bare-array shape fine, but every OpenRouter model tried (including paid
              // ones) silently returned zero usable picks under it.
              "no markdown, just the JSON object.",
            parts: [
              `Deal: sector="${deal.sector ?? "unknown"}", keywords=${JSON.stringify(deal.keywords ?? [])}`,
              `Candidate members:\n${JSON.stringify(candidateList)}`,
            ],
            responseMimeType: "application/json",
          });
          const parsed = JSON.parse(responseText) as { matches?: unknown };
          if (Array.isArray(parsed.matches)) {
            picked = parsed.matches
              .filter(
                (p): p is { memberId: unknown; reason: unknown } => typeof p === "object" && p !== null
              )
              .map((p) => ({ memberId: String(p.memberId ?? ""), reason: String(p.reason ?? "") }))
              .filter((p) => p.memberId);
          }
        } catch (err) {
          // Degrade to zero AI matches rather than a hard 500 — a weak/free model failing to
          // produce usable output is just an extreme case of "fewer than 4 candidates have any
          // plausible relevance" (already a normal, successful outcome), not a real system
          // failure. The admin still gets the deal's blurb/deck and can pick reviewers by hand.
          console.error("dealsFindReviewers: matching call failed, returning zero matches", err);
        }
      }
    }

    // Never trust the model's own ID references without validation — same posture as every
    // other AI-drafted-then-verified value in this codebase (member_valuations, viewpoint
    // research, etc.). Any memberId the model invented that isn't a real candidate is dropped.
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const matches: ReviewerMatch[] = picked
      .filter((p) => byId.has(p.memberId))
      .slice(0, 4)
      .map((p) => {
        const candidate = byId.get(p.memberId)!;
        return {
          memberId: candidate.id,
          displayName: candidate.displayName,
          phoneNumber: candidate.phoneNumber,
          reason: p.reason || "Relevant expertise on file.",
        };
      });

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM "deal_reviewer_match" WHERE "deal_id" = $1`, [dealId]);
      for (const m of matches) {
        await client.query(
          `INSERT INTO "deal_reviewer_match" ("deal_id", "member_id", "reason", "created_at")
           VALUES ($1, $2, $3, now())`,
          [dealId, m.memberId, m.reason]
        );
      }
    });

    return { matches, companyBlurb, pitchDeckUrl };
  }
);
