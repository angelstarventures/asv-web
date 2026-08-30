import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRollups } from "../lib/rollups";
import { insertLedgerEntry, insertExitEventDetail } from "../lib/ledgerWriteBuilders";
import type { ScenarioEnum } from "../lib/enumMap";

// Same one-transaction-3-identical-rows pattern as compliance flags — an exit (acquisition,
// IPO, merger, shutdown, dissolution) is a fact about the company that already happened, not
// something that legitimately differs by optimistic/balanced/conservative framing (plan §3).

export interface CreateExitEventInput {
  companyId: string;
  eventDate: string;
  exitType: "ACQUISITION" | "IPO" | "MERGER" | "SHUTDOWN" | "DISSOLUTION";
  totalExitValue: number;
  asvTotalPayout: number;
  docLink: string;
  sourceDocument?: string;
}

const SCENARIOS: ScenarioEnum[] = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

export const ledgerCreateExitEvent = onCall<CreateExitEventInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);
  const input = request.data;

  if (!input.companyId || !input.eventDate || !input.exitType || !input.docLink) {
    throw new HttpsError("invalid-argument", "companyId, eventDate, exitType, and docLink are required.");
  }
  if (input.totalExitValue == null || input.asvTotalPayout == null) {
    throw new HttpsError("invalid-argument", "totalExitValue and asvTotalPayout are required.");
  }

  await withTransaction(async (client) => {
    for (const scenario of SCENARIOS) {
      const ledgerEntryId = await insertLedgerEntry(client, {
        companyId: input.companyId,
        scenario,
        type: "EXIT_EVENT",
        eventDate: input.eventDate,
        sourceDocument: input.sourceDocument,
        createdBy: caller.memberId,
      });

      await insertExitEventDetail(client, ledgerEntryId, {
        exitType: input.exitType,
        totalExitValue: input.totalExitValue,
        asvTotalPayout: input.asvTotalPayout,
        docLink: input.docLink,
      });
    }
  });

  await recomputeRollups(input.companyId);
  return { ok: true };
});
