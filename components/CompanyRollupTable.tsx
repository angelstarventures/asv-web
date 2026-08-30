import { formatCurrencyCompact, formatMoic } from "./StatTile";

export interface CompanyRollupRow {
  companyKey: string;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
  company?: { name: string; sector?: string | null } | null;
}

// Per-company breakdown table — shared by the member dashboard's `asv` scope and the admin
// dashboard (plan §4, wireframes 3 and 5).
export function CompanyRollupTable({ rows }: { rows: CompanyRollupRow[] }) {
  const companyRows = rows.filter((r) => r.company);

  if (companyRows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No company rollups for this scenario yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-2 font-medium">Company</th>
          <th className="py-2 font-medium">Sector</th>
          <th className="py-2 text-right font-medium">MOIC</th>
          <th className="py-2 text-right font-medium">Unrealized</th>
          <th className="py-2 text-right font-medium">Realized</th>
        </tr>
      </thead>
      <tbody>
        {companyRows.map((r) => (
          <tr key={r.companyKey} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">{r.company!.name}</td>
            <td className="py-2 text-zinc-500 dark:text-zinc-500">{r.company!.sector ?? "—"}</td>
            <td className="py-2 text-right tabular-nums">{formatMoic(r.moic)}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.unrealizedValue)}</td>
            <td className="py-2 text-right tabular-nums">{formatCurrencyCompact(r.realizedValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
