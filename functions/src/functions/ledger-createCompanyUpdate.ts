import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRollups } from "../lib/rollups";
import {
  insertLedgerEntry,
  insertCompanyUpdateDetail,
  insertValuationAssessmentDetail,
  insertMemberValuations,
} from "../lib/ledgerWriteBuilders";
import type { ScenarioEnum } from "../lib/enumMap";

// Health/trajectory/highlights are identical across scenarios (a CompanyUpdate describes the
// company, not a scenario-specific projection); the optional Internal_ValuationAssessment
// sub-form is the one part that can diverge per scenario (plan §4).

export interface CreateCompanyUpdateInput {
  companyId: string;
  eventDate: string;
  health: "GREEN" | "YELLOW" | "RED";
  trajectory: "IMPROVING" | "STABLE" | "DECLINING";
  highlights: string[];
  lowlights: string[];
  upcomingPlans: string[];
  sourceDocument?: string;
  valuationAssessment?: Record<
    "OPTIMISTIC" | "BALANCED" | "CONSERVATIVE",
    {
      drivingEventDate: string;
      asvTotalFairMarketValue: number;
      impliedEnterpriseValue?: number;
      assessmentRationale?: string;
      memberValuations?: Record<string, number>;
    }
  >;
}

const SCENARIOS: ScenarioEnum[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

export const ledgerCreateCompanyUpdate = onCall<CreateCompanyUpdateInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyId || !input.eventDate || !input.health || !input.trajectory) {
      throw new HttpsError("invalid-argument", "companyId, eventDate, health, and trajectory are required.");
    }

    await withTransaction(async (client) => {
      for (const scenario of SCENARIOS) {
        const ledgerEntryId = await insertLedgerEntry(client, {
          companyId: input.companyId,
          scenario,
          type: "COMPANY_UPDATE",
          eventDate: input.eventDate,
          sourceDocument: input.sourceDocument,
          createdBy: caller.memberId,
        });

        await insertCompanyUpdateDetail(client, ledgerEntryId, {
          health: input.health,
          trajectory: input.trajectory,
          highlights: input.highlights ?? [],
          lowlights: input.lowlights ?? [],
          upcomingPlans: input.upcomingPlans ?? [],
        });

        const assessment = input.valuationAssessment?.[scenario];
        if (assessment) {
          const assessmentEntryId = await insertLedgerEntry(client, {
            companyId: input.companyId,
            scenario,
            type: "INTERNAL_VALUATION_ASSESSMENT",
            eventDate: input.eventDate,
            createdBy: caller.memberId,
          });
          await insertValuationAssessmentDetail(client, assessmentEntryId, assessment);
          if (assessment.memberValuations && Object.keys(assessment.memberValuations).length > 0) {
            await insertMemberValuations(client, assessmentEntryId, assessment.memberValuations);
          }
        }
      }

      await client.query(
        `UPDATE "Company" SET "currentHealth" = $1, "currentTrajectory" = $2 WHERE id = $3`,
        [input.health, input.trajectory, input.companyId]
      );
    });

    await recomputeRollups(input.companyId);
    return { ok: true };
  }
);
