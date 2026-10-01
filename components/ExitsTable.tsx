import Link from "next/link";
import { formatCurrencyCompact, MoicBadge } from "./StatTile";
import type { Scenario as ScenarioParam } from "@/lib/scenarioTypes";
import { tenantConfig } from "@/lib/config/tenant";

export interface ExitRow {
  companyKey: string;
  name: string;
  sector: string | null;
  exitType: string;
  exitDate: string;
  totalExitValue: number;
  asvPayout: number;
  moicAtExit: number | null;
}

// Sourced from ExitEventDetail/ledger EXIT_EVENT rows — real per-liquidity-event detail, not
// just the company-level status flag WriteOffsTable reads.
export function ExitsTable({
  rows,
  detailHrefBase,
  scenarioParam,
  extraQuery,
}: {
  rows: ExitRow[];
  // Same "Company" -> dedicated detail page link as CompanyRollupTable's own detailHref.
  detailHrefBase: string;
  scenarioParam: ScenarioParam;
  extraQuery?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No exits yet.</p>;
  }

  function detailHref(r: ExitRow): string {
    return `${detailHrefBase}/${r.companyKey}?scenario=${scenarioParam}&name=${encodeURIComponent(r.name)}${extraQuery ?? ""}`;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-card px-5 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Company</th>
            <th className="py-2 font-medium">Sector</th>
            <th className="py-2 font-medium">Exit type</th>
            <th className="py-2 text-right font-medium">Exit date</th>
            <th className="py-2 text-right font-medium">Total exit value</th>
            <th className="py-2 text-right font-medium">{tenantConfig.orgAbbreviation} payout</th>
            <th className="py-2 text-right font-medium">MOIC at exit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.companyKey}-${r.exitDate}`} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={detailHref(r)} className="underline underline-offset-2">
                  {r.name}
                </Link>
              </td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{r.sector ?? "—"}</td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{r.exitType.replaceAll("_", " ")}</td>
              <td className="py-2 text-right tabular-nums">{r.exitDate}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.totalExitValue)}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.asvPayout)}</td>
              <td className="py-2 text-right tabular-nums">
                {r.moicAtExit != null ? <MoicBadge value={r.moicAtExit} /> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
