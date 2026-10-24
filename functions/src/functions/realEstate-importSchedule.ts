import { randomUUID } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { withTransaction } from "../lib/dataconnect-admin";
import { lockProperty } from "../lib/realEstateService";
import { money } from "../lib/realEstateSheetParse";
// RFC 4180 quoting, including commas and newlines inside quoted fields.
export function parseSchedule(text: string) {
    const delimiter = text.split('\n', 1)[0].includes('\t') ? '\t' : ',';
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i <= text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if ((c === delimiter || c === '\n' || c === undefined) && !quoted) {
            row.push(cell.replace(/\r$/, ''));
            cell = '';
            if (c !== delimiter) {
                if (row.some(Boolean))
                    rows.push(row);
                row = [];
            }
        }
        else if (c !== undefined)
            cell += c;
    }
    if (quoted)
        throw new Error('Unclosed CSV quote.');
    const headers = rows.shift()?.map(s => s.trim().toLowerCase().replace(/[\s_]/g, '')) ?? [];
    for (const required of ['installmentcode', 'amountdue'])
        if (!headers.includes(required))
            throw new Error('Required headers: installmentCode, amountDue.');
    return rows.map((r, i) => {
        const get = (k: string) => r[headers.indexOf(k)]?.trim() || null;
        const amount = money(get('amountdue')), vat = money(get('vat')) ?? 0, percent = money(get('percent'));
        if (amount == null || amount < 0 || vat < 0 || (percent != null && (percent < 0 || percent > 100)))
            throw new Error(`Invalid amount/percent on row ${i + 2}.`);
        for (const k of ['eventdate', 'duedate']) {
            const d = get(k);
            if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d))
                throw new Error('Use ISO calendar dates (YYYY-MM-DD).');
        }
        const total = money(get('total')) ?? Math.round((amount + vat) * 100) / 100;
        if (Math.round(total * 100) !== Math.round((amount + vat) * 100))
            throw new Error('Total must equal amountDue plus VAT.');
        return { code: get('installmentcode'), label: get('milestonelabel'), event: get('eventdate'), due: get('duedate'), percent, amount, vat, total };
    });
}
export const realEstateImportSchedule = onCall<{
    investmentId: string;
    text: string;
}>(async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    let rows: ReturnType<typeof parseSchedule>;
    try {
        rows = parseSchedule(request.data.text);
    }
    catch (e) {
        throw new HttpsError('invalid-argument', (e as Error).message);
    }
    if (!rows.length)
        throw new HttpsError('invalid-argument', 'Provide schedule rows.');
    await withTransaction(async (client) => { await lockProperty(client, request.data.investmentId); await client.query('DELETE FROM real_estate_payment_schedule WHERE investment_id=$1', [request.data.investmentId]); for (const [r, i] of rows.map((r, i) => [r, i] as const))
        await client.query(`INSERT INTO real_estate_payment_schedule(id,investment_id,installment_code,milestone_label,event_date,due_date,percent,amount_due,vat,total,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [randomUUID(), request.data.investmentId, r.code, r.label, r.event, r.due, r.percent, r.amount, r.vat, r.total, i]); });
    return { imported: rows.length };
});
