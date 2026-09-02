import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const CompanyHealth = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
}

export const CompanyStatus = {
  ACTIVE: "ACTIVE",
  EXITED: "EXITED",
  WRITTEN_OFF: "WRITTEN_OFF",
  ARCHIVED: "ARCHIVED",
}

export const CompanyTrajectory = {
  IMPROVING: "IMPROVING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
}

export const ComplianceAuditType = {
  MANUAL_OVERRIDE: "MANUAL_OVERRIDE",
  SCHEDULED_SHARIAH_REVIEW: "SCHEDULED_SHARIAH_REVIEW",
  STRATEGIC_PIVOT_AUDIT: "STRATEGIC_PIVOT_AUDIT",
}

export const ComplianceStatus = {
  NON_HALAL: "NON_HALAL",
}

export const DealDocumentType = {
  PITCH_DECK: "PITCH_DECK",
  ADDITIONAL_DOCUMENT: "ADDITIONAL_DOCUMENT",
}

export const DealStage = {
  NEW: "NEW",
  LEAD: "LEAD",
  DUE_DILIGENCE: "DUE_DILIGENCE",
  PRESENTING: "PRESENTING",
  INVESTED: "INVESTED",
  PASSED: "PASSED",
  INACTIVE: "INACTIVE",
}

export const DocumentType = {
  PITCH_DECK: "PITCH_DECK",
  DD_REPORT: "DD_REPORT",
  DATA_ROOM: "DATA_ROOM",
  COMPANY_UPDATE_DOC: "COMPANY_UPDATE_DOC",
  SPA: "SPA",
  ALLOCATION_SCHEDULE: "ALLOCATION_SCHEDULE",
}

export const ExitType = {
  ACQUISITION: "ACQUISITION",
  IPO: "IPO",
  MERGER: "MERGER",
  SHUTDOWN: "SHUTDOWN",
  DISSOLUTION: "DISSOLUTION",
}

export const FundingRound = {
  PRE_SEED: "PRE_SEED",
  SEED: "SEED",
  SERIES_A: "SERIES_A",
  OTHER: "OTHER",
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

export const MembershipType = {
  BOARD_MEMBER: "BOARD_MEMBER",
  MEMBER: "MEMBER",
  ASSOCIATE: "ASSOCIATE",
  EMERITUS: "EMERITUS",
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

export const SecurityType = {
  PRICED_ROUND: "PRICED_ROUND",
  SAFE: "SAFE",
  CONVERTIBLE_NOTE: "CONVERTIBLE_NOTE",
  OTHER: "OTHER",
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

export const listAllocationsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllocationsForScenario', inputVars);
}
listAllocationsForScenarioRef.operationName = 'ListAllocationsForScenario';

export function listAllocationsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listAllocationsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

export const listPricedRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPricedRoundDetailsForScenario', inputVars);
}
listPricedRoundDetailsForScenarioRef.operationName = 'ListPricedRoundDetailsForScenario';

export function listPricedRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listPricedRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listSafeRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSafeRoundDetailsForScenario', inputVars);
}
listSafeRoundDetailsForScenarioRef.operationName = 'ListSafeRoundDetailsForScenario';

export function listSafeRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listSafeRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listNonParticipatingRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListNonParticipatingRoundDetailsForScenario', inputVars);
}
listNonParticipatingRoundDetailsForScenarioRef.operationName = 'ListNonParticipatingRoundDetailsForScenario';

export function listNonParticipatingRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listNonParticipatingRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listExitEventDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListExitEventDetailsForScenario', inputVars);
}
listExitEventDetailsForScenarioRef.operationName = 'ListExitEventDetailsForScenario';

export function listExitEventDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listExitEventDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listValuationAssessmentDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListValuationAssessmentDetailsForScenario', inputVars);
}
listValuationAssessmentDetailsForScenarioRef.operationName = 'ListValuationAssessmentDetailsForScenario';

export function listValuationAssessmentDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listValuationAssessmentDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listComplianceFlagDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListComplianceFlagDetailsForScenario', inputVars);
}
listComplianceFlagDetailsForScenarioRef.operationName = 'ListComplianceFlagDetailsForScenario';

export function listComplianceFlagDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listComplianceFlagDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

export const listMemberAllocationsAllScenariosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberAllocationsAllScenarios');
}
listMemberAllocationsAllScenariosRef.operationName = 'ListMemberAllocationsAllScenarios';

export function listMemberAllocationsAllScenarios(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberAllocationsAllScenariosRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMemberValuationsAllScenariosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberValuationsAllScenarios');
}
listMemberValuationsAllScenariosRef.operationName = 'ListMemberValuationsAllScenarios';

export function listMemberValuationsAllScenarios(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberValuationsAllScenariosRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listAllDocumentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllDocuments');
}
listAllDocumentsRef.operationName = 'ListAllDocuments';

export function listAllDocuments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllDocumentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

export const listCustomEventTypesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCustomEventTypes');
}
listCustomEventTypesRef.operationName = 'ListCustomEventTypes';

export function listCustomEventTypes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCustomEventTypesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listAiPromptSettingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAiPromptSettings');
}
listAiPromptSettingsRef.operationName = 'ListAiPromptSettings';

export function listAiPromptSettings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAiPromptSettingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listAppSettingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAppSettings');
}
listAppSettingsRef.operationName = 'ListAppSettings';

export function listAppSettings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAppSettingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listDealsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDeals');
}
listDealsRef.operationName = 'ListDeals';

export function listDeals(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getDealByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDealById', inputVars);
}
getDealByIdRef.operationName = 'GetDealById';

export function getDealById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getDealByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listDealTagsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealTags');
}
listDealTagsRef.operationName = 'ListDealTags';

export function listDealTags(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealTagsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listDealTagAssignmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealTagAssignments');
}
listDealTagAssignmentsRef.operationName = 'ListDealTagAssignments';

export function listDealTagAssignments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealTagAssignmentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listDealDocumentsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealDocumentsByDeal', inputVars);
}
listDealDocumentsByDealRef.operationName = 'ListDealDocumentsByDeal';

export function listDealDocumentsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealDocumentsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listDealRatingsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealRatingsByDeal', inputVars);
}
listDealRatingsByDealRef.operationName = 'ListDealRatingsByDeal';

export function listDealRatingsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealRatingsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

