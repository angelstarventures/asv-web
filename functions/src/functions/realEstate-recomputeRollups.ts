import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { requireFeatureEnabled, requireMemberFeatureEnabled } from "../lib/organizationFeatureCheck";
import { recomputeRealEstateRollups } from "../lib/realEstateRollups";
export const realEstateRecomputeRollups = onCall({ timeoutSeconds: 300 }, async (request) => {
    const caller = await requireAdmin(request);
    await requireFeatureEnabled(caller, "REAL_ESTATE");
    await requireMemberFeatureEnabled(caller.memberId, caller, "REAL_ESTATE_MANAGEMENT");
    return recomputeRealEstateRollups();
});
