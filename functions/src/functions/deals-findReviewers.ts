import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { generateContent } from "../lib/vertexAi";

// Backs the "Send for review" button in the admin deals table — picks the 3 members whose
// self-reported expertise best matches a deal's AI-derived sector/keywords. A plain string-
// overlap score would rarely match at all: the deal's keywords are AI-generated resume-style
// phrases (deals-submitPitch.ts's detectCompanyProfile) and members free-type their own, so
// "ML" vs "Machine Learning" never match as exact strings — semantic matching needs a model.

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
}

interface CandidateRow {
  id: string;
  displayName: string;
  phoneNumber: string | null;
  expertiseKeywords: string[];
}

export const dealsFindReviewers = onCall<DealsFindReviewersInput, Promise<DealsFindReviewersOutput>>(
  async (request) => {
    await requireAdmin(request);
    const { dealId } = request.data;
    if (!dealId) {
      throw new HttpsError("invalid-argument", "dealId is required.");
    }

    const deals = await query<{ companyName: string; sector: string | null; keywords: string[] | null }>(
      `SELECT "company_name" AS "companyName", sector, keywords FROM "deal" WHERE id = $1`,
      [dealId]
    );
    const deal = deals[0];
    if (!deal) {
      throw new HttpsError("not-found", `No deal row for id "${dealId}".`);
    }

    const candidates = await query<CandidateRow>(
      `SELECT id, "display_name" AS "displayName", "phone_number" AS "phoneNumber", "expertise_keywords" AS "expertiseKeywords"
       FROM "member"
       WHERE status = 'ACTIVE' AND "expertise_keywords" IS NOT NULL AND array_length("expertise_keywords", 1) > 0`
    );
    if (candidates.length === 0) {
      return { matches: [] };
    }

    const candidateList = candidates.map((c) => ({ memberId: c.id, expertiseKeywords: c.expertiseKeywords }));

    let picked: { memberId: string; reason: string }[] = [];
    try {
      const responseText = await generateContent({
        systemPrompt:
          "You match a venture deal to the fund members best positioned to review it, based on domain " +
          "expertise. Given a deal's sector and keywords, and a list of candidate members each with their own " +
          "self-reported expertise keywords, pick the 3 members whose expertise most closely relates to the " +
          "deal's domain — treat this as a semantic match, not exact string matching (e.g. \"ML\" and \"Machine " +
          'Learning\" are the same skill; \"Medical Devices\" relates to \"FDA Regulatory Affairs\"). If fewer ' +
          "than 3 candidates have any plausible relevance, return fewer rather than padding with irrelevant " +
          'picks. Respond with ONLY a JSON array of up to 3 objects, each of the exact shape {"memberId": ' +
          'string, "reason": string} where memberId is copied verbatim from the candidate list and reason is a ' +
          "single short sentence explaining the match. No prose, no markdown, just the JSON array.",
        parts: [
          `Deal: sector="${deal.sector ?? "unknown"}", keywords=${JSON.stringify(deal.keywords ?? [])}`,
          `Candidate members:\n${JSON.stringify(candidateList)}`,
        ],
        responseMimeType: "application/json",
      });
      const parsed = JSON.parse(responseText) as unknown;
      if (Array.isArray(parsed)) {
        picked = parsed
          .filter(
            (p): p is { memberId: unknown; reason: unknown } => typeof p === "object" && p !== null
          )
          .map((p) => ({ memberId: String(p.memberId ?? ""), reason: String(p.reason ?? "") }))
          .filter((p) => p.memberId);
      }
    } catch (err) {
      console.error("dealsFindReviewers: matching call failed", err);
      throw new HttpsError("internal", "Could not compute reviewer matches.");
    }

    // Never trust the model's own ID references without validation — same posture as every
    // other AI-drafted-then-verified value in this codebase (member_valuations, viewpoint
    // research, etc.). Any memberId the model invented that isn't a real candidate is dropped.
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const matches: ReviewerMatch[] = picked
      .filter((p) => byId.has(p.memberId))
      .slice(0, 3)
      .map((p) => {
        const candidate = byId.get(p.memberId)!;
        return {
          memberId: candidate.id,
          displayName: candidate.displayName,
          phoneNumber: candidate.phoneNumber,
          reason: p.reason || "Relevant expertise on file.",
        };
      });

    return { matches };
  }
);
