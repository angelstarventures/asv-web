"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { organizationFeatureKeys, type OrganizationFeatureKey } from "@/lib/auth/permissions";
import { listOrganizations } from "@/lib/functions/organizationMembers";
import { updateOrganizationFeature, getOrganizationFeatures } from "@/lib/functions/organizationFeatures";

// The master switch for the deployment — a feature disabled here is unavailable to
// everyone, regardless of any per-member override (see schema.gql's OrganizationFeature
// comment). editable is false for a viewer who can SEE this (e.g. site_admin landed here
// via /developer/*) but can't control it — developer/dev_site_admin only, per
// requireFeatureControl.
export function OrganizationFeatureToggles({
  organizationId,
  editable,
}: {
  organizationId?: string;
  editable: boolean;
}) {
  const [resolvedOrgId, setResolvedOrgId] = useState<string | undefined>(organizationId);
  const [features, setFeatures] = useState<{ featureKey: string; enabled: boolean }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // If no orgId was provided (e.g. called from a Server Component that can't call Cloud
  // Functions), look it up client-side where auth is available.
  const load = useCallback(async () => {
    try {
      let orgId = organizationId;
      if (!orgId) {
        const { organizations } = await listOrganizations();
        orgId = organizations[0]?.id;
        if (!orgId) throw new Error("No organization found.");
        setResolvedOrgId(orgId);
      }
      const { features: f } = await getOrganizationFeatures(orgId);
      setFeatures(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load features.");
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: OrganizationFeatureKey) {
    if (!features || !editable || !resolvedOrgId) return;
    setBusy(key);
    setError(null);
    const current = features.find((f) => f.featureKey === key)?.enabled ?? false;
    try {
      await updateOrganizationFeature({ organizationId: resolvedOrgId, featureKey: key, enabled: !current });
      setFeatures((prev) => prev?.map((f) => (f.featureKey === key ? { ...f, enabled: !current } : f)) ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update feature.");
    } finally {
      setBusy(null);
    }
  }

  if (features === null) {
    if (error) return <p className="text-xs text-red-600 dark:text-red-400">{error}</p>;
    return <span className="text-xs text-zinc-500">Loading…</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {organizationFeatureKeys.map((key) => {
        const f = features.find((f) => f.featureKey === key);
        const on = f?.enabled ?? false;
        return (
          <label key={key} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={on}
              disabled={!editable || busy === key}
              onChange={() => toggle(key)}
              className="h-3 w-3 rounded border-zinc-300 text-foreground focus:ring-0"
            />
            <span className={on ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}>
              {key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </label>
        );
      })}
    </div>
  );
}
