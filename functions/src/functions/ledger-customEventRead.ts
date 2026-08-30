import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireCaller } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { hasHeldAllocation } from "../lib/accessMatrix";

// Raw `pg` read counterpart to ledger-customEventWrite — filters into the jsonb `data`
// column, which the generated Data Connect SDK cannot do (the jsonb spike, plan §2).

export interface CustomEventReadInput {
  companyId: string;
  scenario: "OPTIMISTIC" | "BALANCED" | "CONSERVATIVE";
  eventTypeKey?: string;
}

interface CustomEventRow {
  ledgerEntryId: string;
  eventDate: string;
  eventTypeKey: string;
  data: Record<string, unknown>;
}

export const ledgerCustomEventRead = onCall<CustomEventReadInput, Promise<{ entries: CustomEventRow[] }>>(
  async (request) => {
    const caller = await requireCaller(request);
    const { companyId, scenario, eventTypeKey } = request.data;
    if (!companyId || !scenario) {
      throw new HttpsError("invalid-argument", "companyId and scenario are required.");
    }

    if (caller.role !== "admin") {
      const held = await hasHeldAllocation(caller.memberId, companyId);
      if (!held) {
        throw new HttpsError("permission-denied", "Member never held an allocation in this company.");
      }
    }

    const rows = await query<CustomEventRow>(
      `SELECT
         ced."ledger_entry_id" AS "ledgerEntryId",
         le."event_date" AS "eventDate",
         etd.key AS "eventTypeKey",
         ced.data AS data
       FROM "custom_event_detail" ced
       JOIN "ledger_entry" le ON le.id = ced."ledger_entry_id"
       JOIN "event_type_definition" etd ON etd.id = ced."event_type_definition_id"
       WHERE le."company_id" = $1 AND le.scenario = $2
         AND ($3::text IS NULL OR etd.key = $3)
       ORDER BY le."event_date" DESC`,
      [companyId, scenario, eventTypeKey ?? null]
    );

    return { entries: rows };
  }
);
