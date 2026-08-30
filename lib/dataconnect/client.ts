import "server-only";
import { getDataConnect, type ConnectorConfig } from "firebase-admin/data-connect";
import { adminApp } from "@/lib/firebase/admin";
import {
  connectorConfig,
  listCompaniesRef,
  listMemberProfilesRef,
  getPortfolioRollupRef,
  listCompanyRollupsRef,
  listCompanyUpdatesForScenarioRef,
  listLedgerEntriesForScenarioRef,
  listMemberAllocationsRef,
  listMemberValuationsRef,
  getMemberByAuthUidRef,
  listAllMembersRef,
  getMemberByIdRef,
  listCustomEventTypesRef,
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

const adminConnectorConfig: ConnectorConfig = {
  location: connectorConfig.location,
  serviceId: connectorConfig.service,
  connector: connectorConfig.connector,
};

function dc() {
  return getDataConnect(adminConnectorConfig, adminApp);
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

export async function listMemberAllocations(
  vars: ListMemberAllocationsVariables
): Promise<ListMemberAllocationsData> {
  const res = await dc().executeQuery<ListMemberAllocationsData, ListMemberAllocationsVariables>(
    listMemberAllocationsRef.operationName,
    vars
  );
  return res.data;
}

export async function listMemberValuations(
  vars: ListMemberValuationsVariables
): Promise<ListMemberValuationsData> {
  const res = await dc().executeQuery<ListMemberValuationsData, ListMemberValuationsVariables>(
    listMemberValuationsRef.operationName,
    vars
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
