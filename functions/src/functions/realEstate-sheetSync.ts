import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import { commitSheet } from "../lib/realEstateService";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
export interface RealEstateSheetSyncInput {
    investmentId: string;
    previewToken: string;
    acknowledgeWarnings: boolean;
}
export const realEstateSheetSync = onCall<RealEstateSheetSyncInput>({ timeoutSeconds: 300, secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] }, async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    const d = request.data, result = await commitSheet(d.investmentId, caller.memberId, d.previewToken, d.acknowledgeWarnings);
    await recomputeRealEstateRollups();
    return result;
});
