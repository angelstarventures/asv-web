"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrencyCompact, MoicBadge } from "./StatTile";
import { HealthDot } from "./HealthDot";
import { CompanyHealth } from "@/lib/dataconnect/generated";
import type { Scenario as ScenarioParam } from "@/lib/scenarioTypes";

export interface CompanyRollupRow {
  companyKey: string;
  name: string;
  sector: string | null;
  health?: CompanyHealth;
  investmentYear?: number;
  invested: number;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
}

// Worst-first ordering for the Health column — sorting by the enum name alphabetically would
// put GREEN before RED, which reads backwards for "sort by health."
const HEALTH_RANK: Record<CompanyHealth, number> = {
  [CompanyHealth.RED]: 0,
  [CompanyHealth.YELLOW]: 1,
  [CompanyHealth.GREEN]: 2,
};

type SortKey = "name" | "health" | "sector" | "investmentYear" | "invested" | "moic" | "unrealizedValue" | "realizedValue";

const COLUMNS: { key: SortKey; label: string; align?: "right"; widthClass?: string }[] = [
  { key: "name", label: "Company" },
  { key: "health", label: "Health" },
  { key: "sector", label: "Sector", widthClass: "w-24" },
  { key: "investmentYear", label: "Investment year", align: "right" },
  { key: "invested", label: "Amount invested", align: "right" },
  { key: "moic", label: "MOIC", align: "right" },
  { key: "unrealizedValue", label: "Unrealized", align: "right" },
  { key: "realizedValue", label: "Realized", align: "right" },
];

function sortValue(row: CompanyRollupRow, key: SortKey): string | number {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "health":
      return row.health ? HEALTH_RANK[row.health] : Number.MAX_SAFE_INTEGER;
    case "sector":
      return (row.sector ?? "").toLowerCase();
    case "investmentYear":
      return row.investmentYear ?? -Infinity;
    default:
      return row[key];
  }
}

// Per-company breakdown table — shared by the member dashboard's `asv` scope and the admin
// dashboard (plan §4, wireframes 3 and 5). Client-rendered so column headers can drive sort
// state; the caller does all the Map-lookup joining (health/investment year come from separate
// queries) since a plain array of rows is what can actually cross the server/client boundary
// as props — Map instances can't. "Details" links to a dedicated page (not a popup) — events
// aren't fetched here at all anymore, the detail page fetches its own via getCompanyEvents.
export function CompanyRollupTable({
  rows,
  detailHrefBase,
  scenarioParam,
  extraQuery,
}: {
  rows: CompanyRollupRow[];
  detailHrefBase: string;
  scenarioParam: ScenarioParam;
  // Carries forward context the caller needs on the way back (e.g. admin's ?memberId=) — not
  // needed to render the detail page itself, just for its "back" link.
  extraQuery?: string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

  function detailHref(r: CompanyRollupRow): string {
    return `${detailHrefBase}/${r.companyKey}?scenario=${scenarioParam}&name=${encodeURIComponent(r.name)}${extraQuery ?? ""}`;
  }

  const sortedRows = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No holdings for this scenario yet.</p>;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
    <div className="mb-3 flex items-center gap-2 md:hidden">
      <label htmlFor="company-rollup-sort" className="text-xs font-semibold uppercase text-zinc-500">
        Sort by
      </label>
      <select
        id="company-rollup-sort"
        value={sort.key}
        onChange={(e) => setSort((prev) => ({ ...prev, key: e.target.value as SortKey }))}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {COLUMNS.map((col) => (
          <option key={col.key} value={col.key}>
            {col.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setSort((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))}
        aria-label={sort.dir === "asc" ? "Sort ascending" : "Sort descending"}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
      >
        {sort.dir === "asc" ? "▲" : "▼"}
      </button>
    </div>

    <div className="flex flex-col gap-3 md:hidden">
      {sortedRows.map((r) => (
        <div key={r.companyKey} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={detailHref(r)} className="font-medium underline underline-offset-2">
                {r.name}
              </Link>
              <p className="text-xs text-zinc-500">{r.sector ?? "—"}</p>
            </div>
            <HealthDot health={r.health} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Investment year</dt>
              <dd className="tabular-nums">{r.investmentYear ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Amount invested</dt>
              <dd className="tabular-nums">{formatCurrencyCompact(r.invested)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">MOIC</dt>
              <dd className="tabular-nums">
                <MoicBadge value={r.moic} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Unrealized</dt>
              <dd className="tabular-nums">{formatCurrencyCompact(r.unrealizedValue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Realized</dt>
              <dd className="tabular-nums">{formatCurrencyCompact(r.realizedValue)}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>

    <div className="hidden md:block md:overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {COLUMNS.map((col) => {
            const active = sort.key === col.key;
            return (
              <th
                key={col.key}
                aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                className={`py-2 font-medium ${col.align === "right" ? "text-right" : ""} ${col.widthClass ?? ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className={`inline-flex items-center gap-1 hover:text-foreground ${
                    col.align === "right" ? "flex-row-reverse" : ""
                  } ${active ? "text-foreground" : ""}`}
                >
                  {col.label}
                  <span aria-hidden className="text-[10px]">
                    {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((r) => (
          <tr key={r.companyKey} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">
              <Link href={detailHref(r)} className="underline underline-offset-2">
                {r.name}
              </Link>
            </td>
            <td className="py-2">
              <HealthDot health={r.health} />
            </td>
            <td className="py-2 text-zinc-500 dark:text-zinc-500">
              <span className="block w-24 truncate" title={r.sector ?? undefined}>
                {r.sector ?? "—"}
              </span>
            </td>
            <td className="py-2 text-right tabular-nums">{r.investmentYear ?? "—"}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.invested)}</td>
            <td className="py-2 text-right tabular-nums">
              <MoicBadge value={r.moic} />
            </td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.unrealizedValue)}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.realizedValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    </div>
  );
}
