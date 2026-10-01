"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiPortfolioQuery, type ChatTurn } from "@/lib/functions/aiChat";
import { tenantConfig } from "@/lib/config/tenant";

// The schema/ledger/member-list context is seeded once per session as a Vertex AI context
// cache (see ai-portfolioQuery.ts) — this component just carries the returned cache handle and
// the conversation history forward on each message, rather than re-sending the heavy context
// itself. Switching scope changes what data the cache holds, so the dashboard remounts this
// component on scope change (`key={scope}`) rather than resetting state in an effect —
// React's own recommended pattern for "reset all state when an identity changes."
export function PortfolioAiChat({ scope }: { scope: "mine" | "asv" }) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [cachedContentName, setCachedContentName] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    const nextHistory: ChatTurn[] = [...history, { role: "user", text: message }];
    setHistory(nextHistory);
    try {
      const result = await aiPortfolioQuery({ message, scope, cachedContentName, history });
      setCachedContentName(result.cachedContentName);
      setHistory([...nextHistory, { role: "model", text: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the portfolio assistant.");
      setHistory(history);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      <h2 className="text-sm font-medium">
        Ask about {scope === "mine" ? "your holdings" : `the ${tenantConfig.orgAbbreviation} portfolio`}
      </h2>

      {history.length > 0 && (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {history.map((turn, i) => (
            <div
              key={i}
              className={`rounded-md px-3 py-2 text-sm ${
                turn.role === "user"
                  ? "self-end bg-foreground text-background"
                  : "self-start bg-zinc-100 text-foreground dark:bg-zinc-900"
              }`}
            >
              {turn.role === "model" ? (
                <div className="chat-markdown flex flex-col gap-2 [&_a]:underline [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-300 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc dark:[&_td]:border-zinc-700 dark:[&_th]:border-zinc-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                </div>
              ) : (
                turn.text
              )}
            </div>
          ))}
        </div>
      )}

      {busy && !cachedContentName && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Loading portfolio data for this session — the first question can take a minute or more.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            scope === "mine"
              ? "e.g. What's my MOIC in the balanced scenario?"
              : `e.g. What's ${tenantConfig.orgAbbreviation}'s portfolio-wide MOIC?`
          }
          disabled={busy}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Thinking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
