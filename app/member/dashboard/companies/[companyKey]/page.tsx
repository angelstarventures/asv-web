import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { Scenario, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { getCompanyDetail } from "@/lib/portfolioView";
import { CompanyDetailView } from "@/components/CompanyDetailView";

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

// Dedicated company profile page, replacing the old flat event-history list — per the
// Portfolio tab's Details sub-tab, clicking a company name lands here instead of a popup.
export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const { companyKey } = await params;
  const search = await searchParams;
  const { member: memberRow } = await getMemberById({ id: member.memberId });
  const lockedScenario = (memberRow?.lockedScenario?.toLowerCase() ?? "") as ScenarioParam | "";
  const scenario = lockedScenario ? Scenario[lockedScenario.toUpperCase() as keyof typeof Scenario] : parseScenario(search.scenario);
  const scope = parseScope(search.scope);

  const detail = await getCompanyDetail(scenario, companyKey, scope, scope === "mine" ? member.authUid : undefined);
  if (!detail) redirect("/member/dashboard?tab=details");

  return <CompanyDetailView detail={detail} scope={scope} backHref="/member/dashboard?tab=details" />;
}
