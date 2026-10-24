import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { withTransaction } from "../lib/dataconnect-admin";
import { lockProperty, setShares } from "../lib/realEstateService";
import { writeRealEstateEntry } from "../lib/realEstateLedgerWrites";
import { splitMoney, type ParsedEntry } from "../lib/realEstateSheetParse";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
import { uuid, memberId } from "../lib/realEstateInputs";
export interface RecordRealEstateEntryInput {
    investmentId: string;
    type: 'VALUATION_MARK' | 'SHARE_TRANSFER' | 'SALE' | 'DISTRIBUTION' | 'CARRY' | 'STATUS_UPDATE';
    eventDate: string;
    amountNative: number;
    description: string;
    fxRateToUsd: number;
    fromMemberId?: string;
    toMemberId?: string;
    shareUnits?: number;
    sellingCosts?: number;
    docUrl?: string;
}
const input = z.object({ investmentId: uuid, type: z.enum(['VALUATION_MARK', 'SHARE_TRANSFER', 'SALE', 'DISTRIBUTION', 'CARRY', 'STATUS_UPDATE']), eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s), amountNative: z.number().nonnegative(), description: z.string().max(4000), fxRateToUsd: z.number().positive(), fromMemberId: memberId.optional(), toMemberId: memberId.optional(), shareUnits: z.number().positive().optional(), sellingCosts: z.number().nonnegative().optional(), docUrl: z.string().url().optional() });
export const realEstateRecordEntry = onCall<RecordRealEstateEntryInput>(async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    const result = input.safeParse(request.data);
    if (!result.success)
        throw new HttpsError('invalid-argument', result.error.message);
    const d = result.data;
    await withTransaction(async (client) => {
        const p = await lockProperty(client, d.investmentId);
        if (p.kind !== 'UNDER_CONSTRUCTION')
            throw new HttpsError('failed-precondition', 'Rental writes are phase 2.');
        if (d.eventDate > new Date().toISOString().slice(0, 10))
            throw new HttpsError('invalid-argument', 'Actual ledger entries cannot be future-dated.');
        if (p.currency === 'USD' && d.fxRateToUsd !== 1)
            throw new HttpsError('invalid-argument', 'USD exchange rate must be 1.');
        const shares = (await client.query<{
            memberId: string;
            shareUnits: number;
            committedAmount: number | null;
        }>(`SELECT member_id AS "memberId",share_units AS "shareUnits",committed_amount AS "committedAmount" FROM real_estate_member_share WHERE investment_id=$1 AND superseded_by_id IS NULL`, [p.id])).rows;
        const futureShares = (await client.query(`SELECT id FROM real_estate_member_share WHERE investment_id=$1 AND superseded_by_id IS NULL AND effective_from>$2 LIMIT 1`, [p.id, d.eventDate])).rowCount;
        if (futureShares && d.type !== 'VALUATION_MARK' && d.type !== 'STATUS_UPDATE')
            throw new HttpsError('failed-precondition', 'Use a date on or after the current share generation for money movements.');
        const usd = (v: number) => Math.round(v / d.fxRateToUsd * 100) / 100;
        const base: ParsedEntry = { rowKey: '', rowNumber: 0, hash: '', type: d.type, eventDate: d.eventDate, amountUsd: usd(d.amountNative), amountNative: d.amountNative, fxRateToUsd: d.fxRateToUsd, currency: p.currency, counterparty: '', description: d.description, fundedOutsideHub: false, cashDirection: d.type === 'SALE' ? 1 : ['CARRY', 'DISTRIBUTION'].includes(d.type) ? -1 : 0, needsReview: false, allocations: [] };
        if (d.type === 'SHARE_TRANSFER') {
            const seller = shares.find(s => s.memberId === d.fromMemberId), buyer = shares.find(s => s.memberId === d.toMemberId);
            if (!seller || !d.toMemberId || d.fromMemberId === d.toMemberId || !d.shareUnits || d.shareUnits > seller.shareUnits)
                throw new HttpsError('invalid-argument', 'Choose different members and shares within the seller’s holding.');
            const cost = (await client.query<{
                basis: number;
            }>(`SELECT coalesce(sum(a.amount_usd * -e.cash_direction),0) AS basis FROM real_estate_allocation a JOIN real_estate_ledger_entry e ON e.id=a.ledger_entry_id WHERE e.investment_id=$1 AND a.member_id=$2 AND e.type IN ('DEVELOPER_PAYMENT','ACQUISITION_COST') AND e.reverses_entry_id IS NULL AND NOT EXISTS(SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id)`, [p.id, d.fromMemberId])).rows[0];
            // Include prior transfers in the seller's remaining basis.
            const transfers = (await client.query<{
                basis: number;
            }>(`SELECT coalesce(sum(CASE WHEN t.to_member_id=$2 THEN e.amount_usd ELSE -t.seller_cost_basis END),0) AS basis FROM real_estate_share_transfer_detail t JOIN real_estate_ledger_entry e ON e.id=t.ledger_entry_id WHERE e.investment_id=$1 AND (t.from_member_id=$2 OR t.to_member_id=$2)`, [p.id, d.fromMemberId])).rows[0];
            const basis = Math.round((Number(cost.basis) + Number(transfers.basis)) * d.shareUnits / seller.shareUnits * 100) / 100;
            const carry = Math.round(Math.max(0, base.amountUsd - basis) * p.carry_percent) / 100;
            base.allocations = [{ memberId: seller.memberId, amountUsd: base.amountUsd - carry, cashDirection: 1 }, { memberId: d.toMemberId, amountUsd: base.amountUsd, cashDirection: -1 }];
            const id = await writeRealEstateEntry(client, p.id, caller.memberId, base, null, false);
            await client.query(`INSERT INTO real_estate_share_transfer_detail(id,ledger_entry_id,from_member_id,to_member_id,share_units,price_per_share_unit,seller_cost_basis,carry_amount) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)`, [id, seller.memberId, d.toMemberId, d.shareUnits, base.amountUsd / d.shareUnits, basis, carry]);
            const fraction = d.shareUnits / seller.shareUnits, transferredCommitment = seller.committedAmount == null ? null : seller.committedAmount * fraction;
            const next = shares.map(s => ({ ...s, shareUnits: s.shareUnits + (s.memberId === seller.memberId ? -d.shareUnits! : s.memberId === d.toMemberId ? d.shareUnits! : 0), committedAmount: s.committedAmount == null ? null : s.committedAmount + (s.memberId === seller.memberId ? -(transferredCommitment ?? 0) : s.memberId === d.toMemberId ? (transferredCommitment ?? 0) : 0) }));
            if (!buyer)
                next.push({ memberId: d.toMemberId, shareUnits: d.shareUnits, committedAmount: transferredCommitment });
            await setShares(client, p.id, caller.memberId, d.eventDate, next, id);
            return;
        }
        if (d.type === 'SALE') {
            if (p.status === 'SOLD')
                throw new HttpsError('failed-precondition', 'Investment has already been sold.');
            const sellingCosts = d.sellingCosts ?? 0;
            if (sellingCosts > d.amountNative)
                throw new HttpsError('invalid-argument', 'Selling costs exceed price.');
            const cost = (await client.query<{
                basis: number;
            }>(`SELECT coalesce(sum(amount_usd * -cash_direction),0) AS basis FROM real_estate_ledger_entry e WHERE investment_id=$1 AND type IN ('DEVELOPER_PAYMENT','ACQUISITION_COST') AND reverses_entry_id IS NULL AND NOT EXISTS(SELECT 1 FROM real_estate_ledger_entry r WHERE r.reverses_entry_id=e.id)`, [p.id])).rows[0];
            const net = usd(d.amountNative - sellingCosts), carry = Math.round(Math.max(0, net - Number(cost.basis)) * p.carry_percent) / 100;
            base.amountUsd = net;
            base.amountNative = d.amountNative - sellingCosts;
            base.allocations = splitMoney(net, shares).map(a => ({ ...a, cashDirection: 1 }));
            const id = await writeRealEstateEntry(client, p.id, caller.memberId, base, null, false);
            // Detail money is USD throughout; the ledger retains native proceeds and the rate.
            await client.query(`INSERT INTO real_estate_sale_detail(id,ledger_entry_id,gross_sale_price,selling_costs,net_proceeds,cost_basis,accumulated_depreciation,carry_amount,doc_url) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,0,$6,$7)`, [id, usd(d.amountNative), usd(sellingCosts), net, Number(cost.basis), carry, d.docUrl ?? null]);
            if (carry > 0)
                await writeRealEstateEntry(client, p.id, caller.memberId, { ...base, type: 'CARRY', amountUsd: carry, amountNative: Math.round(carry * d.fxRateToUsd * 100) / 100, cashDirection: -1, allocations: splitMoney(carry, shares).map(a => ({ ...a, cashDirection: -1 })) }, null, false);
            await client.query("UPDATE real_estate_investment SET status='SOLD',sale_date=$2,sale_price=$3 WHERE id=$1", [p.id, d.eventDate, d.amountNative]);
            return;
        }
        if (['DISTRIBUTION', 'CARRY'].includes(d.type))
            base.allocations = splitMoney(base.amountUsd, shares).map(a => ({ ...a, cashDirection: -1 }));
        if (d.type === 'STATUS_UPDATE' && d.amountNative !== 0)
            throw new HttpsError('invalid-argument', 'Status updates must have zero amount.');
        await writeRealEstateEntry(client, p.id, caller.memberId, base, null, false);
    });
    await recomputeRealEstateRollups();
    return { ok: true };
});
