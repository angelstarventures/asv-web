"use client";

import { useState, type ReactNode } from "react";

// Server-fetched content for each tab is passed in as already-rendered JSX (a Server Component
// can be passed as a Client Component's children/props) — this wrapper only owns the tab-switch
// state, same lightweight local useState pattern as every other toggle in this app.
export function DocumentsTabs({ companyTab, taxTab }: { companyTab: ReactNode; taxTab: ReactNode }) {
  const [tab, setTab] = useState<"company" | "tax">("company");

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1 self-start rounded-2xl border border-zinc-200 bg-card p-1.5 dark:border-zinc-800">
        {(
          [
            ["company", "Company Documents/Updates"],
            ["tax", "Tax Documents"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={
              tab === key
                ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 hover:text-foreground"
            }
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "company" ? companyTab : taxTab}
    </div>
  );
}
