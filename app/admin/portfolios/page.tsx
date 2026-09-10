import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { listAllMembers } from "@/lib/dataconnect/client";
import { Scenario, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { MemberPortfolioPicker } from "@/components/MemberPortfolioPicker";
import { PortfolioView } from "@/lib/portfolioView";
import { parsePortfolioTab } from "@/lib/portfolioTab";

export const dynamic = "force-dynamic";

function parseScenario(value: string | string[] | undefined): ScenarioType {
  const v = Array.isArray(value) ? value[0] : value;
  return (SCENARIOS as readonly string[]).includes(v ?? "")
    ? (Scenario[(v as ScenarioParam).toUpperCase() as keyof typeof Scenario])
    : Scenario.BALANCED;
}

function parseScope(value: string | string[] | undefined): Scope {
  const v = Array.isArray(value) ? value[0] : value;
  return (SCOPES as readonly string[]).includes(v ?? "") ? (v as Scope) : "mine";
}

// Root-mode-only: lets a site-admin pick any member and see their portfolio exactly as they'd
// see it, reusing lib/portfolioView.tsx's PortfolioView (same component /member/dashboard uses)
// with the picked member's authUid instead of the viewer's own — see that file's header comment
// for how the underlying queries support impersonating any authUid from trusted server code.
// proxy.ts already redirects non-root-mode requests away from this whole route; the check here
// is defense in depth for direct navigation/back-button edge cases within the same request.
export default async function AdminPortfoliosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentMember();
  if (!isSiteAdminModeOn(current?.role, current?.siteAdminMode)) {
    redirect("/admin/members");
  }

  const params = await searchParams;
  const scope = parseScope(params.scope);
  const tab = parsePortfolioTab(params.tab);
  const selectedId = typeof params.memberId === "string" ? params.memberId : undefined;

  const { members } = await listAllMembers();
  const selectedMember = selectedId ? members.find((m) => m.id === selectedId) : undefined;

  // Same "locked scenario overrides the URL param" enforcement as /member/dashboard, using the
  // SELECTED member's own lock — viewing-as should show exactly what they'd see, not what the
  // site-admin's own scenario preference would be.
  const lockedScenario = (selectedMember?.lockedScenario?.toLowerCase() ?? "") as ScenarioParam | "";
  const scenario = lockedScenario
    ? Scenario[lockedScenario.toUpperCase() as keyof typeof Scenario]
    : parseScenario(params.scenario);

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Member portfolios</h1>
      <MemberPortfolioPicker
        members={members.map((m) => ({ id: m.id, displayName: m.displayName, authUid: m.authUid ?? null }))}
        selectedId={selectedId}
      />

      {selectedMember && !selectedMember.authUid && (
        <p className="text-sm text-zinc-500">
          {selectedMember.displayName} hasn&apos;t linked an account yet — there&apos;s no portfolio view
          available for them until they do.
        </p>
      )}

      {selectedMember?.authUid && (
        <>
          <WelcomeBanner subtitle={`Viewing as ${selectedMember.displayName}`} />
          <PortfolioView
            authUid={selectedMember.authUid}
            scope={scope}
            scenario={scenario}
            lockedScenario={lockedScenario}
            aiChatEnabled={selectedMember.aiChatEnabled}
            tab={tab}
            detailHrefBase="/admin/portfolios/companies"
            detailExtraQuery={`&memberId=${selectedMember.id}`}
          />
        </>
      )}
    </div>
  );
}
