"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { exchangeIdTokenForSession } from "@/lib/auth/session-client";
import { setDevSiteAdminMode } from "@/lib/functions/adminMembers";

const DEVELOPER_TABS = [
  { href: "/developer", label: "Dashboard" },
  { href: "/developer/deploy", label: "Deploy" },
  { href: "/developer/migrations", label: "Migrations" },
  { href: "/developer/features", label: "Features" },
];

export function DeveloperSubNav({
  isDevSiteAdminRole,
  devSiteAdminModeOn,
}: {
  isDevSiteAdminRole: boolean;
  devSiteAdminModeOn: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleDevSiteAdminMode() {
    setBusy(true);
    try {
      await setDevSiteAdminMode({ on: !devSiteAdminModeOn });
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in.");
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
        {DEVELOPER_TABS.map((tab) => {
          const active = tab.href === "/developer"
            ? pathname === "/developer"
            : pathname.startsWith(tab.href);
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
      {isDevSiteAdminRole && (
        <button
          type="button"
          onClick={toggleDevSiteAdminMode}
          disabled={busy}
          className={
            devSiteAdminModeOn
              ? "shrink-0 rounded-full border border-amber-500 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50 dark:text-amber-400"
              : "shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
          }
        >
          Dev-site-admin mode: {devSiteAdminModeOn ? "On" : "Off"}
        </button>
      )}
    </nav>
  );
}