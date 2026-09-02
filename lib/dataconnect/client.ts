import "server-only";
import { getDataConnect, type ConnectorConfig, type OperationOptions } from "firebase-admin/data-connect";
import { adminApp } from "@/lib/firebase/admin";
import {
  connectorConfig,
  listCompaniesRef,
  listMemberProfilesRef,
  getPortfolioRollupRef,
  listCompanyRollupsRef,
  listCompanyUpdatesForScenarioRef,
  listLedgerEntriesForScenarioRef,
  listAllocationsForScenarioRef,
  listPricedRoundDetailsForScenarioRef,
  listSafeRoundDetailsForScenarioRef,
  listNonParticipatingRoundDetailsForScenarioRef,
  listExitEventDetailsForScenarioRef,
  listValuationAssessmentDetailsForScenarioRef,
  listComplianceFlagDetailsForScenarioRef,
  listMemberAllocationsRef,
  listMemberValuationsRef,
  getMemberByAuthUidRef,
  listAllMembersRef,
  getMemberByIdRef,
  listCustomEventTypesRef,
  listMemberAllocationsAllScenariosRef,
  listMemberValuationsAllScenariosRef,
  listAllDocumentsRef,
  listAiPromptSettingsRef,
  listAppSettingsRef,
  getDealByIdRef,
  listDealsRef,
  listDealTagsRef,
  listDealTagAssignmentsRef,
  listDealDocumentsByDealRef,
  listDealRatingsByDealRef,
  type ListCompaniesData,
  type ListMemberProfilesData,
  type GetPortfolioRollupData,
  type GetPortfolioRollupVariables,
  type ListCompanyRollupsData,
  type ListCompanyRollupsVariables,
  type ListCompanyUpdatesForScenarioData,
  type ListCompanyUpdatesForScenarioVariables,
  type ListLedgerEntriesForScenarioData,
  type ListLedgerEntriesForScenarioVariables,
  type ListAllocationsForScenarioData,
  type ListAllocationsForScenarioVariables,
  type ListPricedRoundDetailsForScenarioData,
  type ListPricedRoundDetailsForScenarioVariables,
  type ListSafeRoundDetailsForScenarioData,
  type ListSafeRoundDetailsForScenarioVariables,
  type ListNonParticipatingRoundDetailsForScenarioData,
  type ListNonParticipatingRoundDetailsForScenarioVariables,
  type ListExitEventDetailsForScenarioData,
  type ListExitEventDetailsForScenarioVariables,
  type ListValuationAssessmentDetailsForScenarioData,
  type ListValuationAssessmentDetailsForScenarioVariables,
  type ListComplianceFlagDetailsForScenarioData,
  type ListComplianceFlagDetailsForScenarioVariables,
  type ListMemberAllocationsData,
  type ListMemberAllocationsVariables,
  type ListMemberValuationsData,
  type ListMemberValuationsVariables,
  type GetMemberByAuthUidData,
  type GetMemberByAuthUidVariables,
  type ListAllMembersData,
  type GetMemberByIdData,
  type GetMemberByIdVariables,
  type ListCustomEventTypesData,
  type ListMemberAllocationsAllScenariosData,
  type ListMemberValuationsAllScenariosData,
  type ListAllDocumentsData,
  type ListAiPromptSettingsData,
  type ListAppSettingsData,
  type GetDealByIdData,
  type GetDealByIdVariables,
  type ListDealsData,
  type ListDealTagsData,
  type ListDealTagAssignmentsData,
  type ListDealDocumentsByDealData,
  type ListDealDocumentsByDealVariables,
  type ListDealRatingsByDealData,
  type ListDealRatingsByDealVariables,
} from "./generated";

// Every read path below runs server-side via firebase-admin/data-connect, which executes
// with admin trust and ignores the @auth directives in connector/queries.gql entirely — the
// directives are declared anyway as defense-in-depth/documentation of intent (see the note
// in queries.gql). Real authorization happens in each caller: deriving memberId from the
// verified session (lib/auth/currentMember.ts) and checking role, never trusting a
// client-supplied parameter (plan §3, Data isolation).
//
// executeQuery(name, ...) looks up the operation by name from the *deployed* connector, so
// any query added to queries.gql must be pushed with `firebase deploy --only dataconnect`
// before it's callable here.
//
// listMember{Allocations,Valuations}[AllScenarios] are a step further: they no longer accept
// a memberId variable at all (a confirmed IDOR — see the eq_expr note in queries.gql). Those
// queries filter via `member: { authUid: { eq_expr: "auth.uid" } }`, so this Admin SDK path
// must supply `impersonate: { authClaims: { sub: authUid } }` using the session-verified
// authUid (never a client-supplied one) for the filter to resolve to anything at all.

