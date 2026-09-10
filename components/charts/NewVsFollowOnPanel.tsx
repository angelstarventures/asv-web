import { formatCurrencyCompact } from "@/components/StatTile";
import { CATEGORY_COLORS } from "./categoryColors";
import type { NewVsFollowOnYearEntry } from "@/lib/reportsData";

const NEW_COLOR = CATEGORY_COLORS[0];
const FOLLOW_ON_COLOR = CATEGORY_COLORS[1];
const BAR_MAX_HEIGHT = 220;
const BAR_WIDTH = 40;
// A segment needs to be at least this tall for its amount label to fit without spilling out.
const MIN_HEIGHT_FOR_LABEL = 20;

// Bar-only (no pie toggle — a by-year, two-series breakdown reads better as a stacked bar than
// as a single lifetime-aggregate pie). Same 2 categorical colors as before ("color follows the
// entity, never its rank").
export function NewVsFollowOnPanel({ data }: { data: NewVsFollowOnYearEntry[] }) {
  const formatAmount = formatCurrencyCompact;

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No data yet.</p>;
  }

  const maxYearTotal = Math.max(...data.map((d) => d.newAmount + d.followOnAmount), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6 overflow-x-auto pb-1">
        {data.map((d) => {
          const yearTotal = d.newAmount + d.followOnAmount;
          const followOnHeight = (d.followOnAmount / maxYearTotal) * BAR_MAX_HEIGHT;
          const newHeight = (d.newAmount / maxYearTotal) * BAR_MAX_HEIGHT;
          return (
            <div key={d.year} className="flex flex-col items-center gap-1">
              <div
                className="flex flex-col-reverse overflow-hidden rounded-sm"
                style={{ height: BAR_MAX_HEIGHT, width: BAR_WIDTH }}
                role="img"
                aria-label={`${d.year}: new ${formatAmount(d.newAmount)}, follow-on ${formatAmount(d.followOnAmount)}`}
              >
                {yearTotal === 0 ? (
                  <div className="h-full w-full bg-zinc-100 dark:bg-zinc-900" />
                ) : (
                  <>
                    {d.followOnAmount > 0 && (
                      <div
                        className="flex items-center justify-center"
                        style={{ height: `${followOnHeight}px`, backgroundColor: FOLLOW_ON_COLOR }}
                      >
                        {followOnHeight >= MIN_HEIGHT_FOR_LABEL && (
                          <span className="text-xs font-medium text-white">{formatAmount(d.followOnAmount)}</span>
                        )}
                      </div>
                    )}
                    {d.newAmount > 0 && (
                      <div
                        className="flex items-center justify-center"
                        style={{ height: `${newHeight}px`, backgroundColor: NEW_COLOR }}
                      >
                        {newHeight >= MIN_HEIGHT_FOR_LABEL && (
                          <span className="text-xs font-medium text-white">{formatAmount(d.newAmount)}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <span className="text-xs tabular-nums text-zinc-500">{d.year}</span>
            </div>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-4 text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: NEW_COLOR }} />
          <span className="text-zinc-700 dark:text-zinc-300">New</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: FOLLOW_ON_COLOR }} />
          <span className="text-zinc-700 dark:text-zinc-300">Follow-on</span>
        </li>
      </ul>

      <details>
        <summary className="cursor-pointer text-xs text-zinc-500 underline underline-offset-2">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-zinc-500">
              <th className="py-1 font-medium">Year</th>
              <th className="py-1 text-right font-medium">New</th>
              <th className="py-1 text-right font-medium">Follow-on</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.year} className="border-t border-zinc-100 dark:border-zinc-900">
                <td className="py-1">{d.year}</td>
                <td className="py-1 text-right tabular-nums">{formatAmount(d.newAmount)}</td>
                <td className="py-1 text-right tabular-nums">{formatAmount(d.followOnAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
