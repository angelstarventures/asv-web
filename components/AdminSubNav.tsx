"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
import { auth } from "@/lib/firebase/client";
import { getOrganizationFeatures, getMemberOrganizationFeatures } from "@/lib/functions/organizationFeatures";

// Tabs gated by organization feature flags. A tab whose feature key is absent from the map
// (undefined) or set to true is shown; one explicitly set to false is hidden. This is a
// UI-visibility layer only — the server-side enforcement is in the Cloud Functions.
const FEATURE_GATED_TABS: Record<string, string[]> = {
  "/admin/real-estate": ["REAL_ESTATE"],
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

type AdminTab = { href: string; label: string; siteAdminOnly?: boolean };
type AdminGroupId = "members" | "portfolio" | "site";
const ADMIN_GROUPS: { id: AdminGroupId; label: string; shortLabel: string; tabs: AdminTab[] }[] = [
  {
    id: "members", label: "Member Management", shortLabel: "Members", tabs: [
      { href: "/admin/members", label: "Members" },
      { href: "/admin/portfolios", label: "Portfolios" },
      { href: "/admin/tax-documents", label: "Tax Documents" },
    ],
  },
  {
    id: "portfolio", label: "Portfolio Management", shortLabel: "Portfolio", tabs: [
      { href: "/admin/deals", label: "Deals" },
      { href: "/admin/documents/investment", label: "Add Startup Investment" },
      { href: "/admin/documents/updates", label: "Add Startup Updates" },
      { href: "/admin/real-estate", label: "Real Estate" },
      { href: "/admin/companies", label: "Companies" },
    ],
  },
  {
    id: "site", label: "Site Management", shortLabel: "Site", tabs: [
      { href: "/admin/ledger", label: "Ledger" },
      { href: "/admin/costs", label: "Costs" },
      { href: "/admin/features", label: "Features", siteAdminOnly: true },
      { href: "/admin/settings", label: "Settings", siteAdminOnly: true },
    ],
  },
];

function matchesPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// isSiteAdminRole: the viewer holds site_admin or dev_site_admin role — controls whether the
// root-only pages (Features and Settings) are shown in the nav.
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
    if (enabledFeatures) return;
    (async () => {
      try {
        const membership = await getMyOrganizationMembership();
        const orgId = membership.organizationId;
        if (!orgId) return;
        const { features } = await getOrganizationFeatures(orgId);
        const result: Record<string, boolean> = {};
        for (const f of features) result[f.featureKey] = f.enabled;
        const memberId=(await auth.currentUser?.getIdTokenResult())?.claims.memberId;
        if(typeof memberId==='string') {
          const memberFeatures = await getMemberOrganizationFeatures({memberId,organizationId:orgId});
          if(memberFeatures.features.some(f=>f.featureKey==='REAL_ESTATE_MANAGEMENT'&&!f.enabled)) result.REAL_ESTATE=false;
        }
        setResolvedFeatures(result);
      } catch {
        // Feature computation failed — show all tabs as safe fallback.
      }
    })();
  }, [enabledFeatures]);

  const groups = ADMIN_GROUPS.map(group => ({
    ...group,
    tabs: group.tabs.filter(tab => (!tab.siteAdminOnly || isSiteAdminRole) && isTabVisible(tab.href, enabledFeatures ?? resolvedFeatures)),
  })).filter(group => group.tabs.length > 0);
  // Derive the group from the route so bookmarks, nested pages and browser Back stay aligned.
  const routeGroup = ADMIN_GROUPS.find(group => group.tabs.some(tab => matchesPath(pathname, tab.href)));
  const activeGroup = groups.find(group => group.id === routeGroup?.id) ?? groups[0];

  if (!activeGroup) return null;

  return (
    <div className="border-b border-zinc-200 px-4 py-3 text-sm sm:px-6">
      <div className="isolate w-fit max-w-full">
        <nav aria-label="Admin management groups" className="flex w-fit max-w-full items-stretch gap-1">
          {groups.map(group => {
            const selected = group.id === activeGroup.id;
            return (
              <div key={group.id} className={`relative shrink-0 rounded-t-2xl border border-b-0 p-1 pb-2 sm:p-1.5 sm:pb-2 ${selected
                ? "z-10 -mb-px border-[#eadfca] bg-[#fbf5e9]"
                : "border-transparent"}`}>
                <Link
                  data-admin-group={group.id}
                  aria-label={group.label}
                  href={selected ? (group.tabs.find(tab => matchesPath(pathname, tab.href))?.href ?? group.tabs[0].href) : group.tabs[0].href}
                  aria-current={selected ? "true" : undefined}
                  className={selected
                    ? "inline-flex rounded-full border border-foreground bg-foreground px-2 py-1.5 font-semibold text-white shadow-sm md:px-4"
                    : "inline-flex rounded-full border border-zinc-200 bg-card px-2 py-1.5 font-medium text-neutral-500 hover:text-foreground md:px-4"}
                >
                  <span className="hidden md:inline">{group.label}</span>
                  <span className="md:hidden">{group.shortLabel}</span>
                </Link>
              </div>
            );
          })}
        </nav>
        <nav aria-label={`${activeGroup.label} pages`} className="relative z-0 flex flex-wrap gap-1 rounded-b-2xl border border-[#eadfca] bg-[#fbf5e9] p-2 sm:p-3">
          {activeGroup.tabs.map(tab => {
            const active = matchesPath(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={active
                  ? "rounded-full border border-foreground bg-foreground px-3 py-1.5 font-semibold text-white shadow-sm"
                  : "rounded-full border border-transparent bg-card px-3 py-1.5 text-neutral-500 hover:text-foreground"}
              >{tab.label}</Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
