import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { withTransaction } from "../lib/dataconnect-admin";
import { lockProperty, setShares } from "../lib/realEstateService";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
export interface SetRealEstateSharesInput {
    investmentId: string;
    effectiveFrom: string;
    shares: {
        memberId: string;
        shareUnits: number;
        committedAmount?: number | null;
    }[];
}
export const realEstateSetShares = onCall<SetRealEstateSharesInput>(async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    const d = request.data;
    if (!Array.isArray(d.shares))
        throw new HttpsError("invalid-argument", "Shares are required.");
    await withTransaction(async (client) => { await lockProperty(client, d.investmentId); await setShares(client, d.investmentId, caller.memberId, d.effectiveFrom, d.shares); });
    await recomputeRealEstateRollups();
    return { ok: true };
});
