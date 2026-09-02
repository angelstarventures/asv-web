"use client";

import Image from "next/image";
import Link from "next/link";
import { LoginModal } from "@/components/LoginModal";

export type LandingTab = "welcome" | "profiles" | "companies" | "pitch";

const TAB_LABELS: Record<LandingTab, string> = {
  welcome: "Welcome",
  profiles: "Our Team",
  companies: "Portfolio",
  pitch: "Pitch to Us",
};

const HOME_TABS: ("welcome" | "profiles" | "companies")[] = ["welcome", "profiles", "companies"];

function pillClass(active: boolean): string {
  return active
    ? "rounded-full bg-foreground px-5 py-2.5 text-[16px] font-semibold text-background"
    : "rounded-full px-5 py-2.5 text-[16px] font-medium text-zinc-600 hover:text-foreground";
}

// Shared by the home page's in-page tab switcher (LandingTabs) and the standalone /pitch
// route, so both look like one continuous nav bar. On /pitch, the three home tabs are real
// links back to `/` (landing on the default Welcome tab) rather than client tab-switches,
// since /pitch is its own route with no shared client state to restore the exact prior tab —
// onSelectHomeTab is only passed by LandingTabs, where a fast in-page switch is possible.
export function LandingHeader({
  active,
  onSelectHomeTab,
}: {
  active: LandingTab;
  onSelectHomeTab?: (tab: "welcome" | "profiles" | "companies") => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-6">
      <div className="flex items-center gap-8">
        <Link href="/">
          <Image src="/asv-logo.png" alt="Angel Star Ventures" width={157} height={36} priority />
        </Link>
        <nav className="flex gap-1 rounded-full border border-zinc-200 bg-card p-1.5">
          {HOME_TABS.map((t) => {
            const isActive = active === t;
            return onSelectHomeTab ? (
              <button
                key={t}
                type="button"
                onClick={() => onSelectHomeTab(t)}
                aria-current={isActive ? "page" : undefined}
                className={pillClass(isActive)}
              >
                {TAB_LABELS[t]}
              </button>
            ) : (
              <Link key={t} href="/" aria-current={isActive ? "page" : undefined} className={pillClass(isActive)}>
                {TAB_LABELS[t]}
              </Link>
            );
          })}
          <Link href="/pitch" aria-current={active === "pitch" ? "page" : undefined} className={pillClass(active === "pitch")}>
            {TAB_LABELS.pitch}
          </Link>
        </nav>
      </div>
      <LoginModal />
    </header>
  );
}