const adminConnectorConfig: ConnectorConfig = {
  location: connectorConfig.location,
  serviceId: connectorConfig.service,
  connector: connectorConfig.connector,
};

function dc() {
  return getDataConnect(adminConnectorConfig, adminApp);
}

function impersonate(authUid: string): OperationOptions {
  return { impersonate: { authClaims: { sub: authUid } } };
}

export async function listCompanies(): Promise<ListCompaniesData> {
  const res = await dc().executeQuery<ListCompaniesData>(listCompaniesRef.operationName);
  return res.data;
}

export async function listMemberProfiles(): Promise<ListMemberProfilesData> {
  const res = await dc().executeQuery<ListMemberProfilesData>(listMemberProfilesRef.operationName);
  return res.data;
}

export async function getPortfolioRollup(
  vars: GetPortfolioRollupVariables
): Promise<GetPortfolioRollupData> {
  const res = await dc().executeQuery<GetPortfolioRollupData, GetPortfolioRollupVariables>(
    getPortfolioRollupRef.operationName,
    vars
  );
  return res.data;
}

export async function listCompanyRollups(
  vars: ListCompanyRollupsVariables
): Promise<ListCompanyRollupsData> {
  const res = await dc().executeQuery<ListCompanyRollupsData, ListCompanyRollupsVariables>(
    listCompanyRollupsRef.operationName,
    vars
  );
  return res.data;
}

export async function listCompanyUpdatesForScenario(
  vars: ListCompanyUpdatesForScenarioVariables
): Promise<ListCompanyUpdatesForScenarioData> {
  const res = await dc().executeQuery<
    ListCompanyUpdatesForScenarioData,
    ListCompanyUpdatesForScenarioVariables
  >(listCompanyUpdatesForScenarioRef.operationName, vars);
  return res.data;
}

export async function listLedgerEntriesForScenario(
  vars: ListLedgerEntriesForScenarioVariables
): Promise<ListLedgerEntriesForScenarioData> {
  const res = await dc().executeQuery<
    ListLedgerEntriesForScenarioData,
    ListLedgerEntriesForScenarioVariables
  >(listLedgerEntriesForScenarioRef.operationName, vars);
  return res.data;
}

export async function listAllocationsForScenario(
  vars: ListAllocationsForScenarioVariables
): Promise<ListAllocationsForScenarioData> {
  const res = await dc().executeQuery<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>(
    listAllocationsForScenarioRef.operationName,
    vars
  );
  return res.data;
}

