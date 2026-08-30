import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// FR-10a: validates and stores a new EventTypeDefinition — no code deploy needed for it to
// become usable at /admin/ledger/entry/<newTypeId> (plan §3/§4).

// Mirrors lib/eventTypes/schema.ts's EventTypeFieldDef in the Next.js app — duplicated here
// (rather than imported) because functions/ is a separate deploy bundle from the app root and
// can't reach outside its own directory (firebase.json's functions.source is "functions").
// Keep the two definitions in sync by hand if the shape changes.
interface EventTypeFieldDef {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "enum" | "boolean" | "string[]";
  required: boolean;
  variesByScenario: boolean;
  options?: string[];
}

export interface DefineEventTypeInput {
  key: string; // uppercase snake_case, must not collide with a built-in LedgerEntryType
  label: string;
  description?: string;
  fields: EventTypeFieldDef[];
}

const RESERVED_KEYS = new Set([
  "PARTICIPATING_PRICED_ROUND",
  "PARTICIPATING_SAFE_ROUND",
  "NON_PARTICIPATING_ROUND",
  "EXIT_EVENT",
  "TRANSACTION_VALUATION_CHANGE",
  "INTERNAL_VALUATION_ASSESSMENT",
  "COMPLIANCE_FLAG_CHANGE",
  "COMPANY_UPDATE",
]);

function validateFieldDefs(fields: EventTypeFieldDef[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Set<string>();
  for (const field of fields) {
    if (!field.key || !field.label || !field.type) {
      errors.push(`Field is missing key/label/type: ${JSON.stringify(field)}`);
      continue;
    }
    if (seenKeys.has(field.key)) {
      errors.push(`Duplicate field key "${field.key}"`);
    }
    seenKeys.add(field.key);
    if (field.type === "enum" && (!field.options || field.options.length === 0)) {
      errors.push(`Field "${field.key}" is type enum but has no options`);
    }
  }
  return errors;
}

export const eventTypesDefine = onCall<DefineEventTypeInput, Promise<{ key: string }>>(async (request) => {
  const caller = await requireAdmin(request);
  const input = request.data;

  if (!input.key || !input.label || !Array.isArray(input.fields) || input.fields.length === 0) {
    throw new HttpsError("invalid-argument", "key, label, and at least one field are required.");
  }
  if (RESERVED_KEYS.has(input.key.toUpperCase())) {
    throw new HttpsError("invalid-argument", `"${input.key}" collides with a built-in event type.`);
  }

  const fieldErrors = validateFieldDefs(input.fields);
  if (fieldErrors.length > 0) {
    throw new HttpsError("invalid-argument", fieldErrors.join("; "));
  }

  await withTransaction(async (client) => {
    // created_at has no real Postgres-level default — see the note in ledgerWriteBuilders.ts.
    await client.query(
      `INSERT INTO "event_type_definition" (key, label, description, "is_builtin", "field_schema", "created_by_id", "created_at")
       VALUES ($1, $2, $3, false, $4::jsonb, $5, now())`,
      [input.key, input.label, input.description ?? null, JSON.stringify(input.fields), caller.memberId]
    );
  });

  return { key: input.key };
});
