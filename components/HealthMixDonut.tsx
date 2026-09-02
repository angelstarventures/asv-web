import { CompanyHealth } from "@/lib/dataconnect/generated";
import { HEALTH_STATUS as STATUS } from "@/lib/health";

const ORDER: CompanyHealth[] = [CompanyHealth.GREEN, CompanyHealth.YELLOW, CompanyHealth.RED];

const SIZE = 160;
const RADIUS = 62;
const STROKE = 22;
const GAP_DEG = 4; // surface-color gap between segments, in degrees of arc

function polarPoint(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: SIZE / 2 + RADIUS * Math.cos(rad), y: SIZE / 2 + RADIUS * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polarPoint(startDeg);
  const end = polarPoint(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Part-to-whole across a fixed, small (3-value) status field — status colors carry the
// segments (never color alone: every slice pairs with an icon-swatch + label in the legend,
// per the dataviz skill's status-palette rule), matching the PRD wireframe's health-mix donut.
export function HealthMixDonut({ counts }: { counts: Record<CompanyHealth, number> }) {
  const total = ORDER.reduce((sum, k) => sum + counts[k], 0);

  if (total === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No company health data yet.</p>;
  }

  const segments = ORDER.filter((k) => counts[k] > 0).reduce<
    { key: CompanyHealth; startDeg: number; endDeg: number; pct: number }[]
  >((acc, k) => {
    const cursor = acc.length > 0 ? acc[acc.length - 1].endDeg + GAP_DEG : 0;
    const sweep = (counts[k] / total) * 360;
    acc.push({ key: k, startDeg: cursor, endDeg: cursor + sweep - GAP_DEG, pct: Math.round((counts[k] / total) * 100) });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Company health mix">
        {segments.map((seg) => (
          <path
            key={seg.key}
            d={arcPath(seg.startDeg, seg.endDeg)}
            fill="none"
            stroke={STATUS[seg.key].color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            aria-label={`${STATUS[seg.key].label}: ${counts[seg.key]} (${seg.pct}%)`}
          />
        ))}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-current text-lg font-semibold"
        >
          {total}
        </text>
      </svg>
      <ul className="flex flex-col gap-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: STATUS[seg.key].color }}
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              {STATUS[seg.key].label} ({counts[seg.key]}, {seg.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