export async function listPricedRoundDetailsForScenario(
  vars: ListPricedRoundDetailsForScenarioVariables
): Promise<ListPricedRoundDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListPricedRoundDetailsForScenarioData,
    ListPricedRoundDetailsForScenarioVariables
  >(listPricedRoundDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listSafeRoundDetailsForScenario(
  vars: ListSafeRoundDetailsForScenarioVariables
): Promise<ListSafeRoundDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListSafeRoundDetailsForScenarioData,
    ListSafeRoundDetailsForScenarioVariables
  >(listSafeRoundDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listNonParticipatingRoundDetailsForScenario(
  vars: ListNonParticipatingRoundDetailsForScenarioVariables
): Promise<ListNonParticipatingRoundDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListNonParticipatingRoundDetailsForScenarioData,
    ListNonParticipatingRoundDetailsForScenarioVariables
  >(listNonParticipatingRoundDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listExitEventDetailsForScenario(
  vars: ListExitEventDetailsForScenarioVariables
): Promise<ListExitEventDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListExitEventDetailsForScenarioData,
    ListExitEventDetailsForScenarioVariables
  >(listExitEventDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listValuationAssessmentDetailsForScenario(
  vars: ListValuationAssessmentDetailsForScenarioVariables
): Promise<ListValuationAssessmentDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListValuationAssessmentDetailsForScenarioData,
    ListValuationAssessmentDetailsForScenarioVariables
  >(listValuationAssessmentDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listComplianceFlagDetailsForScenario(
  vars: ListComplianceFlagDetailsForScenarioVariables
): Promise<ListComplianceFlagDetailsForScenarioData> {
  const res = await dc().executeQuery<
    ListComplianceFlagDetailsForScenarioData,
    ListComplianceFlagDetailsForScenarioVariables
  >(listComplianceFlagDetailsForScenarioRef.operationName, vars);
  return res.data;
}

export async function listMemberAllocations(
  authUid: string,
  vars: ListMemberAllocationsVariables
): Promise<ListMemberAllocationsData> {
  const res = await dc().executeQuery<ListMemberAllocationsData, ListMemberAllocationsVariables>(
    listMemberAllocationsRef.operationName,
    vars,
    impersonate(authUid)
  );
  return res.data;
}

export async function listMemberValuations(
  authUid: string,
  vars: ListMemberValuationsVariables
): Promise<ListMemberValuationsData> {
  const res = await dc().executeQuery<ListMemberValuationsData, ListMemberValuationsVariables>(
    listMemberValuationsRef.operationName,
    vars,
    impersonate(authUid)
  );
  return res.data;
}

export async function getMemberByAuthUid(
  vars: GetMemberByAuthUidVariables
): Promise<GetMemberByAuthUidData> {
  const res = await dc().executeQuery<GetMemberByAuthUidData, GetMemberByAuthUidVariables>(
    getMemberByAuthUidRef.operationName,
    vars
  );
  return res.data;
}

export async function listAllMembers(): Promise<ListAllMembersData> {
  const res = await dc().executeQuery<ListAllMembersData>(listAllMembersRef.operationName);
  return res.data;
}

export async function getMemberById(vars: GetMemberByIdVariables): Promise<GetMemberByIdData> {
  const res = await dc().executeQuery<GetMemberByIdData, GetMemberByIdVariables>(
    getMemberByIdRef.operationName,
    vars
  );
  return res.data;
}

export async function listCustomEventTypes(): Promise<ListCustomEventTypesData> {
  const res = await dc().executeQuery<ListCustomEventTypesData>(listCustomEventTypesRef.operationName);
  return res.data;
}

export async function listMemberAllocationsAllScenarios(
  authUid: string
): Promise<ListMemberAllocationsAllScenariosData> {
  // executeQuery's runtime signature is always (name, variables, options) — despite the .d.ts
  // *looking* overloaded, there's no true 2-arg runtime form. Passing the options object as
  // the 2nd positional arg sends it as GraphQL *variables* instead (confirmed empirically:
  // the connector rejected it with "$impersonate is not expected", since this operation
  // declares no variables at all). `undefined` variables is required here.
  const res = await dc().executeQuery<ListMemberAllocationsAllScenariosData, undefined>(
    listMemberAllocationsAllScenariosRef.operationName,
    undefined,
    impersonate(authUid)
  );
  return res.data;
}

export async function listMemberValuationsAllScenarios(
  authUid: string
): Promise<ListMemberValuationsAllScenariosData> {
  const res = await dc().executeQuery<ListMemberValuationsAllScenariosData, undefined>(
    listMemberValuationsAllScenariosRef.operationName,
    undefined,
    impersonate(authUid)
  );
  return res.data;
}

export async function listAllDocuments(): Promise<ListAllDocumentsData> {
  const res = await dc().executeQuery<ListAllDocumentsData>(listAllDocumentsRef.operationName);
  return res.data;
}

export async function listAiPromptSettings(): Promise<ListAiPromptSettingsData> {
  const res = await dc().executeQuery<ListAiPromptSettingsData>(listAiPromptSettingsRef.operationName);
  return res.data;
}

export async function listAppSettings(): Promise<ListAppSettingsData> {
  const res = await dc().executeQuery<ListAppSettingsData>(listAppSettingsRef.operationName);
  return res.data;
}

export async function getDealById(vars: GetDealByIdVariables): Promise<GetDealByIdData> {
  const res = await dc().executeQuery<GetDealByIdData, GetDealByIdVariables>(
    getDealByIdRef.operationName,
    vars
  );
  return res.data;
}

export async function listDeals(): Promise<ListDealsData> {
  const res = await dc().executeQuery<ListDealsData>(listDealsRef.operationName);
  return res.data;
}

export async function listDealTags(): Promise<ListDealTagsData> {
  const res = await dc().executeQuery<ListDealTagsData>(listDealTagsRef.operationName);
  return res.data;
}

export async function listDealTagAssignments(): Promise<ListDealTagAssignmentsData> {
  const res = await dc().executeQuery<ListDealTagAssignmentsData>(listDealTagAssignmentsRef.operationName);
  return res.data;
}

export async function listDealDocumentsByDeal(
  vars: ListDealDocumentsByDealVariables
): Promise<ListDealDocumentsByDealData> {
  const res = await dc().executeQuery<ListDealDocumentsByDealData, ListDealDocumentsByDealVariables>(
    listDealDocumentsByDealRef.operationName,
    vars
  );
  return res.data;
}

export async function listDealRatingsByDeal(
  vars: ListDealRatingsByDealVariables
): Promise<ListDealRatingsByDealData> {
  const res = await dc().executeQuery<ListDealRatingsByDealData, ListDealRatingsByDealVariables>(
    listDealRatingsByDealRef.operationName,
    vars
  );
  return res.data;
}
