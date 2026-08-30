"use client";

import { useState } from "react";
import type { ListCompaniesData, ListMemberProfilesData } from "@/lib/dataconnect/generated";

const TABS = ["welcome", "profiles", "companies"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  welcome: "Welcome",
  profiles: "Board & Members",
  companies: "Portfolio Companies",
};

export function LandingTabs({
  members,
  companies,
}: {
  members: ListMemberProfilesData["members"];
  companies: ListCompaniesData["companies"];
}) {
  const [tab, setTab] = useState<Tab>("welcome");
  const board = members.filter((m) => m.role === "ADMIN");
  const rest = members.filter((m) => m.role !== "ADMIN");

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-foreground text-foreground"
                : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="px-2 py-8 text-left">
        {tab === "welcome" && (
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Angel Star Ventures</h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Investment tracking for ASV members and the board.
            </p>
          </div>
        )}

        {tab === "profiles" && (
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Board</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {board.map((m) => (
                  <li key={m.id} className="text-sm">
                    {m.displayName}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Members</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {rest.map((m) => (
                  <li key={m.id} className="text-sm">
                    {m.displayName}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "companies" && (
          <ul className="flex flex-col gap-1">
            {companies.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between border-b border-zinc-100 py-2 text-sm last:border-0 dark:border-zinc-900"
              >
                <span>{c.name}</span>
                <span className="text-zinc-500 dark:text-zinc-500">{c.sector ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
