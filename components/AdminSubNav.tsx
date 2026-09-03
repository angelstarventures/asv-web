"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_TABS = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/documents", label: "Document uploads" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-zinc-200 px-6 py-3 text-sm">
      {ADMIN_TABS.map((tab) => {
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
