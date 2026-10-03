"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
import { getOrganizationFeatures, getMemberOrganizationFeatures } from "@/lib/functions/organizationFeatures";

// Tabs gated by organization feature flags. A tab whose feature key is absent from the map
// (undefined) or set to true is shown; one explicitly set to false is hidden. This is a
// UI-visibility layer only — the server-side enforcement is in the Cloud Functions.
const FEATURE_GATED_TABS: Record<string, string[]> = {
  "/admin/members": ["MEMBER_MANAGEMENT"],
  "/admin/companies": ["COMPANY_MANAGEMENT"],
  "/admin/deals": ["DEALS"],
  "/admin/costs": ["COSTS"],
  "/admin/portfolios": ["MEMBER_PORTFOLIO_VIEW"],
};

function isTabVisible(href: string, enabledFeatures: Record<string, boolean> | undefined): boolean {
  if (!enabledFeatures) return true; // No feature data → show everything (fresh tenant / fallback)
  const requiredFeatures = FEATURE_GATED_TABS[href];
  if (!requiredFeatures) return true; // No feature gate for this tab
  return requiredFeatures.every((key) => enabledFeatures[key] !== false);
}

const BASE_ADMIN_TABS = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/documents", label: "Document uploads" },
  { href: "/admin/costs", label: "Costs" },
];
const ROOT_MODE_TABS = [
  { href: "/admin/features", label: "Features" },
  { href: "/admin/portfolios", label: "Portfolios" },
  { href: "/admin/settings", label: "Settings" },
];

// isSiteAdminRole: the viewer holds site_admin or dev_site_admin role — controls whether the
// root-only tabs (Features, Portfolios, Settings) are shown in the nav. Regular admins see
// only BASE_ADMIN_TABS.
//
// enabledFeatures: feature-key → boolean map computed server-side. Tabs for disabled features
// are hidden. Undefined = no feature data (show everything for safety / fresh tenant setup).
export function AdminSubNav({
  isSiteAdminRole,
  enabledFeatures,
}: {
  isSiteAdminRole: boolean;
  enabledFeatures?: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const [resolvedFeatures, setResolvedFeatures] = useState<Record<string, boolean> | undefined>(enabledFeatures);

  // If the layout didn't pass enabledFeatures (Server Components can't call Cloud Functions
  // with auth), compute them client-side where Firebase Auth is available.
  // Uses org-level features (getOrganizationFeatures) which is sufficient for nav gating —
  // per-member overrides only narrow within org-level and don't affect nav visibility.
  useEffect(() => {
    if (enabledFeatures) {
      setResolvedFeatures(enabledFeatures);
      return;
    }
    (async () => {
      try {
        const membership = await getMyOrganizationMembership();
        const orgId = membership.organizationId;
        if (!orgId) return;
        const { features } = await getOrganizationFeatures(orgId);
        const result: Record<string, boolean> = {};
        for (const f of features) result[f.featureKey] = f.enabled;
        setResolvedFeatures(result);
      } catch {
        // Feature computation failed — show all tabs as safe fallback.
      }
    })();
  }, [enabledFeatures]);

  const allTabs = isSiteAdminRole ? [...BASE_ADMIN_TABS, ...ROOT_MODE_TABS] : BASE_ADMIN_TABS;
  const tabs = allTabs.filter((tab) => isTabVisible(tab.href, resolvedFeatures));

  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 text-sm sm:px-6">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full bg-card px-3 py-1.5 font-medium text-zinc-900 shadow-sm"
                  : "rounded-full px-3 py-1.5 text-zinc-600 hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
