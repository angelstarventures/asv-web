import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors each functions/src/functions/*.ts input shape exactly — duplicated rather than
// imported for the same reason as lib/functions/adminMembers.ts: the web app never reaches
// into the Cloud Functions project's internals; this boundary IS the contract.
//
// The built-in legacy-schema entry types (rounds, exit, valuation, compliance, company update)
// are recorded via the JSON flow at /admin/ledger/record (lib/functions/massIO.ts) instead of
// dedicated per-type callables — only custom event types still use this per-field write path.

export type Scenario = "OPTIMISTIC" | "BALANCED" | "CONSERVATIVE";

export interface CustomEventWriteInput {
  eventTypeKey: string;
  companyId: string;
  eventDate: string;
  sourceDocument?: string;
  shared: Record<string, unknown>;
  perScenario: Record<Scenario, Record<string, unknown>>;
}
export async function ledgerCustomEventWrite(input: CustomEventWriteInput): Promise<{ ok: true }> {
  const call = httpsCallable<CustomEventWriteInput, { ok: true }>(functions, "ledgerCustomEventWrite");
  return (await call(input)).data;
}

export interface EventTypeFieldDef {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "date" | "enum" | "boolean" | "string[]";
  required: boolean;
  variesByScenario: boolean;
  options?: string[];
}
export interface EventTypesGetByKeyOutput {
  key: string;
  label: string;
  description: string | null;
  fields: EventTypeFieldDef[];
}
// Client-side only (Client Components), never from a Server Component: bypasses the Data
// Connect read entirely because the field_schema jsonb column (a JSON array) can't be
// coerced into that schema's String type at all (see the note in dataconnect/connector/
// queries.gql) — a real Cloud Functions callable, so it needs the browser's own ID token.
export async function eventTypesGetByKey(key: string): Promise<EventTypesGetByKeyOutput> {
  const call = httpsCallable<{ key: string }, EventTypesGetByKeyOutput>(functions, "eventTypesGetByKey");
  return (await call({ key })).data;
}

export interface DefineEventTypeInput {
  key: string;
  label: string;
  description?: string;
  fields: EventTypeFieldDef[];
}
export async function eventTypesDefine(input: DefineEventTypeInput): Promise<{ key: string }> {
  const call = httpsCallable<DefineEventTypeInput, { key: string }>(functions, "eventTypesDefine");
  return (await call(input)).data;
}
