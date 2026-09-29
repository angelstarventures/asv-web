import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAllUserManagement, requireCaller } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import {
  COMPANY_FEATURE_KEYS,
  MEMBER_COMPANY_FEATURE_KEYS,
  getAllCompanyFeatures,
  getAllMemberCompanyFeatures,
  type CompanyFeatureKey,
  type MemberCompanyFeatureKey,
} from "../lib/featureCheck";

// ── Company-level feature toggles ──────────────────────────────────────────

export interface UpdateCompanyFeatureInput {
  companyId: string;
  featureKey: CompanyFeatureKey;
  enabled: boolean;
}

// Toggle a company-level feature. Gated to dev_site_admin / site_admin.
export const updateCompanyFeature = onCall<UpdateCompanyFeatureInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireAllUserManagement(request);

    const { companyId, featureKey, enabled } = request.data;
    if (!companyId || !featureKey || typeof enabled !== "boolean") {
      throw new HttpsError("invalid-argument", "companyId, featureKey, and enabled (boolean) are required.");
    }
    if (!COMPANY_FEATURE_KEYS.includes(featureKey)) {
      throw new HttpsError(
        "invalid-argument",
        `featureKey must be one of: ${COMPANY_FEATURE_KEYS.join(", ")}`
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO "company_feature" ("company_id", "feature_key", "enabled", "updated_by_id", "updated_at")
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT ("company_id", "feature_key") DO UPDATE SET enabled = $3, "updated_by_id" = $4, "updated_at" = now()`,
        [companyId, featureKey, enabled, caller.memberId]
      );
    });

    return { ok: true };
  }
);

export interface GetCompanyFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}

// Read all company feature states — no elevated role needed, just signed-in.
// Full company-scoping (an "admin" restricted to their own company) lands once the
// scoping helper exists — see the permissions-overhaul plan.
export const getCompanyFeatures = onCall<{ companyId: string }, Promise<GetCompanyFeaturesOutput>>(
  async (request) => {
    await requireCaller(request);

    const { companyId } = request.data;
    if (!companyId) {
      throw new HttpsError("invalid-argument", "companyId is required.");
    }
    const features = await getAllCompanyFeatures(companyId);
    return { features };
  }
);

// ── Per-user-in-company feature toggles ────────────────────────────────────

export interface UpdateMemberCompanyFeatureInput {
  memberId: string;
  companyId: string;
  featureKey: MemberCompanyFeatureKey;
  enabled: boolean;
}

// Toggle a per-user-in-company feature. Gated to dev_site_admin / site_admin (and
// some keys are togglable by admin — see lib/auth/permissions.ts).
export const updateMemberCompanyFeature = onCall<UpdateMemberCompanyFeatureInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireAllUserManagement(request);

    const { memberId, companyId, featureKey, enabled } = request.data;
    if (!memberId || !companyId || !featureKey || typeof enabled !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "memberId, companyId, featureKey, and enabled (boolean) are required."
      );
    }
    if (!MEMBER_COMPANY_FEATURE_KEYS.includes(featureKey)) {
      throw new HttpsError(
        "invalid-argument",
        `featureKey must be one of: ${MEMBER_COMPANY_FEATURE_KEYS.join(", ")}`
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO "member_company_feature" ("company_id", "member_id", "feature_key", "enabled", "updated_by_id", "updated_at")
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT ("company_id", "member_id", "feature_key") DO UPDATE SET enabled = $4, "updated_by_id" = $5, "updated_at" = now()`,
        [companyId, memberId, featureKey, enabled, caller.memberId]
      );
    });

    return { ok: true };
  }
);

export interface GetMemberCompanyFeaturesInput {
  memberId: string;
  companyId: string;
}
export interface GetMemberCompanyFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}

// Read all per-member feature states for a (member, company). Same scoping note as
// getCompanyFeatures above.
export const getMemberCompanyFeatures = onCall<
  GetMemberCompanyFeaturesInput,
  Promise<GetMemberCompanyFeaturesOutput>
>(async (request) => {
  await requireCaller(request);

  const { memberId, companyId } = request.data;
  if (!memberId || !companyId) {
    throw new HttpsError("invalid-argument", "memberId and companyId are required.");
  }
  const features = await getAllMemberCompanyFeatures(memberId, companyId);
  return { features };
});