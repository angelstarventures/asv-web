import type { EventTypeFieldDef } from "@/lib/eventTypes/schema";

const SCENARIOS = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"] as const;
type Scenario = (typeof SCENARIOS)[number];

const SCENARIO_LABELS: Record<Scenario, string> = {
  OPTIMISTIC: "Optimistic",
  BALANCED: "Balanced",
  CONSERVATIVE: "Conservative",
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: EventTypeFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <textarea
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={inputClass}
        />
      );
    case "number":
      return (
        <input
          type="number"
          required={field.required}
          value={value === undefined || value === null ? "" : (value as number)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={inputClass}
        />
      );
    case "date":
      return (
        <input
          type="date"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
        />
      );
    case "string[]":
      return (
        <textarea
          required={field.required}
          value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          rows={3}
          placeholder="One per line"
          className={inputClass}
        />
      );
    case "enum":
      return (
        <select
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select...
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "string":
    default:
      return (
        <input
          type="text"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
  }
}

// The FR-10a renderer shared by every built-in and admin-defined event type (plan §4) — a
// dumb field-group, not a self-contained <form>. Each page owns its own <form>/submit and
// just reads back `shared`/`perScenario` at submit time, so pages can mix these fields with
// their own (company picker, allocations table, etc.) inside one real form element.
export function DynamicEntryForm({
  fields,
  shared,
  onSharedChange,
  perScenario,
  onPerScenarioChange,
}: {
  fields: EventTypeFieldDef[];
  shared: Record<string, unknown>;
  onSharedChange: (key: string, value: unknown) => void;
  perScenario: Record<Scenario, Record<string, unknown>>;
  onPerScenarioChange: (scenario: Scenario, key: string, value: unknown) => void;
}) {
  const sharedFields = fields.filter((f) => !f.variesByScenario);
  const varyingFields = fields.filter((f) => f.variesByScenario);

  return (
    <div className="flex flex-col gap-4">
      {sharedFields.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-sm">
          {field.label}
          <FieldInput field={field} value={shared[field.key]} onChange={(v) => onSharedChange(field.key, v)} />
        </label>
      ))}

      {varyingFields.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <div key={scenario} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{SCENARIO_LABELS[scenario]}</h3>
              {varyingFields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm">
                  {field.label}
                  <FieldInput
                    field={field}
                    value={perScenario[scenario]?.[field.key]}
                    onChange={(v) => onPerScenarioChange(scenario, field.key, v)}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
