"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const MEMBER_TABS = [
  { href: "/member/dashboard", label: "Portfolio" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/settings", label: "Settings" },
];

// The single top-level tab bar for every signed-in area — /admin/* and /member/* used to
// render two independent headers with a one-way cross-link each; this replaces both so the
// tab set (and which tab reads "active") is consistent no matter which route rendered it.
export function AppHeader({
  isAdmin,
  displayName,
  photoUrl,
}: {
  isAdmin: boolean;
  displayName?: string;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const tabs = isAdmin ? [{ href: "/admin/members", label: "Admin" }, ...MEMBER_TABS] : MEMBER_TABS;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-6">
      <div className="flex items-center gap-8">
        <span className="rounded-md">
          <Image src="/asv-logo.png" alt="Angel Star Ventures" width={157} height={36} priority />
        </span>
        <nav className="flex gap-1 rounded-full border border-zinc-200 bg-card p-1.5">
          {tabs.map((tab) => {
            const active =
              tab.href === "/admin/members" ? pathname.startsWith("/admin") : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-foreground px-5 py-2.5 text-base font-semibold text-background"
                    : "rounded-full px-5 py-2.5 text-base font-medium text-zinc-600 hover:text-foreground"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a member-uploaded data: URL, not an optimizable remote image
          <img src={photoUrl} alt={displayName ?? ""} className="h-12 w-12 rounded-full border border-zinc-200 object-cover" />
        ) : (
          displayName && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-card text-base font-semibold text-zinc-500">
              {displayName.charAt(0)}
            </div>
          )
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
