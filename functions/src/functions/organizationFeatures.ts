import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireFeatureControl, requireAllUserManagement, requireCaller } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import {
  ORGANIZATION_FEATURE_KEYS,
  MEMBER_ORGANIZATION_FEATURE_KEYS,
  getOrganizationFeature,
  getAllOrganizationFeatures,
  getAllMemberOrganizationFeatures,
  type OrganizationFeatureKey,
  type MemberOrganizationFeatureKey,
} from "../lib/organizationFeatureCheck";

// ── Organization-level feature toggles ──────────────────────────────────────
// The master switch for a deployment. developer/dev_site_admin ONLY — not site_admin, by
// explicit product decision (see requireFeatureControl's comment). A feature disabled here
// is completely unavailable to the whole org; site_admin's per-member overrides below can
// only apply to a feature that's already enabled here.

export interface UpdateOrganizationFeatureInput {
  organizationId: string;
  featureKey: OrganizationFeatureKey;
  enabled: boolean;
}

export const updateOrganizationFeature = onCall<UpdateOrganizationFeatureInput, Promise<{ ok: true }>>(
  async (request) => {
    const caller = await requireFeatureControl(request);

    const { organizationId, featureKey, enabled } = request.data;
    if (!organizationId || !featureKey || typeof enabled !== "boolean") {
      throw new HttpsError("invalid-argument", "organizationId, featureKey, and enabled (boolean) are required.");
    }
    if (!ORGANIZATION_FEATURE_KEYS.includes(featureKey)) {
      throw new HttpsError(
        "invalid-argument",
        `featureKey must be one of: ${ORGANIZATION_FEATURE_KEYS.join(", ")}`
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO "organization_feature" ("organization_id", "feature_key", "enabled", "updated_by_id", "updated_at")
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT ("organization_id", "feature_key") DO UPDATE SET enabled = $3, "updated_by_id" = $4, "updated_at" = now()`,
        [organizationId, featureKey, enabled, caller.memberId]
      );
    });

    return { ok: true };
  }
);

export interface GetOrganizationFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}

// Read all organization feature states — no elevated role needed, just signed-in.
export const getOrganizationFeatures = onCall<{ organizationId: string }, Promise<GetOrganizationFeaturesOutput>>(
  async (request) => {
    await requireCaller(request);

    const { organizationId } = request.data;
    if (!organizationId) {
      throw new HttpsError("invalid-argument", "organizationId is required.");
    }
    const features = await getAllOrganizationFeatures(organizationId);
    return { features };
  }
);

// ── Per-member-within-organization feature toggles ─────────────────────────
// site_admin (and developer/dev_site_admin, the owning tier) can grant/revoke individual
// members' access — but only within whatever developer/dev_site_admin has already enabled
// at the organization level. Turning a member's access OFF is always allowed; turning it ON
// is rejected if the organization-level feature itself is disabled.

export interface UpdateMemberOrganizationFeatureInput {
  memberId: string;
  organizationId: string;
  featureKey: MemberOrganizationFeatureKey;
  enabled: boolean;
}

export const updateMemberOrganizationFeature = onCall<
  UpdateMemberOrganizationFeatureInput,
  Promise<{ ok: true }>
>(async (request) => {
  const caller = await requireAllUserManagement(request);

  const { memberId, organizationId, featureKey, enabled } = request.data;
  if (!memberId || !organizationId || !featureKey || typeof enabled !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "memberId, organizationId, featureKey, and enabled (boolean) are required."
    );
  }
  if (!MEMBER_ORGANIZATION_FEATURE_KEYS.includes(featureKey)) {
    throw new HttpsError(
      "invalid-argument",
      `featureKey must be one of: ${MEMBER_ORGANIZATION_FEATURE_KEYS.join(", ")}`
    );
  }

  if (enabled) {
    const orgEnabled = await getOrganizationFeature(organizationId, featureKey as OrganizationFeatureKey);
    if (!orgEnabled) {
      throw new HttpsError(
        "failed-precondition",
        "This feature is not enabled for the organization — ask a developer or dev-site-admin to enable it first."
      );
    }
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO "member_organization_feature" ("organization_id", "member_id", "feature_key", "enabled", "updated_by_id", "updated_at")
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT ("organization_id", "member_id", "feature_key") DO UPDATE SET enabled = $4, "updated_by_id" = $5, "updated_at" = now()`,
      [organizationId, memberId, featureKey, enabled, caller.memberId]
    );
  });

  return { ok: true };
});

export interface GetMemberOrganizationFeaturesInput {
  memberId: string;
  organizationId: string;
}
export interface GetMemberOrganizationFeaturesOutput {
  features: { featureKey: string; enabled: boolean }[];
}

// Read all per-member feature states for a (member, organization). Same scoping note as
// getOrganizationFeatures above.
export const getMemberOrganizationFeatures = onCall<
  GetMemberOrganizationFeaturesInput,
  Promise<GetMemberOrganizationFeaturesOutput>
>(async (request) => {
  await requireCaller(request);

  const { memberId, organizationId } = request.data;
  if (!memberId || !organizationId) {
    throw new HttpsError("invalid-argument", "memberId and organizationId are required.");
  }
  const features = await getAllMemberOrganizationFeatures(memberId, organizationId);
  return { features };
});
