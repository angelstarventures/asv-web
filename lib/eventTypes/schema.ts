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
