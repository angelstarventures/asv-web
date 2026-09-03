"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { HeaderMobileMenu } from "@/components/HeaderMobileMenu";

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
  displayName,
  photoUrl,
}: {
  isAdmin: boolean;
  displayName?: string;
  photoUrl?: string | null;
}) {
  const pathname = usePathname();
  const tabs = isAdmin ? [{ href: "/admin/members", label: "Admin" }, ...MEMBER_TABS] : MEMBER_TABS;
  const isTabActive = (href: string) =>
    href === "/admin/members" ? pathname.startsWith("/admin") : pathname.startsWith(href);

  return (
    <header className="relative flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-8 sm:py-6">
      <div className="flex items-center gap-4 sm:gap-8">
        <span className="rounded-md">
          <Image
            src="/asv-logo.png"
            alt="Angel Star Ventures"
            width={157}
            height={36}
            priority
            className="h-auto w-28 sm:w-[157px]"
          />
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
