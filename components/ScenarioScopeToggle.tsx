"use client";

import { useScenario } from "@/lib/scenarios";
import { SCENARIOS, SCOPES } from "@/lib/scenarioTypes";

const SCENARIO_LABELS: Record<(typeof SCENARIOS)[number], string> = {
  optimistic: "Optimistic",
  balanced: "Balanced",
  conservative: "Conservative",
};

const SCOPE_LABELS: Record<(typeof SCOPES)[number], string> = {
  mine: "My holdings",
  asv: "All of ASV",
};

function ToggleGroup<T extends string>({
  options,
  labels,
  active,
  onSelect,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          aria-pressed={active === opt}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === opt
              ? "bg-foreground text-background"
              : "text-zinc-600 hover:text-foreground dark:text-zinc-400"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

// URL-driven per lib/scenarios.ts — the toggle state lives in ?scope=&scenario=, so this
// page is shareable/bookmarkable/back-button-safe without a client store (plan §4).
export function ScenarioScopeToggle() {
  const { scenario, scope, setScenario, setScope } = useScenario();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup options={SCOPES} labels={SCOPE_LABELS} active={scope} onSelect={setScope} />
      <ToggleGroup options={SCENARIOS} labels={SCENARIO_LABELS} active={scenario} onSelect={setScenario} />
    </div>
  );
}
