import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { Scenario, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { PortfolioView } from "@/lib/portfolioView";
import { parsePortfolioTab } from "@/lib/portfolioTab";

// Reads searchParams and the session cookie, so this is already dynamic — explicit for
// clarity (plan §4).
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

// Wireframe 3, merged with wireframe 2's portfolio charts (health mix, sector value) into
// the "All of ASV" scope: ?scope=mine|asv&scenario=optimistic|balanced|conservative in the
// URL (plan §4). The charts now follow the scenario toggle instead of being fixed to
// `balanced`. The actual rendering (stat tiles, charts, company table) lives in
// lib/portfolioView.tsx's PortfolioView, shared with app/admin/portfolios' "view as" page.
export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const tab = parsePortfolioTab(params.tab);

  const member = await getCurrentMember();
  if (!member) redirect("/login");

  // Site-admin-controlled simplified view (root mode, from the members table): a non-empty
  // lockedScenario overrides whatever ?scenario= the URL carries — enforced here, server-side,
  // not just by hiding the picker, since a member could otherwise still type the param into the
  // URL. Per-member now (Member.aiChatEnabled/lockedScenario), replacing the old per-role-tier
  // app_setting pair — always this VIEWER's own row, never anyone else's.
  const { member: memberRow } = await getMemberById({ id: member.memberId });
  const aiChatEnabled = memberRow?.aiChatEnabled ?? true;
  const lockedScenario = (memberRow?.lockedScenario?.toLowerCase() ?? "") as ScenarioParam | "";
  const scenario = lockedScenario ? Scenario[lockedScenario.toUpperCase() as keyof typeof Scenario] : parseScenario(params.scenario);

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <PortfolioView
        authUid={member.authUid}
        scope={scope}
        scenario={scenario}
        lockedScenario={lockedScenario}
        aiChatEnabled={aiChatEnabled}
        tab={tab}
        detailHrefBase="/member/dashboard/companies"
      />
    </div>
  );
}
