import Link from "next/link";
import { formatCurrencyCompact } from "./StatTile";
import type { Scenario as ScenarioParam } from "@/lib/scenarioTypes";

export interface WriteOffRow {
  companyKey: string;
  name: string;
  sector: string | null;
  invested: number;
  // Every WRITTEN_OFF company has a SHUTDOWN/DISSOLUTION Exit_Event ledger entry behind it
  // (updateCompanyStatusForExit is the only path that sets this status) — null only for a
  // pre-existing row from before that event's date was joined in here.
  writeOffDate: string | null;
}

// Sourced from Company.status = WRITTEN_OFF, joined against that company's own Exit_Event
// (SHUTDOWN/DISSOLUTION) ledger entry for the date — see WriteOffRow's own comment.
export function WriteOffsTable({
  rows,
  detailHrefBase,
  scenarioParam,
  extraQuery,
}: {
  rows: WriteOffRow[];
  // Same "Company" -> dedicated detail page link as CompanyRollupTable's own detailHref.
  detailHrefBase: string;
  scenarioParam: ScenarioParam;
  extraQuery?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No write-offs yet.</p>;
  }

  function detailHref(r: WriteOffRow): string {
    return `${detailHrefBase}/${r.companyKey}?scenario=${scenarioParam}&name=${encodeURIComponent(r.name)}${extraQuery ?? ""}`;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-card px-5 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Company</th>
            <th className="py-2 font-medium">Sector</th>
            <th className="py-2 text-right font-medium">Write-off date</th>
            <th className="py-2 text-right font-medium">Amount invested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.companyKey} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={detailHref(r)} className="underline underline-offset-2">
                  {r.name}
                </Link>
              </td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{r.sector ?? "—"}</td>
              <td className="py-2 text-right tabular-nums">{r.writeOffDate ?? "—"}</td>
              <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.invested)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
