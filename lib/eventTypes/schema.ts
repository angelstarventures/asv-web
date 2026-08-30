import { z } from "zod";

export type FieldType = "string" | "text" | "number" | "date" | "enum" | "boolean" | "string[]";

export interface EventTypeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  // false (the default) means the field is written identically across all 3 scenario rows;
  // true means the entry form collects a separate value per scenario (plan §4).
  variesByScenario: boolean;
  options?: string[]; // required when type === "enum"
}

export interface EventTypeDef {
  key: string;
  label: string;
  description?: string;
  isBuiltin: boolean;
  fields: EventTypeFieldDef[];
}

function zodForField(field: EventTypeFieldDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (field.type) {
    case "string":
    case "text":
      base = z.string();
      break;
    case "number":
      base = z.number();
      break;
    case "date":
      base = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
      break;
    case "boolean":
      base = z.boolean();
      break;
    case "string[]":
      base = z.array(z.string());
      break;
    case "enum":
      base = z.enum((field.options ?? []) as [string, ...string[]]);
      break;
  }
  return field.required ? base : base.optional();
}

// Drives both DynamicEntryForm's client-side validation and the server-side re-validation
// in ledger-customEventWrite — same field definitions, same generated schema, on both sides.
export function buildZodSchema(fields: EventTypeFieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = zodForField(field);
  }
  return z.object(shape);
}

const SCENARIOS = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"] as const;

// Validates DynamicEntryForm's `shared` bucket (every variesByScenario: false field) before
// submit — a fast client-side check ahead of the Cloud Function's own re-validation, not a
// replacement for it.
export function validateSharedValues(fields: EventTypeFieldDef[], shared: Record<string, unknown>): string[] {
  const sharedFields = fields.filter((f) => !f.variesByScenario);
  if (sharedFields.length === 0) return [];
  const result = buildZodSchema(sharedFields).safeParse(shared);
  if (result.success) return [];
  return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

// Same, for the three variesByScenario: true buckets.
export function validatePerScenarioValues(
  fields: EventTypeFieldDef[],
  perScenario: Record<(typeof SCENARIOS)[number], Record<string, unknown>>
): string[] {
  const varyingFields = fields.filter((f) => f.variesByScenario);
  if (varyingFields.length === 0) return [];
  const schema = buildZodSchema(varyingFields);
  const errors: string[] = [];
  for (const scenario of SCENARIOS) {
    const result = schema.safeParse(perScenario[scenario] ?? {});
    if (!result.success) {
      errors.push(...result.error.issues.map((issue) => `[${scenario}] ${issue.path.join(".")}: ${issue.message}`));
    }
  }
  return errors;
}
