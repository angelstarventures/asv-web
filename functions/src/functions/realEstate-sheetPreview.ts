import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import { sheetPreview } from "../lib/realEstateService";
export const realEstateSheetPreview = onCall<{
    investmentId: string;
}>({ timeoutSeconds: 300, secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] }, async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    return sheetPreview(request.data.investmentId);
});
