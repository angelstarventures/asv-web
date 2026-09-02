import type { ReactNode } from "react";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";

// "Welcome back, {name}!" banner for the top of a signed-in landing page (member dashboard,
// admin members). Fetches its own data so any page can drop it in without prop-drilling the
// current member down from its layout.
export async function WelcomeBanner({ subtitle, cta }: { subtitle: string; cta?: ReactNode }) {
  const current = await getCurrentMember();
  if (!current) return null;
  const { member } = await getMemberById({ id: current.memberId });
  if (!member) return null;

  const firstName = member.displayName.split(" ")[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {firstName}!</h1>
        <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      </div>
      {cta}
    </div>
  );
}
