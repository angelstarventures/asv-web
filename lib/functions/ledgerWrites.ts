import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors each functions/src/functions/ledger-create*.ts input shape exactly — duplicated
// rather than imported for the same reason as lib/functions/adminMembers.ts: the web app
// never reaches into the Cloud Functions project's internals; this boundary IS the contract.

export type Scenario = "OPTIMISTIC" | "BALANCED" | "CONSERVATIVE";

export interface CreateInvestmentRoundInput {
  companyName: string;
  sector?: string;
  eventDate: string;
  roundKind: "PARTICIPATING_PRICED_ROUND" | "PARTICIPATING_SAFE_ROUND" | "NON_PARTICIPATING_ROUND";
  sourceDocument?: string;
  allocations: Record<string, number>;
  detail: {
    companyUrl?: string;
    docLink?: string;
    asvTotal?: number;
    roundName?: string;
    pricePerShare?: number;
    postMoneyValuation?: number;
    postMoneyValCap?: number;
    discount?: number;
    newPricePerShare?: number;
    newPostMoneyValuation?: number;
    notes?: string;
  };
}
export async function ledgerCreateInvestmentRound(
  input: CreateInvestmentRoundInput
): Promise<{ companyId: string }> {
  const call = httpsCallable<CreateInvestmentRoundInput, { companyId: string }>(
    functions,
    "ledgerCreateInvestmentRound"
  );
  return (await call(input)).data;
}

export interface PerScenarioValuationInput {
  drivingEventDate: string;
  asvTotalFairMarketValue: number;
  impliedEnterpriseValue?: number;
  assessmentRationale?: string;
  memberValuations?: Record<string, number>;
}
export interface CreateValuationEventInput {
  companyId: string;
  eventDate: string;
  entryType: "TRANSACTION_VALUATION_CHANGE" | "INTERNAL_VALUATION_ASSESSMENT";
  sourceDocument?: string;
  perScenario: Record<Scenario, PerScenarioValuationInput>;
}
export async function ledgerCreateValuationEvent(input: CreateValuationEventInput): Promise<{ ok: true }> {
  const call = httpsCallable<CreateValuationEventInput, { ok: true }>(functions, "ledgerCreateValuationEvent");
  return (await call(input)).data;
}

const SCENARIOS: Scenario[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

// Shared by EntryForm and CompanyUpdateForm: drivingEventDate is collected once (shared
// bucket) and replicated into every scenario's slot, since DynamicEntryForm only tracks the
// fields flagged variesByScenario in its `perScenario` state.
export function buildPerScenarioValuationInput(
  drivingEventDate: string,
  perScenario: Record<Scenario, Record<string, unknown>>
): Record<Scenario, PerScenarioValuationInput> {
  return SCENARIOS.reduce(
    (acc, scenario) => {
      acc[scenario] = {
        drivingEventDate,
        asvTotalFairMarketValue: perScenario[scenario]?.asvTotalFairMarketValue as number,
        impliedEnterpriseValue: perScenario[scenario]?.impliedEnterpriseValue as number | undefined,
        assessmentRationale: perScenario[scenario]?.assessmentRationale as string | undefined,
      };
      return acc;
    },
    {} as Record<Scenario, PerScenarioValuationInput>
  );
}

export interface CreateComplianceFlagInput {
  companyId: string;
  eventDate: string;
  flaggedDate: string;
  reason: string;
  auditType: "MANUAL_OVERRIDE" | "SCHEDULED_SHARIAH_REVIEW" | "STRATEGIC_PIVOT_AUDIT";
  complianceOfficerNotes: string;
  sourceDocument?: string;
}
export async function ledgerCreateComplianceFlag(input: CreateComplianceFlagInput): Promise<{ ok: true }> {
  const call = httpsCallable<CreateComplianceFlagInput, { ok: true }>(functions, "ledgerCreateComplianceFlag");
  return (await call(input)).data;
}

export interface CreateExitEventInput {
  companyId: string;
  eventDate: string;
  exitType: "ACQUISITION" | "IPO" | "MERGER" | "SHUTDOWN" | "DISSOLUTION";
  totalExitValue: number;
  asvTotalPayout: number;
  docLink: string;
  sourceDocument?: string;
}
export async function ledgerCreateExitEvent(input: CreateExitEventInput): Promise<{ ok: true }> {
  const call = httpsCallable<CreateExitEventInput, { ok: true }>(functions, "ledgerCreateExitEvent");
  return (await call(input)).data;
}

export interface CreateCompanyUpdateInput {
  companyId: string;
  eventDate: string;
  health: "GREEN" | "YELLOW" | "RED";
  trajectory: "IMPROVING" | "STABLE" | "DECLINING";
  highlights: string[];
  lowlights: string[];
  upcomingPlans: string[];
  sourceDocument?: string;
  valuationAssessment?: Record<Scenario, PerScenarioValuationInput>;
}
export async function ledgerCreateCompanyUpdate(input: CreateCompanyUpdateInput): Promise<{ ok: true }> {
  const call = httpsCallable<CreateCompanyUpdateInput, { ok: true }>(functions, "ledgerCreateCompanyUpdate");
  return (await call(input)).data;
}

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
