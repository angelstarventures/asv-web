"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface PortfolioPickerMember {
  id: string;
  displayName: string;
  authUid: string | null;
}

// Root-mode-only "view as" picker (app/admin/portfolios) — swaps ?memberId= while preserving
// whatever ?scope=/?scenario= are already in the URL (same pattern as useScenario's setParams),
// so switching members mid-browse doesn't reset the scope/scenario toggle.
export function MemberPortfolioPicker({
  members,
  selectedId,
}: {
  members: PortfolioPickerMember[];
  selectedId: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("memberId", id);
    } else {
      params.delete("memberId");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      View portfolio as
      <select
        value={selectedId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">Select a member...</option>
        {[...members]
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((m) => (
          <option key={m.id} value={m.id} disabled={!m.authUid}>
            {m.displayName}
            {!m.authUid ? " (no linked account)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
