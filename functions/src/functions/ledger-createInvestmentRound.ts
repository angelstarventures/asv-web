import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { recomputeRollups } from "../lib/rollups";
import {
  insertLedgerEntry,
  insertAllocations,
  insertPricedRoundDetail,
  insertSafeRoundDetail,
  insertNonParticipatingRoundDetail,
  findOrCreateCompanyId,
} from "../lib/ledgerWriteBuilders";
import type { LedgerEntryTypeEnum } from "../lib/enumMap";

// One pg transaction inserting 3 LedgerEntry rows (one per scenario) with IDENTICAL detail
// and allocation rows, per FR-11: investment amounts don't vary by scenario (plan §3).

type RoundKind = "PARTICIPATING_PRICED_ROUND" | "PARTICIPATING_SAFE_ROUND" | "NON_PARTICIPATING_ROUND";

export interface CreateInvestmentRoundInput {
  companyName: string;
  sector?: string;
  eventDate: string;
  roundKind: RoundKind;
  sourceDocument?: string;
  allocations: Record<string, number>; // memberId -> amount, empty for NonParticipating_Round
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

const SCENARIOS = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"] as const;

export const ledgerCreateInvestmentRound = onCall<CreateInvestmentRoundInput, Promise<{ companyId: string }>>(
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyName || !input.eventDate || !input.roundKind) {
      throw new HttpsError("invalid-argument", "companyName, eventDate, and roundKind are required.");
    }

    const companyId = await withTransaction(async (client) => {
      const resolvedCompanyId = await findOrCreateCompanyId(client, input.companyName, input.sector);

      for (const scenario of SCENARIOS) {
        const ledgerEntryId = await insertLedgerEntry(client, {
          companyId: resolvedCompanyId,
          scenario,
          type: input.roundKind as LedgerEntryTypeEnum,
          eventDate: input.eventDate,
          sourceDocument: input.sourceDocument,
          createdBy: caller.memberId,
        });

        switch (input.roundKind) {
          case "PARTICIPATING_PRICED_ROUND":
            await insertPricedRoundDetail(client, ledgerEntryId, {
              companyUrl: input.detail.companyUrl,
              docLink: input.detail.docLink,
              asvTotal: input.detail.asvTotal!,
              roundName: input.detail.roundName!,
              pricePerShare: input.detail.pricePerShare!,
              postMoneyValuation: input.detail.postMoneyValuation!,
            });
            break;
          case "PARTICIPATING_SAFE_ROUND":
            await insertSafeRoundDetail(client, ledgerEntryId, {
              companyUrl: input.detail.companyUrl,
              docLink: input.detail.docLink,
              asvTotal: input.detail.asvTotal!,
              postMoneyValCap: input.detail.postMoneyValCap!,
              discount: input.detail.discount!,
              notes: input.detail.notes,
            });
            break;
          case "NON_PARTICIPATING_ROUND":
            await insertNonParticipatingRoundDetail(client, ledgerEntryId, {
              roundName: input.detail.roundName!,
              newPricePerShare: input.detail.newPricePerShare!,
              newPostMoneyValuation: input.detail.newPostMoneyValuation!,
              docLink: input.detail.docLink!,
              notes: input.detail.notes,
            });
            break;
        }

        if (input.allocations && Object.keys(input.allocations).length > 0) {
          await insertAllocations(client, ledgerEntryId, input.allocations);
        }
      }

      return resolvedCompanyId;
    });

    // Outside the write transaction, per plan §3 — rollup recompute is a read-derived cache,
    // not part of the ledger write's atomicity guarantee.
    await recomputeRollups(companyId);

    return { companyId };
  }
);
