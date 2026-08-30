import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentMember } from "@/lib/auth/currentMember";

const NAV = [
  { href: "/member/overview", label: "Overview" },
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/detail", label: "Detail" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/ai", label: "AI" },
  { href: "/member/watchlist", label: "Watchlist" },
  { href: "/member/settings", label: "Settings" },
];

// proxy.ts is the real enforcement point for everything under /member/* — role isn't
// restricted here at all (only /admin/* checks role), so an admin who is also a real
// investor (board members are LPs too) can already reach their own /member/* pages; they
// just had no link to find them. This layout is UI chrome only, but the admin-only "Admin"
// link below reads the real session so it doesn't get shown to actual members.
export default async function MemberLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember();
  const isAdmin = member?.role === "admin";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium">ASV Member Portal</span>
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
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-zinc-900 hover:text-foreground dark:text-zinc-50"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
