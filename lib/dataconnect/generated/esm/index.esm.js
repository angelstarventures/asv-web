import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const CompanyHealth = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
}

export const CompanyTrajectory = {
  IMPROVING: "IMPROVING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
}

export const LedgerEntryType = {
  PARTICIPATING_PRICED_ROUND: "PARTICIPATING_PRICED_ROUND",
  PARTICIPATING_SAFE_ROUND: "PARTICIPATING_SAFE_ROUND",
  NON_PARTICIPATING_ROUND: "NON_PARTICIPATING_ROUND",
  EXIT_EVENT: "EXIT_EVENT",
  TRANSACTION_VALUATION_CHANGE: "TRANSACTION_VALUATION_CHANGE",
  INTERNAL_VALUATION_ASSESSMENT: "INTERNAL_VALUATION_ASSESSMENT",
  COMPLIANCE_FLAG_CHANGE: "COMPLIANCE_FLAG_CHANGE",
  COMPANY_UPDATE: "COMPANY_UPDATE",
  CUSTOM: "CUSTOM",
}

export const MemberStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
}

export const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
}

export const Scenario = {
  OPTIMISTIC: "OPTIMISTIC",
  BALANCED: "BALANCED",
  CONSERVATIVE: "CONSERVATIVE",
}

export const connectorConfig = {
  connector: 'asv-connector',
  service: 'asv-tracker',
  location: 'us-east1'
};
export const insertCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertCompany', inputVars);
}
insertCompanyRef.operationName = 'InsertCompany';

export function insertCompany(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertCompanyRef(dcInstance, inputVars));
}

export const listCompaniesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanies');
}
listCompaniesRef.operationName = 'ListCompanies';

export function listCompanies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCompaniesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMemberProfilesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberProfiles');
}
listMemberProfilesRef.operationName = 'ListMemberProfiles';

export function listMemberProfiles(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberProfilesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getPortfolioRollupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPortfolioRollup', inputVars);
}
getPortfolioRollupRef.operationName = 'GetPortfolioRollup';

export function getPortfolioRollup(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getPortfolioRollupRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listCompanyRollupsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanyRollups', inputVars);
}
listCompanyRollupsRef.operationName = 'ListCompanyRollups';

export function listCompanyRollups(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listCompanyRollupsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listCompanyUpdatesForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanyUpdatesForScenario', inputVars);
}
listCompanyUpdatesForScenarioRef.operationName = 'ListCompanyUpdatesForScenario';

export function listCompanyUpdatesForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listCompanyUpdatesForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listLedgerEntriesForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLedgerEntriesForScenario', inputVars);
}
listLedgerEntriesForScenarioRef.operationName = 'ListLedgerEntriesForScenario';

export function listLedgerEntriesForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listLedgerEntriesForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMemberAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberAllocations', inputVars);
}
listMemberAllocationsRef.operationName = 'ListMemberAllocations';

export function listMemberAllocations(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMemberAllocationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMemberValuationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberValuations', inputVars);
}
listMemberValuationsRef.operationName = 'ListMemberValuations';

export function listMemberValuations(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMemberValuationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMemberByAuthUidRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMemberByAuthUid', inputVars);
}
getMemberByAuthUidRef.operationName = 'GetMemberByAuthUid';

export function getMemberByAuthUid(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMemberByAuthUidRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listAllMembersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMembers');
}
listAllMembersRef.operationName = 'ListAllMembers';

export function listAllMembers(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMembersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMemberByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMemberById', inputVars);
}
getMemberByIdRef.operationName = 'GetMemberById';

export function getMemberById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMemberByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

