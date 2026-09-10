import { CompanyHealth } from "@/lib/dataconnect/generated";
import { HEALTH_STATUS } from "@/lib/health";
import type { HealthYearEntry } from "@/lib/reportsData";

const ORDER: CompanyHealth[] = [CompanyHealth.GREEN, CompanyHealth.YELLOW, CompanyHealth.RED];
const BAR_MAX_HEIGHT = 220;
const BAR_WIDTH = 40;
// A segment needs to be at least this tall for its count label to fit without spilling out.
const MIN_HEIGHT_FOR_LABEL = 16;

// Bar-only by design (no pie/bar toggle rendered by the caller) — health is a categorical
// state, not a part-to-whole quantity, so "years" as pie slices would be meaningless. Reuses
// the SAME status colors as HealthMixDonut (dataviz skill: status colors are reserved, never
// reassigned to a generic series) — a stacked bar per year instead of the donut's single
// snapshot, since this is the same data across time instead of at a single instant.
export function HealthByYearPanel({ data }: { data: HealthYearEntry[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No data yet.</p>;
  }

  const maxTotal = Math.max(...data.map((d) => ORDER.reduce((sum, k) => sum + d.counts[k], 0)), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6 overflow-x-auto pb-1">
        {data.map((d) => {
          const total = ORDER.reduce((sum, k) => sum + d.counts[k], 0);
          return (
            <div key={d.year} className="flex flex-col items-center gap-1">
              <div
                className="flex flex-col-reverse overflow-hidden rounded-sm"
                style={{ height: BAR_MAX_HEIGHT, width: BAR_WIDTH }}
                role="img"
                aria-label={`${d.year}: ${ORDER.map((k) => `${HEALTH_STATUS[k].label} ${d.counts[k]}`).join(", ")}`}
              >
                {total === 0 ? (
                  <div className="h-full w-full bg-zinc-100 dark:bg-zinc-900" />
                ) : (
                  ORDER.map((k) => {
                    if (d.counts[k] === 0) return null;
                    const segmentHeight = (d.counts[k] / maxTotal) * BAR_MAX_HEIGHT;
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-center"
                        style={{ height: `${segmentHeight}px`, backgroundColor: HEALTH_STATUS[k].color }}
                      >
                        {segmentHeight >= MIN_HEIGHT_FOR_LABEL && (
                          <span className="text-xs font-medium tabular-nums text-white">{d.counts[k]}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <span className="text-xs tabular-nums text-zinc-500">{d.year}</span>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-4 text-sm">
        {ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: HEALTH_STATUS[k].color }} />
            <span className="text-zinc-700 dark:text-zinc-300">{HEALTH_STATUS[k].label}</span>
          </li>
        ))}
      </ul>
      <details>
        <summary className="cursor-pointer text-xs text-zinc-500 underline underline-offset-2">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-zinc-500">
              <th className="py-1 font-medium">Year</th>
              {ORDER.map((k) => (
                <th key={k} className="py-1 text-right font-medium">
                  {HEALTH_STATUS[k].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.year} className="border-t border-zinc-100 dark:border-zinc-900">
                <td className="py-1">{d.year}</td>
                {ORDER.map((k) => (
                  <td key={k} className="py-1 text-right tabular-nums">
                    {d.counts[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
