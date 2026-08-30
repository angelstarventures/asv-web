import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";

// Raw `pg` read, bypassing the generated Data Connect SDK entirely — unlike the jsonb spike's
// other cases, this isn't about filtering into jsonb, it's that Data Connect's GraphQL layer
// cannot coerce a jsonb column holding a JSON *array* (field_schema is an array of field defs)
// into the schema's `String` type at all, even for a plain by-id read (confirmed against the
// live emulator/service: "is invalid String: unexpected value: [...] with type: []interface
// {}"). `pg` auto-parses jsonb columns into real JS values, so this sidesteps the coercion
// entirely. Backs the entry/[eventType] page's client-side fetch for custom types (plan §4).

interface EventTypeFieldDef {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "enum" | "boolean" | "string[]";
  required: boolean;
  variesByScenario: boolean;
  options?: string[];
}

export interface EventTypesGetByKeyInput {
  key: string;
}

export interface EventTypesGetByKeyOutput {
  key: string;
  label: string;
  description: string | null;
  fields: EventTypeFieldDef[];
}

export const eventTypesGetByKey = onCall<EventTypesGetByKeyInput, Promise<EventTypesGetByKeyOutput>>(
  async (request) => {
    await requireAdmin(request);
    const { key } = request.data;
    if (!key) {
      throw new HttpsError("invalid-argument", "key is required.");
    }

    const rows = await query<EventTypesGetByKeyOutput>(
      `SELECT key, label, description, "field_schema" AS fields FROM "event_type_definition" WHERE key = $1`,
      [key]
    );
    if (rows.length === 0) {
      throw new HttpsError("not-found", `Unknown event type "${key}".`);
    }
    return rows[0];
  }
);
