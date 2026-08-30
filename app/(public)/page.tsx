import Link from "next/link";
import { listCompanies, listMemberProfiles } from "@/lib/dataconnect/client";
import { LandingTabs } from "@/components/LandingTabs";

// Live portfolio/member data, not a build-time snapshot — no SWR/caching layer at V1 scale
// (plan §4), so render fresh on every request rather than baking a stale prerender.
export const dynamic = "force-dynamic";

// Wireframe 1: Welcome / Board & Member profiles / Portfolio companies tabs. Portfolio
// companies deliberately selects only name+sector (ListCompanies never touches financial
// fields), so nothing sensitive reaches this unauthenticated bundle (plan §4). Pitch link is
// omitted entirely for V1, not just greyed out.
export default async function LandingPage() {
  const [{ members }, { companies }] = await Promise.all([listMemberProfiles(), listCompanies()]);

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <LandingTabs members={members} companies={companies} />
      <Link
        href="/login"
        className="mt-4 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Member sign in
      </Link>
    </div>
  );
}
