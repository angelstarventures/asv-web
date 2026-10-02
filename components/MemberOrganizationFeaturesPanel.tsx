"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { memberOrganizationFeatureKeys, type MemberOrganizationFeatureKey } from "@/lib/auth/permissions";
import { listOrganizations } from "@/lib/functions/organizationMembers";
import { getOrganizationFeatures, updateMemberOrganizationFeature, getMemberOrganizationFeatures } from "@/lib/functions/organizationFeatures";
import { OrganizationFeatureToggles } from "@/components/OrganizationFeatureToggles";

export interface MemberRow {
  id: string;
  displayName: string;
  role: string;
}

function PerMemberFeatureToggles({
  memberId,
  organizationId,
  orgEnabledKeys,
}: {
  memberId: string;
  organizationId: string;
  orgEnabledKeys: ReadonlySet<string>;
}) {
  const [features, setFeatures] = useState<{ featureKey: string; enabled: boolean }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const { features: f } = await getMemberOrganizationFeatures({ memberId, organizationId });
      setFeatures(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load features.");
    }
  }, [memberId, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: MemberOrganizationFeatureKey) {
    if (!features) return;
    setBusy(key);
    setError(null);
    const current = features.find((f) => f.featureKey === key)?.enabled ?? false;
    try {
      await updateMemberOrganizationFeature({ memberId, organizationId, featureKey: key, enabled: !current });
      setFeatures((prev) => prev?.map((f) => (f.featureKey === key ? { ...f, enabled: !current } : f)) ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update feature.");
    } finally {
      setBusy(null);
    }
  }

  if (features === null) return <span className="text-xs text-zinc-500">Loading…</span>;

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {memberOrganizationFeatureKeys.map((key) => {
        const f = features.find((f) => f.featureKey === key);
        const on = f?.enabled ?? false;
        const orgEnabled = orgEnabledKeys.has(key);
        return (
          <label key={key} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={on}
              disabled={!orgEnabled || busy === key}
              onChange={() => toggle(key)}
              className="h-3 w-3 rounded border-zinc-300 text-foreground focus:ring-0"
            />
            <span className={on ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}>
              {key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            {!orgEnabled && (
              <span className="text-zinc-400">— not enabled for the organization</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

// Per-member overrides, bounded by whatever developer/dev_site_admin has already enabled
// at the organization level (see /developer/features) — a feature disabled there can't be
// turned on for any individual member here.
export function MemberOrganizationFeaturesPanel({
  organizationId,
  organizationName,
  members,
}: {
  organizationId?: string;
  organizationName?: string;
  members: MemberRow[];
}) {
  const [resolvedOrgId, setResolvedOrgId] = useState<string | undefined>(organizationId);
  const [resolvedOrgName, setResolvedOrgName] = useState<string | undefined>(organizationName);
  const [selectedMember, setSelectedMember] = useState<string | "">("");
  const [orgEnabledKeys, setOrgEnabledKeys] = useState<ReadonlySet<string> | null>(null);

  // If no orgId was provided (Server Component can't call Cloud Functions), look it up
  // client-side where Firebase Auth is available.
  useEffect(() => {
    if (organizationId) { setResolvedOrgId(organizationId); setResolvedOrgName(organizationName); return; }
    (async () => {
      try {
        const { organizations } = await listOrganizations();
        const org = organizations[0];
        if (org) {
          setResolvedOrgId(org.id);
          setResolvedOrgName(org.name);
        }
      } catch { /* org unavailable — panel stays empty */ }
    })();
  }, [organizationId]);

  useEffect(() => {
    if (!resolvedOrgId) return;
    getOrganizationFeatures(resolvedOrgId).then(({ features }) => {
      setOrgEnabledKeys(new Set(features.filter((f) => f.enabled).map((f) => f.featureKey)));
    });
  }, [resolvedOrgId]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Organization-level features ({resolvedOrgName ?? "—"})</h3>
        <p className="mb-2 text-xs text-zinc-500">
          Read-only here — change these at <code className="text-xs">/developer/features</code>.
        </p>
        {resolvedOrgId ? (
          <OrganizationFeatureToggles organizationId={resolvedOrgId} editable={false} />
        ) : (
          <p className="text-xs text-zinc-500">Loading organization…</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Per-member overrides</h3>
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="mb-3 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Select a member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.id})
            </option>
          ))}
        </select>
        {selectedMember && resolvedOrgId && orgEnabledKeys && (
          <PerMemberFeatureToggles
            memberId={selectedMember}
            organizationId={resolvedOrgId}
            orgEnabledKeys={orgEnabledKeys}
          />
        )}
      </div>
    </div>
  );
}
