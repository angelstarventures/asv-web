import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRollups } from "../lib/rollups";
import { insertLedgerEntry, insertMemberValuations, insertValuationAssessmentDetail } from "../lib/ledgerWriteBuilders";
import type { ScenarioEnum } from "../lib/enumMap";

// Unlike investment rounds, valuation entries CAN diverge per scenario — each scenario gets
// its own input values rather than one shared payload replicated 3x (plan §3).

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
  perScenario: Record<"OPTIMISTIC" | "BALANCED" | "CONSERVATIVE", PerScenarioValuationInput>;
}

const SCENARIOS: ScenarioEnum[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

export const ledgerCreateValuationEvent = onCall<CreateValuationEventInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyId || !input.eventDate || !input.entryType) {
      throw new HttpsError("invalid-argument", "companyId, eventDate, and entryType are required.");
    }
    for (const scenario of SCENARIOS) {
      if (!input.perScenario?.[scenario]) {
        throw new HttpsError("invalid-argument", `Missing valuation input for scenario ${scenario}.`);
      }
    }

    await withTransaction(async (client) => {
      for (const scenario of SCENARIOS) {
        const scenarioInput = input.perScenario[scenario];
        const ledgerEntryId = await insertLedgerEntry(client, {
          companyId: input.companyId,
          scenario,
          type: input.entryType,
          eventDate: input.eventDate,
          sourceDocument: input.sourceDocument,
          createdBy: caller.memberId,
        });

        await insertValuationAssessmentDetail(client, ledgerEntryId, {
          drivingEventDate: scenarioInput.drivingEventDate,
          asvTotalFairMarketValue: scenarioInput.asvTotalFairMarketValue,
          impliedEnterpriseValue: scenarioInput.impliedEnterpriseValue,
          assessmentRationale: scenarioInput.assessmentRationale,
        });

        if (scenarioInput.memberValuations && Object.keys(scenarioInput.memberValuations).length > 0) {
          await insertMemberValuations(client, ledgerEntryId, scenarioInput.memberValuations);
        }
      }
    });

    await recomputeRollups(input.companyId);
    return { ok: true };
  }
);
