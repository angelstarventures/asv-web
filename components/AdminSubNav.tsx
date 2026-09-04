"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_ADMIN_TABS = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/documents", label: "Document uploads" },
];
const SETTINGS_TAB = { href: "/admin/settings", label: "Settings" };

export function AdminSubNav({ isSiteAdmin }: { isSiteAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isSiteAdmin ? [...BASE_ADMIN_TABS, SETTINGS_TAB] : BASE_ADMIN_TABS;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-zinc-200 px-4 py-3 text-sm sm:px-6">
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
    </nav>
  );
}
