import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { fields, sheetId, snake, uuid } from "../lib/realEstateInputs";
import { withTransaction } from "../lib/dataconnect-admin";
import { lockProperty,property } from "../lib/realEstateService";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
export const realEstateUpdateInvestment = onCall(async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    const result = z.object({ investmentId: uuid, fields: fields.partial() }).safeParse(request.data);
    if (!result.success)
        throw new HttpsError("invalid-argument", result.error.message);
    const { investmentId, fields: changes } = result.data;
    const sheetConfig=await withTransaction(async (client) => {
        const current = await lockProperty(client, investmentId);
        if (changes.kind && changes.kind !== current.kind)
            throw new HttpsError("failed-precondition", "Investment kind cannot change.");
        if ((changes.currency && changes.currency !== current.currency) || (changes.transactionSheetUrl && sheetId(changes.transactionSheetUrl) !== current.transaction_sheet_id)) {
            if ((await client.query("SELECT id FROM real_estate_ledger_entry WHERE investment_id=$1 LIMIT 1", [investmentId])).rowCount)
                throw new HttpsError("failed-precondition", "Currency and source sheet are locked after ledger entries exist.");
        }
        if ((changes.currency ?? current.currency) === 'USD' && (changes.defaultFxRateToUsd ?? current.default_fx_rate_to_usd) !== 1)
            throw new HttpsError("invalid-argument", "USD exchange rate must be 1.");
        const data = { ...changes, ...(changes.transactionSheetUrl ? { transactionSheetId: sheetId(changes.transactionSheetUrl) } : {}) };
        const keys = Object.keys(data) as (keyof typeof data)[];
        if (keys.length)
            await client.query(`UPDATE real_estate_investment SET ${keys.map((k, i) => snake(k) + '=$' + (i + 2)).join(',')} WHERE id=$1`, [investmentId, ...keys.map(k => k === 'sheetConfig' ? JSON.stringify(data[k]) : data[k])]);
        const updated=keys.length?await property(investmentId,client):current;
        return typeof updated.sheet_config==='string'?updated.sheet_config:JSON.stringify(updated.sheet_config??{});
    });
    if(Object.keys(changes).length)await recomputeRealEstateRollups();
    return { ok: true,sheetConfig };
});
