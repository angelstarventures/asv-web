import { defineSecret } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";
import { withTransaction } from "./dataconnect-admin";

// Cheap, raw-search alternative to Vertex AI's Google Search grounding tool — used by
// documents-analyze.ts's researchMarketContext and ai-portfolioQuery.ts's resolveNeedsResearch
// when that feature's AiProviderSetting.searchBackend is "serper" instead of the default
// "vertex". A single shared secret (unlike openRouterSecrets.ts's deliberate one-per-feature
// split) — Serper has no equivalent per-feature billing/blast-radius concern since it's a plain
// search lookup, not a generative call being routed to a specific model/vendor per feature.
export const serperApiKey = defineSecret("SERPER_API_KEY");

const SERPER_URL = "https://google.serper.dev/search";
const SERPER_TIMEOUT_MS = 15_000;

export interface SerperResult {
  title: string;
  snippet: string;
  link: string;
}

// Best-effort only — a failure here must never fail the search itself, since it's purely a
// cost-tracking side effect (backs the site-admin Costs page's Serper tile).
async function recordSerperUsage(): Promise<void> {
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO "serper_usage_counter" (key, "query_count", "updated_at") VALUES ('total', 1, now())
         ON CONFLICT (key) DO UPDATE SET "query_count" = "serper_usage_counter"."query_count" + 1, "updated_at" = now()`
      );
    });
  } catch (err) {
    console.error("recordSerperUsage: failed to increment usage counter", err);
  }
}

export async function serperSearch(apiKey: string, query: string, num = 8): Promise<SerperResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);
  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new HttpsError("internal", `Serper request failed (${res.status}): ${errText.slice(0, 300)}`);
    }
    await recordSerperUsage();
    const json = (await res.json()) as { organic?: { title?: string; snippet?: string; link?: string }[] };
    return (json.organic ?? [])
      .filter((r): r is { title: string; snippet?: string; link: string } => Boolean(r.title && r.link))
      .map((r) => ({ title: r.title, snippet: r.snippet ?? "", link: r.link }));
  } finally {
    clearTimeout(timeout);
  }
}
