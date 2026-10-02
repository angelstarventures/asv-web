"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { HeaderMobileMenu } from "@/components/HeaderMobileMenu";
import { FeedbackButton } from "@/components/FeedbackButton";
import { tenantConfig } from "@/lib/config/tenant";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
import { getOrganizationFeatures } from "@/lib/functions/organizationFeatures";

// Tabs gated by org feature flags. A tab whose feature key is absent from this map or
// set to true is shown; one explicitly set to false is hidden. Same pattern as AdminSubNav.
const HEADER_FEATURE_GATED_TABS: Record<string, string[]> = {
  "/member/deals": ["DEALS"],
};

function isHeaderTabVisible(href: string, enabledFeatures: Record<string, boolean> | undefined): boolean {
  if (!enabledFeatures) return true;
  const requiredFeatures = HEADER_FEATURE_GATED_TABS[href];
  if (!requiredFeatures) return true;
  return requiredFeatures.every((key) => enabledFeatures[key] !== false);
}

// Reports lives inside the Portfolio tab now (?tab=reports), not as its own top-level tab —
// every panel that used to be on /member/reports moved there (lib/portfolioView.tsx).
const MEMBER_TABS = [
  { href: "/member/dashboard", label: "Portfolio" },
  { href: "/member/deals", label: "Deals" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/settings", label: "Settings" },
];

// The single top-level tab bar for every signed-in area — /admin/* and /member/* used to
// render two independent headers with a one-way cross-link each; this replaces both so the
// tab set (and which tab reads "active") is consistent no matter which route rendered it.
export function AppHeader({
  isAdmin,
  isDeveloper,
  displayName,
  photoUrl,
  enabledFeatures,
}: {
  isAdmin: boolean;
  isDeveloper?: boolean;
  displayName?: string;
  photoUrl?: string | null;
  enabledFeatures?: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const [resolvedFeatures, setResolvedFeatures] = useState<Record<string, boolean> | undefined>(enabledFeatures);

  // If the layout didn't pass enabledFeatures, compute them client-side.
  useEffect(() => {
    if (enabledFeatures) { setResolvedFeatures(enabledFeatures); return; }
    (async () => {
      try {
        const membership = await getMyOrganizationMembership();
        const orgId = membership.organizationId;
        if (!orgId) return;
        const { features } = await getOrganizationFeatures(orgId);
        const result: Record<string, boolean> = {};
        for (const f of features) result[f.featureKey] = f.enabled;
        setResolvedFeatures(result);
      } catch { /* show all tabs as safe fallback */ }
    })();
  }, [enabledFeatures]);

  const visibleMemberTabs = MEMBER_TABS.filter((tab) => isHeaderTabVisible(tab.href, resolvedFeatures));
  const baseTabs = isDeveloper
    ? [...visibleMemberTabs, { href: "/developer", label: "Developer View" }]
    : visibleMemberTabs;
  const tabs = isAdmin ? [...baseTabs, { href: "/admin/members", label: "Admin View" }] : baseTabs;
  const isTabActive = (href: string) => {
    if (href === "/admin/members") return pathname.startsWith("/admin");
    if (href === "/developer") return pathname.startsWith("/developer");
    return pathname.startsWith(href);
  };

  return (
    <header className="relative flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-8 sm:py-6">
      <div className="flex items-center gap-4 sm:gap-8">
        <span className="flex items-center gap-2 rounded-md">
          <Image
            src={tenantConfig.logoPath}
            alt={tenantConfig.logoAlt}
            width={157}
            height={36}
            priority
            className="h-auto w-28 sm:w-[157px]"
          />
          <span className="self-start rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold leading-none text-white">
            BETA
          </span>
        </span>
        <nav className="hidden gap-1 rounded-full border border-zinc-200 bg-card p-1.5 md:flex">
          {tabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-foreground px-5 py-2.5 text-[16px] font-semibold text-background"
                    : "rounded-full px-5 py-2.5 text-[16px] font-medium text-zinc-600 hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <FeedbackButton displayName={displayName} />
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a member-uploaded data: URL, not an optimizable remote image
          <img src={photoUrl} alt={displayName ?? ""} className="h-10 w-10 rounded-full border border-zinc-200 object-cover sm:h-12 sm:w-12" />
        ) : (
          displayName && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-card text-base font-semibold text-zinc-500 sm:h-12 sm:w-12">
              {displayName.charAt(0)}
            </div>
          )
        )}
        <div className="hidden md:block">
          <LogoutButton />
        </div>
        <HeaderMobileMenu>
          {tabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-foreground px-3 py-2.5 text-[16px] font-semibold text-background"
                    : "rounded-md px-3 py-2.5 text-[16px] font-medium text-zinc-600"
                }
              >
                {tab.label}
              </Link>
            );
          })}
          <div className="mt-1 border-t border-zinc-100 pt-2">
            <LogoutButton />
          </div>
        </HeaderMobileMenu>
      </div>
    </header>
  );
}
