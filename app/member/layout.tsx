import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/member/overview", label: "Overview" },
  { href: "/member/dashboard", label: "Dashboard" },
  { href: "/member/detail", label: "Detail" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/ai", label: "AI" },
  { href: "/member/watchlist", label: "Watchlist" },
  { href: "/member/settings", label: "Settings" },
];

// proxy.ts is the real enforcement point for everything under /member/* — this layout is
// UI chrome only (plan §4).
export default function MemberLayout({ children }: { children: ReactNode }) {
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
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
