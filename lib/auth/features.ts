// Client-side feature helpers — wraps Data Connect feature queries with React caching so
// one page load pays at most one read per member+org combination. This is a UI-audience
// layer, NOT the security boundary (the server-side requireFeature/requireMemberFeature
// helpers in functions/src/lib/organizationFeatureCheck.ts are the real enforcement).
//
// Usage in page/layout components:
//   const effective = await getEffectiveFeatures(memberId, orgId);
//   if (effective.DEALS) { ... }

import { cache } from "react";
import { getOrganizationFeatures, getMemberOrganizationFeatures } from "@/lib/functions/organizationFeatures";

export type EffectiveFeatures = Record<string, boolean>;

// Fetches the effective feature state for a single (member, org) pair. Cached by React's
// cache() so multiple callers within the same render pay one DB read.
export const getEffectiveFeatures = cache(
  async (memberId: string, organizationId: string): Promise<EffectiveFeatures> => {
    const { features: orgFeatures } = await getOrganizationFeatures(organizationId);
    const { features: memberFeatures } = await getMemberOrganizationFeatures({
      memberId,
      organizationId,
    });

    // Org-level is the master switch: per-member can only narrow, never widen.
    const result: EffectiveFeatures = {};
    for (const of_ of orgFeatures) {
      result[of_.featureKey] = of_.enabled;
    }
    for (const mf of memberFeatures) {
      // If org says false, member override is irrelevant (already set to false above).
      if (result[mf.featureKey] !== false) {
        result[mf.featureKey] = mf.enabled;
      }
    }
    return result;
  }
);