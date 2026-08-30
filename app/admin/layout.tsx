import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/ledger", label: "Ledger" },
];

// proxy.ts independently re-verifies role === 'admin' on every /admin/* request — this
// layout is UI chrome only (plan §4). Every admin here is also a real investor (board
// members are LPs too), and /member/* has no role restriction at all — this link is just
// how they find their own portfolio, since nothing here stops them from visiting it already.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium">ASV Admin</span>
          <nav className="flex gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 hover:text-foreground dark:text-zinc-400"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/member/overview"
              className="text-sm font-medium text-zinc-900 hover:text-foreground dark:text-zinc-50"
            >
              My Portfolio
            </Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
