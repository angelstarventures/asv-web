import { formatCurrencyCompact } from "./StatTile";

export interface SectorValue {
  sector: string;
  value: number;
}

// Magnitude comparison across sectors -> sequential single-hue bar (dataviz skill: sequential
// is the safe default whenever the job is "compare magnitude," not identity). Horizontal so
// long sector names never truncate.
export function SectorValueBars({ data }: { data: SectorValue[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No portfolio value yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.sector} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-zinc-700 dark:text-zinc-300" title={d.sector}>
            {d.sector}
          </span>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-[18px] flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className="h-[18px] rounded-full"
                style={{
                  width: `${Math.max((d.value / max) * 100, 3)}%`,
                  backgroundColor: "var(--viz-sequential)",
                }}
                title={`${d.sector}: ${formatCurrencyCompact(d.value)}`}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
              {formatCurrencyCompact(d.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
