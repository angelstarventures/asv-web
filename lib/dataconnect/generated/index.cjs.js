const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const CompanyHealth = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
}
exports.CompanyHealth = CompanyHealth;

const CompanyTrajectory = {
  IMPROVING: "IMPROVING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
}
exports.CompanyTrajectory = CompanyTrajectory;

const LedgerEntryType = {
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
exports.LedgerEntryType = LedgerEntryType;

const MemberStatus = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
}
exports.MemberStatus = MemberStatus;

const Role = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
}
exports.Role = Role;

const Scenario = {
  OPTIMISTIC: "OPTIMISTIC",
  BALANCED: "BALANCED",
  CONSERVATIVE: "CONSERVATIVE",
}
exports.Scenario = Scenario;

const connectorConfig = {
  connector: 'asv-connector',
  service: 'asv-tracker',
  location: 'us-east1'
};
exports.connectorConfig = connectorConfig;

const insertCompanyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertCompany', inputVars);
}
insertCompanyRef.operationName = 'InsertCompany';
exports.insertCompanyRef = insertCompanyRef;

exports.insertCompany = function insertCompany(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(insertCompanyRef(dcInstance, inputVars));
}
;

const listCompaniesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanies');
}
listCompaniesRef.operationName = 'ListCompanies';
exports.listCompaniesRef = listCompaniesRef;

exports.listCompanies = function listCompanies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCompaniesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMemberProfilesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberProfiles');
}
listMemberProfilesRef.operationName = 'ListMemberProfiles';
exports.listMemberProfilesRef = listMemberProfilesRef;

exports.listMemberProfiles = function listMemberProfiles(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberProfilesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getPortfolioRollupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPortfolioRollup', inputVars);
}
getPortfolioRollupRef.operationName = 'GetPortfolioRollup';
exports.getPortfolioRollupRef = getPortfolioRollupRef;

exports.getPortfolioRollup = function getPortfolioRollup(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getPortfolioRollupRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCompanyRollupsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanyRollups', inputVars);
}
listCompanyRollupsRef.operationName = 'ListCompanyRollups';
exports.listCompanyRollupsRef = listCompanyRollupsRef;

exports.listCompanyRollups = function listCompanyRollups(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listCompanyRollupsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCompanyUpdatesForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanyUpdatesForScenario', inputVars);
}
listCompanyUpdatesForScenarioRef.operationName = 'ListCompanyUpdatesForScenario';
exports.listCompanyUpdatesForScenarioRef = listCompanyUpdatesForScenarioRef;

exports.listCompanyUpdatesForScenario = function listCompanyUpdatesForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listCompanyUpdatesForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLedgerEntriesForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLedgerEntriesForScenario', inputVars);
}
listLedgerEntriesForScenarioRef.operationName = 'ListLedgerEntriesForScenario';
exports.listLedgerEntriesForScenarioRef = listLedgerEntriesForScenarioRef;

exports.listLedgerEntriesForScenario = function listLedgerEntriesForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listLedgerEntriesForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMemberAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberAllocations', inputVars);
}
listMemberAllocationsRef.operationName = 'ListMemberAllocations';
exports.listMemberAllocationsRef = listMemberAllocationsRef;

exports.listMemberAllocations = function listMemberAllocations(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMemberAllocationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMemberValuationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberValuations', inputVars);
}
listMemberValuationsRef.operationName = 'ListMemberValuations';
exports.listMemberValuationsRef = listMemberValuationsRef;

exports.listMemberValuations = function listMemberValuations(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMemberValuationsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMemberByAuthUidRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMemberByAuthUid', inputVars);
}
getMemberByAuthUidRef.operationName = 'GetMemberByAuthUid';
exports.getMemberByAuthUidRef = getMemberByAuthUidRef;

exports.getMemberByAuthUid = function getMemberByAuthUid(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMemberByAuthUidRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listAllMembersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMembers');
}
listAllMembersRef.operationName = 'ListAllMembers';
exports.listAllMembersRef = listAllMembersRef;

exports.listAllMembers = function listAllMembers(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMembersRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMemberByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMemberById', inputVars);
}
getMemberByIdRef.operationName = 'GetMemberById';
exports.getMemberByIdRef = getMemberByIdRef;

exports.getMemberById = function getMemberById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMemberByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCustomEventTypesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCustomEventTypes');
}
listCustomEventTypesRef.operationName = 'ListCustomEventTypes';
exports.listCustomEventTypesRef = listCustomEventTypesRef;

exports.listCustomEventTypes = function listCustomEventTypes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCustomEventTypesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
