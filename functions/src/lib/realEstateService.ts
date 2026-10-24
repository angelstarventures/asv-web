import { createHash, randomUUID } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./dataconnect-admin";
import { cents, parseTransactionSheet, type ParsedEntry, type SheetConfig } from "./realEstateSheetParse";
import { readFirstTransactionSheet } from "./sheets";
import { writeRealEstateEntry } from "./realEstateLedgerWrites";
import { memberId as memberIdSchema } from "./realEstateInputs";
export interface PropertyRow {
    id: string;
    name: string;
    kind: string;
    status: string;
    currency: string;
    default_fx_rate_to_usd: number;
    carry_percent: number;
    total_property_cost: number | null;
    transaction_sheet_id: string;
    sheet_config: SheetConfig | string | null;
}
export async function property(id: string, client?: PoolClient) {
    if (!/^[a-f\d-]{32,36}$/i.test(id ?? ""))
        throw new HttpsError("invalid-argument", "Invalid investment id.");
    const sql = "SELECT * FROM real_estate_investment WHERE id=$1";
    const rows = client ? (await client.query<PropertyRow>(sql, [id])).rows : await query<PropertyRow>(sql, [id]);
    if (!rows[0])
        throw new HttpsError("not-found", "Investment not found.");
    return rows[0];
}
export async function lockProperty(client: PoolClient, id: string) {
    await client.query("SELECT id FROM real_estate_investment WHERE id=$1 FOR UPDATE", [id]);
    return property(id, client);
}
export async function setShares(client: PoolClient, investmentId: string, memberId: string, effectiveFrom: string, shares: {
    memberId: string;
    shareUnits: number;
    committedAmount?: number | null;
}[], sourceLedgerEntryId: string | null = null) {
    if (shares.some(s => !memberIdSchema.safeParse(s.memberId).success))
        throw new HttpsError("invalid-argument", "Shares must reference existing five-digit Member IDs from the startup member roster.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || !Number.isFinite(Date.parse(effectiveFrom)) || new Date(effectiveFrom).toISOString().slice(0, 10) !== effectiveFrom)
        throw new HttpsError("invalid-argument", "Valid effective date required.");
    if (effectiveFrom > new Date().toISOString().slice(0, 10))
        throw new HttpsError("invalid-argument", "Share generations cannot take effect in the future.");
    if (!shares.length || new Set(shares.map(s => s.memberId)).size !== shares.length || shares.some(s => !Number.isFinite(s.shareUnits) || s.shareUnits < 0 || (s.committedAmount != null && (!Number.isFinite(s.committedAmount) || s.committedAmount < 0))) || !shares.some(s => s.shareUnits > 0))
        throw new HttpsError("invalid-argument", "Provide unique members and nonnegative shares with a positive total.");
    const members = (await client.query<{id:string}>("SELECT id FROM member WHERE id = ANY($1::varchar[])", [shares.map(s => s.memberId)])).rows;
    if (members.length !== shares.length)
        throw new HttpsError("invalid-argument", "Every shareholder must already exist in the shared startup Member table.");
    const existing = (await client.query<{
        id: string;
        member_id: string;
        effective_from: Date;
    }>("SELECT * FROM real_estate_member_share WHERE investment_id=$1 AND superseded_by_id IS NULL", [investmentId])).rows;
    if (existing.some(s => s.effective_from.toISOString().slice(0, 10) > effectiveFrom))
        throw new HttpsError("failed-precondition", "Share changes must follow the current generation.");
    // A generation always includes the full roster, including members who now own zero units.
    for (const s of existing)
        if (!shares.some(n => n.memberId === s.member_id))
            shares.push({ memberId: s.member_id, shareUnits: 0 });
    for (const s of shares) {
        const id = randomUUID();
        await client.query(`INSERT INTO real_estate_member_share (id,investment_id,member_id,share_units,committed_amount,effective_from,source_ledger_entry_id,created_by_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())`, [id, investmentId, s.memberId, s.shareUnits, s.committedAmount ?? null, effectiveFrom, sourceLedgerEntryId, memberId]);
        await client.query("UPDATE real_estate_member_share SET superseded_by_id=$1 WHERE investment_id=$2 AND member_id=$3 AND id<>$1 AND superseded_by_id IS NULL", [id, investmentId, s.memberId]);
    }
}
export async function sheetPreview(investmentId: string, client?: PoolClient) {
    const p = await property(investmentId, client);
    if (!p.transaction_sheet_id)
        throw new HttpsError("failed-precondition", "Set a transaction sheet first.");
    const read = async <T>(sql: string, params: unknown[] = []) => client ? (await client.query(sql, params)).rows as T[] : query<T>(sql, params);
    const [sheet, members, shares, existing] = await Promise.all([
        readFirstTransactionSheet(p.transaction_sheet_id),
        read<{
            id: string;
            displayName: string;
            investingEntityName: string;
            email: string;
        }>('SELECT id,display_name AS "displayName",investing_entity_name AS "investingEntityName",email FROM member'),
        read<{
            memberId: string;
            shareUnits: number;
            effectiveFrom: string;
        }>(`SELECT member_id AS "memberId",share_units AS "shareUnits",to_char(effective_from,'YYYY-MM-DD') AS "effectiveFrom" FROM real_estate_member_share WHERE investment_id=$1 ORDER BY effective_from,created_at`, [investmentId]),
        read<{
            id: string;
            key: string;
            hash: string;
        }>(`SELECT e.id,e.source_sheet_row_key AS key,e.source_sheet_row_hash AS hash FROM real_estate_ledger_entry e WHERE e.investment_id=$1 AND e.source_sheet_row_key IS NOT NULL AND e.reverses_entry_id IS NULL AND NOT EXISTS (SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id) ORDER BY e.source_sheet_row_key,e.id`, [investmentId])
    ]);
    const config = typeof p.sheet_config === 'string' ? JSON.parse(p.sheet_config) : p.sheet_config ?? {};
    const parsed = parseTransactionSheet(sheet.grid, { members, config, sheetId: p.transaction_sheet_id, storedShares: shares, defaultFxRateToUsd: p.default_fx_rate_to_usd, currency: p.currency });
    const schedule=await read<{installment_code:string;total:number}>("SELECT installment_code,total FROM real_estate_payment_schedule WHERE investment_id=$1",[investmentId]);
    for(const entry of parsed.entries){
        if(entry.type!=='DEVELOPER_PAYMENT'||entry.amountNative==null)continue;
        // Require an ordinal: "Aug-26 installment" is a month/year label, not I026.
        const match=/\b(\d+)(?:st|nd|rd|th)\s*installment/i.exec(entry.description);
        const code=match?'I'+match[1].padStart(3,'0'):null;
        const expected=code?schedule.find(s=>s.installment_code===code):null;
        if(expected&&cents(expected.total)!==cents(entry.amountNative)){
            entry.needsReview=true;
            parsed.warnings.push({rowNumber:entry.rowNumber,kind:'SCHEDULE_AMOUNT_DIFFERENCE',rawValue:entry.amountNative,correctedValue:null,explanation:`${code}: source cash amount differs from the developer schedule (${expected.total} ${p.currency}). Fees, prepayments or a misleading label may explain the difference. Amount preserved; no automatic correction.`});
        }
    }
    if (parsed.currency !== p.currency)
        parsed.errors.push(`Sheet currency ${parsed.currency} differs from investment currency ${p.currency}.`);
    const rows = parsed.entries.map(e => { const old = existing.find(r => r.key === e.rowKey); return { rowKey: e.rowKey, rowNumber: e.rowNumber, description: e.description, classification: !old ? 'NEW' : old.hash === e.hash ? 'UNCHANGED' : 'CHANGED', existingId: old?.id ?? null }; });
    const orphaned = existing.filter(e => !parsed.entries.some(r => r.rowKey === e.key)).map(e => ({ rowKey: e.key, classification: 'ORPHANED' as const, existingId: e.id }));
    const token = createHash('sha256').update(JSON.stringify({ parsed, existing, revision: sheet.revision, config })).digest('hex');
    return { ...parsed, rows, orphaned, token, revision: sheet.revision };
}
export async function commitSheet(investmentId: string, memberId: string, previewToken: string, acknowledgeWarnings: boolean) {
    return withTransaction(async (client) => {
        await lockProperty(client, investmentId);
        const preview = await sheetPreview(investmentId, client);
        if (preview.token !== previewToken)
            throw new HttpsError("failed-precondition", "The sheet or investment changed. Preview again.");
        if (preview.errors.length || preview.unresolvedInvestorLabels.length)
            throw new HttpsError("failed-precondition", "Resolve all mapping and reconciliation errors first.");
        if (preview.warnings.length && !acknowledgeWarnings)
            throw new HttpsError("failed-precondition", "Acknowledge the data-quality findings first.");
        let imported = 0, corrected = 0;
        for (const row of preview.rows) {
            if (row.classification === 'UNCHANGED')
                continue;
            const e = preview.entries.find(e => e.rowKey === row.rowKey)!;
            if (row.existingId) {
                const old = (await client.query(`SELECT * FROM real_estate_ledger_entry WHERE id=$1`, [row.existingId])).rows[0];
                const allocations = (await client.query<{
                    memberId: string;
                    amountUsd: number;
                    cashDirection: number;
                }>(`SELECT member_id AS "memberId",amount_usd AS "amountUsd",-cash_direction AS "cashDirection" FROM real_estate_allocation WHERE ledger_entry_id=$1`, [row.existingId])).rows;
                const reversal: ParsedEntry = { ...e, type: old.type, eventDate: old.event_date.toISOString().slice(0, 10), amountUsd: old.amount_usd, amountNative: old.amount_native, fxRateToUsd: old.fx_rate_to_usd, currency: old.currency, counterparty: old.counterparty ?? '', description: `Reversal of ${row.existingId}: ${old.description ?? ''}`, fundedOutsideHub: old.funded_outside_hub, cashDirection: -old.cash_direction, needsReview: true, allocations };
                await writeRealEstateEntry(client, investmentId, memberId, reversal, row.existingId);
                e.needsReview = true;
                corrected++;
            }
            await writeRealEstateEntry(client, investmentId, memberId, e);
            imported++;
        }
        if (preview.shares.length) {
            const current = (await client.query<{
                memberId: string;
                shareUnits: number;
            }>(`SELECT member_id AS "memberId",share_units AS "shareUnits" FROM real_estate_member_share WHERE investment_id=$1 AND superseded_by_id IS NULL`, [investmentId])).rows;
            if (JSON.stringify([...current].sort((a, b) => a.memberId.localeCompare(b.memberId))) !== JSON.stringify([...preview.shares].sort((a, b) => a.memberId.localeCompare(b.memberId))))
                await setShares(client, investmentId, memberId, new Date().toISOString().slice(0, 10), preview.shares);
        }
        await client.query(`INSERT INTO real_estate_sheet_sync_run (id,investment_id,run_by_id,run_at,sheet_revision_id,rows_scanned,rows_imported,rows_unchanged,rows_corrected,warnings) VALUES ($1,$2,$3,now(),$4,$5,$6,$7,$8,$9)`, [randomUUID(), investmentId, memberId, preview.revision, preview.entries.length, imported, preview.rows.filter(r => r.classification === 'UNCHANGED').length, corrected, JSON.stringify({ findings: preview.warnings, orphaned: preview.orphaned })]);
        return { imported, corrected };
    });
}
