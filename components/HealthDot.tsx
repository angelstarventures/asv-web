import { CompanyHealth } from "@/lib/dataconnect/generated";
import { HEALTH_STATUS } from "@/lib/health";

// Color still pairs with a label (title/aria-label), per the dataviz skill's "never color
// alone" rule — a hover tooltip and screen-reader text, even though the visible mark is a
// plain dot.
export function HealthDot({ health }: { health: CompanyHealth | undefined }) {
  if (!health) {
    return (
      <span className="text-zinc-400 dark:text-zinc-600" aria-label="No health data">
        —
      </span>
    );
  }
  const { color, label } = HEALTH_STATUS[health];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-block h-3 w-3 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
