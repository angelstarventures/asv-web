import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";

// proxy.ts independently re-verifies role === 'admin' on every /admin/* request — this
// layout is UI chrome only (plan §4).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <span className="text-sm font-medium">ASV Admin</span>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
