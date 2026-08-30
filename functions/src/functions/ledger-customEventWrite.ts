import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { insertLedgerEntry } from "../lib/ledgerWriteBuilders";
import type { ScenarioEnum } from "../lib/enumMap";
import type { PoolClient } from "pg";

// Validates submitted data against the stored fieldSchema, replicates fields flagged
// variesByScenario: false identically across scenario rows, honors per-scenario values for
// the rest (plan §3). Bypasses the generated Data Connect SDK entirely — see the jsonb spike,
// plan §2 — writing straight to the jsonb `data` column via raw `pg`.

interface EventTypeFieldDef {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "enum" | "boolean" | "string[]";
  required: boolean;
  variesByScenario: boolean;
  options?: string[];
}

const SCENARIOS: ScenarioEnum[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

function validateAgainstFieldDef(field: EventTypeFieldDef, value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return field.required ? `"${field.key}" is required` : null;
  }
  switch (field.type) {
    case "number":
      return typeof value === "number" ? null : `"${field.key}" must be a number`;
    case "boolean":
      return typeof value === "boolean" ? null : `"${field.key}" must be a boolean`;
    case "string[]":
      return Array.isArray(value) ? null : `"${field.key}" must be an array of strings`;
    case "enum":
      return field.options?.includes(value as string) ? null : `"${field.key}" must be one of ${field.options?.join(", ")}`;
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : `"${field.key}" must be YYYY-MM-DD`;
    default:
      return typeof value === "string" ? null : `"${field.key}" must be a string`;
  }
}

export interface CustomEventWriteInput {
  eventTypeKey: string;
  companyId: string;
  eventDate: string;
  sourceDocument?: string;
  // shared[key] for variesByScenario:false fields; perScenario[scenario][key] for the rest.
  shared: Record<string, unknown>;
  perScenario: Record<"OPTIMISTIC" | "BALANCED" | "CONSERVATIVE", Record<string, unknown>>;
}

export const ledgerCustomEventWrite = onCall<CustomEventWriteInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);
  const input = request.data;

  if (!input.eventTypeKey || !input.companyId || !input.eventDate) {
    throw new HttpsError("invalid-argument", "eventTypeKey, companyId, and eventDate are required.");
  }

  const eventTypes = await query<{ id: string; fieldSchema: EventTypeFieldDef[] }>(
    `SELECT id, "field_schema" AS "fieldSchema" FROM "event_type_definition" WHERE key = $1`,
    [input.eventTypeKey]
  );
  if (eventTypes.length === 0) {
    throw new HttpsError("not-found", `Unknown event type "${input.eventTypeKey}".`);
  }
  const eventType = eventTypes[0];
  const fields: EventTypeFieldDef[] = eventType.fieldSchema;

  const errors: string[] = [];
  for (const field of fields) {
    if (!field.variesByScenario) {
      const err = validateAgainstFieldDef(field, input.shared?.[field.key]);
      if (err) errors.push(err);
    } else {
      for (const scenario of SCENARIOS) {
        const err = validateAgainstFieldDef(field, input.perScenario?.[scenario]?.[field.key]);
        if (err) errors.push(`[${scenario}] ${err}`);
      }
    }
  }
  if (errors.length > 0) {
    throw new HttpsError("invalid-argument", errors.join("; "));
  }

  await withTransaction(async (client: PoolClient) => {
    for (const scenario of SCENARIOS) {
      const ledgerEntryId = await insertLedgerEntry(client, {
        companyId: input.companyId,
        scenario,
        type: "CUSTOM",
        eventDate: input.eventDate,
        sourceDocument: input.sourceDocument,
        createdBy: caller.memberId,
      });

      const data: Record<string, unknown> = { ...input.shared, ...input.perScenario?.[scenario] };

      await client.query(
        `INSERT INTO "custom_event_detail" ("ledger_entry_id", "event_type_definition_id", data)
         VALUES ($1, $2, $3::jsonb)`,
        [ledgerEntryId, eventType.id, JSON.stringify(data)]
      );
    }
  });

  return { ok: true };
});
