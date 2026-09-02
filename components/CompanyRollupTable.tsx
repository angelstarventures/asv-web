"use client";

import { useMemo, useState } from "react";
import { formatCurrencyCompact, MoicBadge } from "./StatTile";
import { HealthDot } from "./HealthDot";
import { CompanyEventsModal, type CompanyEventRow } from "./CompanyEventsModal";
import { CompanyHealth } from "@/lib/dataconnect/generated";

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
  events: CompanyEventRow[];
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
// state; the caller does all the Map-lookup joining (health/investment year/events come from
// separate queries) since a plain array of rows is what can actually cross the server/client
// boundary as props — Map instances can't.
export function CompanyRollupTable({ rows }: { rows: CompanyRollupRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });

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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-card px-5 py-4">
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
          <th className="py-2 pl-8 font-medium">Details</th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((r) => (
          <tr key={r.companyKey} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">{r.name}</td>
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
            <td className="py-2 pl-8">
              <CompanyEventsModal companyName={r.name} events={r.events} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
