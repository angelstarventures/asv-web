import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { Scenario, type Scenario as ScenarioType } from "@/lib/dataconnect/generated";
import { SCENARIOS, SCOPES, type Scenario as ScenarioParam, type Scope } from "@/lib/scenarioTypes";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";
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

// Admin "view as member" twin of app/member/dashboard/companies/[companyKey] — same
// getCompanyDetail call, just its own route so the back link returns to /admin/portfolios
// instead of /member/dashboard, and "mine" scope resolves the SELECTED member's authUid
// (via ?memberId=) rather than the site-admin's own.
export default async function AdminCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentMember();
  if (!isSiteAdminModeOn(current?.role, current?.siteAdminMode)) {
    redirect("/admin/members");
  }

  const { companyKey } = await params;
  const search = await searchParams;
  const scenario = parseScenario(search.scenario);
  const scope = parseScope(search.scope);
  const memberId = typeof search.memberId === "string" ? search.memberId : undefined;

  let authUid: string | undefined;
  if (scope === "mine" && memberId) {
    const { member } = await getMemberById({ id: memberId });
    authUid = member?.authUid ?? undefined;
  }

  const detail = await getCompanyDetail(scenario, companyKey, scope, authUid);
  if (!detail) redirect(`/admin/portfolios?tab=details${memberId ? `&memberId=${memberId}` : ""}`);

  return (
    <CompanyDetailView
      detail={detail}
      scope={scope}
      backHref={`/admin/portfolios?tab=details${memberId ? `&memberId=${memberId}` : ""}`}
    />
  );
}
