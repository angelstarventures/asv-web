import { Suspense } from "react";
import { ManageLedgerTable } from "@/components/ManageLedgerTable";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import type { Scenario as ScenarioParam } from "@/lib/scenarioTypes";

export const dynamic = "force-dynamic";

export default async function ManageLedgerPage() {
  // Same enforcement as /member/dashboard's lockedScenario handling: a site-admin-set
  // "simplified view" on the VIEWER's own Member row restricts them to one scenario
  // everywhere, including this admin tool — not just the member-facing pages.
  const member = await getCurrentMember();
  const memberRow = member ? (await getMemberById({ id: member.memberId })).member : null;
  const lockedScenario = (memberRow?.lockedScenario?.toLowerCase() ?? "") as ScenarioParam | "";

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Manage ledger</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        {lockedScenario
          ? `Every ledger entry for the ${lockedScenario} scenario (your account is locked to it).`
          : "Every ledger entry, across every scenario."}{" "}
        Editing replaces an entry entirely with edited JSON (validated the same way as recording
        a new entry); deleting removes it and its allocations/valuations permanently.
      </p>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <ManageLedgerTable lockedScenario={lockedScenario || undefined} />
      </Suspense>
    </div>
  );
}
