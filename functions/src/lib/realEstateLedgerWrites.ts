import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ParsedEntry } from "./realEstateSheetParse";
export async function writeRealEstateEntry(client: PoolClient, investmentId: string, createdBy: string, e: ParsedEntry, reversesEntryId: string | null = null, imported = true) {
    const id = randomUUID();
    await client.query(`INSERT INTO real_estate_ledger_entry
    (id, investment_id, type, event_date, amount_usd, amount_native, fx_rate_to_usd, currency, counterparty, description,
     funded_outside_hub, cash_direction, source_sheet_row_key, source_sheet_row_number, source_sheet_row_hash, reverses_entry_id, created_by_id, created_at, needs_review)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),$18)`, [id, investmentId, e.type, e.eventDate, e.amountUsd, e.amountNative, e.fxRateToUsd, e.currency, e.counterparty, e.description, e.fundedOutsideHub, e.cashDirection, imported ? e.rowKey : null, imported ? e.rowNumber : null, imported ? e.hash : null, reversesEntryId, createdBy, e.needsReview]);
    for (const a of e.allocations)
        await client.query(`INSERT INTO real_estate_allocation (id,ledger_entry_id,member_id,amount_usd,cash_direction) VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), id, a.memberId, a.amountUsd, a.cashDirection]);
    return id;
}
