"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { exchangeIdTokenForSession } from "@/lib/auth/session-client";
import { setSiteAdminMode } from "@/lib/functions/adminMembers";

const BASE_ADMIN_TABS = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/documents", label: "Document uploads" },
];
const ROOT_MODE_TABS = [
  { href: "/admin/portfolios", label: "Portfolios" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/costs", label: "Costs" },
];

// isSiteAdminRole: the viewer genuinely holds the site_admin role (controls whether the toggle
// itself renders at all — a regular admin never sees it). siteAdminModeOn: that role AND the
// siteAdminMode custom claim are both on (controls whether the root-only tabs show) — see
// lib/siteAdminMode.ts for why this claim is a pure UI gate, never a security boundary on its
// own, and why it's a claim rather than a second cookie (Firebase Hosting only forwards
// `__session` to the SSR backend).
export function AdminSubNav({
  isSiteAdminRole,
  siteAdminModeOn,
}: {
  isSiteAdminRole: boolean;
  siteAdminModeOn: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const tabs = siteAdminModeOn ? [...BASE_ADMIN_TABS, ...ROOT_MODE_TABS] : BASE_ADMIN_TABS;

  async function toggleSiteAdminMode() {
    setBusy(true);
    try {
      await setSiteAdminMode({ on: !siteAdminModeOn });
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in.");
      // The new claim only lands in a FRESH ID token, and only reaches proxy.ts/server
      // components once that's re-minted into the session cookie — same pattern as
      // ForcedPasswordChangeScreen clearing mustChangePassword.
      const idToken = await user.getIdToken(true);
      await exchangeIdTokenForSession(idToken);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
      {isSiteAdminRole && (
        <button
          type="button"
          onClick={toggleSiteAdminMode}
          disabled={busy}
          className={
            siteAdminModeOn
              ? "shrink-0 rounded-full border border-amber-500 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50 dark:text-amber-400"
              : "shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
          }
        >
          Site-admin mode: {siteAdminModeOn ? "On" : "Off"}
        </button>
      )}
    </nav>
  );
}
