import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRollups } from "../lib/rollups";
import { insertLedgerEntry, insertComplianceFlagDetail } from "../lib/ledgerWriteBuilders";
import type { ScenarioEnum } from "../lib/enumMap";

// Same one-transaction-3-identical-rows pattern as investment rounds — a compliance flag is a
// fact about the company, not something that varies by scenario (plan §3).

export interface CreateComplianceFlagInput {
  companyId: string;
  eventDate: string;
  flaggedDate: string;
  reason: string;
  auditType: "MANUAL_OVERRIDE" | "SCHEDULED_SHARIAH_REVIEW" | "STRATEGIC_PIVOT_AUDIT";
  complianceOfficerNotes: string;
  sourceDocument?: string;
}

const SCENARIOS: ScenarioEnum[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

export const ledgerCreateComplianceFlag = onCall<CreateComplianceFlagInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyId || !input.eventDate || !input.reason || !input.auditType || !input.complianceOfficerNotes) {
      throw new HttpsError("invalid-argument", "companyId, eventDate, reason, auditType, and complianceOfficerNotes are required.");
    }

    await withTransaction(async (client) => {
      for (const scenario of SCENARIOS) {
        const ledgerEntryId = await insertLedgerEntry(client, {
          companyId: input.companyId,
          scenario,
          type: "COMPLIANCE_FLAG_CHANGE",
          eventDate: input.eventDate,
          sourceDocument: input.sourceDocument,
          createdBy: caller.memberId,
        });

        await insertComplianceFlagDetail(client, ledgerEntryId, {
          flaggedDate: input.flaggedDate,
          reason: input.reason,
          auditType: input.auditType,
          complianceOfficerNotes: input.complianceOfficerNotes,
        });
      }
    });

    await recomputeRollups(input.companyId);
    return { ok: true };
  }
);
