const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const CompanyHealth = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
}
exports.CompanyHealth = CompanyHealth;

const CompanyStatus = {
  ACTIVE: "ACTIVE",
  EXITED: "EXITED",
  WRITTEN_OFF: "WRITTEN_OFF",
  ARCHIVED: "ARCHIVED",
}
exports.CompanyStatus = CompanyStatus;

const CompanyTrajectory = {
  IMPROVING: "IMPROVING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
}
exports.CompanyTrajectory = CompanyTrajectory;

const ComplianceAuditType = {
  MANUAL_OVERRIDE: "MANUAL_OVERRIDE",
  SCHEDULED_SHARIAH_REVIEW: "SCHEDULED_SHARIAH_REVIEW",
  STRATEGIC_PIVOT_AUDIT: "STRATEGIC_PIVOT_AUDIT",
}
exports.ComplianceAuditType = ComplianceAuditType;

const ComplianceStatus = {
  NON_HALAL: "NON_HALAL",
}
exports.ComplianceStatus = ComplianceStatus;

const DealDocumentType = {
  PITCH_DECK: "PITCH_DECK",
  ADDITIONAL_DOCUMENT: "ADDITIONAL_DOCUMENT",
}
exports.DealDocumentType = DealDocumentType;

const DealStage = {
  NEW: "NEW",
  LEAD: "LEAD",
  DUE_DILIGENCE: "DUE_DILIGENCE",
  PRESENTING: "PRESENTING",
  INVESTED: "INVESTED",
  PASSED: "PASSED",
  INACTIVE: "INACTIVE",
  OLD: "OLD",
  ARCHIVED: "ARCHIVED",
}
exports.DealStage = DealStage;

const DocumentType = {
  PITCH_DECK: "PITCH_DECK",
  DD_REPORT: "DD_REPORT",
  DATA_ROOM: "DATA_ROOM",
  COMPANY_UPDATE_DOC: "COMPANY_UPDATE_DOC",
  SPA: "SPA",
  ALLOCATION_SCHEDULE: "ALLOCATION_SCHEDULE",
}
exports.DocumentType = DocumentType;

const ExitType = {
  ACQUISITION: "ACQUISITION",
  IPO: "IPO",
  MERGER: "MERGER",
  SHUTDOWN: "SHUTDOWN",
  DISSOLUTION: "DISSOLUTION",
}
exports.ExitType = ExitType;

const FundingRound = {
  FAMILY_AND_FRIENDS: "FAMILY_AND_FRIENDS",
  PRE_SEED: "PRE_SEED",
  SEED: "SEED",
  SERIES_A: "SERIES_A",
  SERIES_B: "SERIES_B",
  SERIES_C: "SERIES_C",
  OTHER: "OTHER",
}
exports.FundingRound = FundingRound;

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

const MembershipType = {
  BOARD_MEMBER: "BOARD_MEMBER",
  MEMBER: "MEMBER",
  ASSOCIATE: "ASSOCIATE",
  EMERITUS: "EMERITUS",
}
exports.MembershipType = MembershipType;

const Role = {
  DEVELOPER: "DEVELOPER",
  DEV_SITE_ADMIN: "DEV_SITE_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
}
exports.Role = Role;

const Scenario = {
  OPTIMISTIC: "OPTIMISTIC",
  BALANCED: "BALANCED",
  CONSERVATIVE: "CONSERVATIVE",
}
exports.Scenario = Scenario;

const SecurityType = {
  PRICED_ROUND: "PRICED_ROUND",
  SAFE: "SAFE",
  CONVERTIBLE_NOTE: "CONVERTIBLE_NOTE",
  OTHER: "OTHER",
}
exports.SecurityType = SecurityType;

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

const getCompanyByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCompanyById', inputVars);
}
getCompanyByIdRef.operationName = 'GetCompanyById';
exports.getCompanyByIdRef = getCompanyByIdRef;

exports.getCompanyById = function getCompanyById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCompanyByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listCompanyDdLeadsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCompanyDdLeads');
}
listCompanyDdLeadsRef.operationName = 'ListCompanyDdLeads';
exports.listCompanyDdLeadsRef = listCompanyDdLeadsRef;

exports.listCompanyDdLeads = function listCompanyDdLeads(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCompanyDdLeadsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

const listAllocationsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllocationsForScenario', inputVars);
}
listAllocationsForScenarioRef.operationName = 'ListAllocationsForScenario';
exports.listAllocationsForScenarioRef = listAllocationsForScenarioRef;

exports.listAllocationsForScenario = function listAllocationsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listAllocationsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

const listPricedRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPricedRoundDetailsForScenario', inputVars);
}
listPricedRoundDetailsForScenarioRef.operationName = 'ListPricedRoundDetailsForScenario';
exports.listPricedRoundDetailsForScenarioRef = listPricedRoundDetailsForScenarioRef;

exports.listPricedRoundDetailsForScenario = function listPricedRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listPricedRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSafeRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSafeRoundDetailsForScenario', inputVars);
}
listSafeRoundDetailsForScenarioRef.operationName = 'ListSafeRoundDetailsForScenario';
exports.listSafeRoundDetailsForScenarioRef = listSafeRoundDetailsForScenarioRef;

exports.listSafeRoundDetailsForScenario = function listSafeRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listSafeRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listNonParticipatingRoundDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListNonParticipatingRoundDetailsForScenario', inputVars);
}
listNonParticipatingRoundDetailsForScenarioRef.operationName = 'ListNonParticipatingRoundDetailsForScenario';
exports.listNonParticipatingRoundDetailsForScenarioRef = listNonParticipatingRoundDetailsForScenarioRef;

exports.listNonParticipatingRoundDetailsForScenario = function listNonParticipatingRoundDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listNonParticipatingRoundDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listExitEventDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListExitEventDetailsForScenario', inputVars);
}
listExitEventDetailsForScenarioRef.operationName = 'ListExitEventDetailsForScenario';
exports.listExitEventDetailsForScenarioRef = listExitEventDetailsForScenarioRef;

exports.listExitEventDetailsForScenario = function listExitEventDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listExitEventDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listValuationAssessmentDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListValuationAssessmentDetailsForScenario', inputVars);
}
listValuationAssessmentDetailsForScenarioRef.operationName = 'ListValuationAssessmentDetailsForScenario';
exports.listValuationAssessmentDetailsForScenarioRef = listValuationAssessmentDetailsForScenarioRef;

exports.listValuationAssessmentDetailsForScenario = function listValuationAssessmentDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listValuationAssessmentDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listComplianceFlagDetailsForScenarioRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListComplianceFlagDetailsForScenario', inputVars);
}
listComplianceFlagDetailsForScenarioRef.operationName = 'ListComplianceFlagDetailsForScenario';
exports.listComplianceFlagDetailsForScenarioRef = listComplianceFlagDetailsForScenarioRef;

exports.listComplianceFlagDetailsForScenario = function listComplianceFlagDetailsForScenario(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listComplianceFlagDetailsForScenarioRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

const listMemberAllocationsAllScenariosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberAllocationsAllScenarios');
}
listMemberAllocationsAllScenariosRef.operationName = 'ListMemberAllocationsAllScenarios';
exports.listMemberAllocationsAllScenariosRef = listMemberAllocationsAllScenariosRef;

exports.listMemberAllocationsAllScenarios = function listMemberAllocationsAllScenarios(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberAllocationsAllScenariosRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMemberValuationsAllScenariosRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMemberValuationsAllScenarios');
}
listMemberValuationsAllScenariosRef.operationName = 'ListMemberValuationsAllScenarios';
exports.listMemberValuationsAllScenariosRef = listMemberValuationsAllScenariosRef;

exports.listMemberValuationsAllScenarios = function listMemberValuationsAllScenarios(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMemberValuationsAllScenariosRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listAllDocumentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllDocuments');
}
listAllDocumentsRef.operationName = 'ListAllDocuments';
exports.listAllDocumentsRef = listAllDocumentsRef;

exports.listAllDocuments = function listAllDocuments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllDocumentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getDocumentByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDocumentById', inputVars);
}
getDocumentByIdRef.operationName = 'GetDocumentById';
exports.getDocumentByIdRef = getDocumentByIdRef;

exports.getDocumentById = function getDocumentById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getDocumentByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listAllTaxDocumentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllTaxDocuments');
}
listAllTaxDocumentsRef.operationName = 'ListAllTaxDocuments';
exports.listAllTaxDocumentsRef = listAllTaxDocumentsRef;

exports.listAllTaxDocuments = function listAllTaxDocuments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllTaxDocumentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listTaxDocumentsByMemberRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTaxDocumentsByMember', inputVars);
}
listTaxDocumentsByMemberRef.operationName = 'ListTaxDocumentsByMember';
exports.listTaxDocumentsByMemberRef = listTaxDocumentsByMemberRef;

exports.listTaxDocumentsByMember = function listTaxDocumentsByMember(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listTaxDocumentsByMemberRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getTaxDocumentByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTaxDocumentById', inputVars);
}
getTaxDocumentByIdRef.operationName = 'GetTaxDocumentById';
exports.getTaxDocumentByIdRef = getTaxDocumentByIdRef;

exports.getTaxDocumentById = function getTaxDocumentById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getTaxDocumentByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
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

const listAiPromptSettingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAiPromptSettings');
}
listAiPromptSettingsRef.operationName = 'ListAiPromptSettings';
exports.listAiPromptSettingsRef = listAiPromptSettingsRef;

exports.listAiPromptSettings = function listAiPromptSettings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAiPromptSettingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listAiProviderSettingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAiProviderSettings');
}
listAiProviderSettingsRef.operationName = 'ListAiProviderSettings';
exports.listAiProviderSettingsRef = listAiProviderSettingsRef;

exports.listAiProviderSettings = function listAiProviderSettings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAiProviderSettingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listAppSettingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAppSettings');
}
listAppSettingsRef.operationName = 'ListAppSettings';
exports.listAppSettingsRef = listAppSettingsRef;

exports.listAppSettings = function listAppSettings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAppSettingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDeals');
}
listDealsRef.operationName = 'ListDeals';
exports.listDealsRef = listDealsRef;

exports.listDeals = function listDeals(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getDealByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetDealById', inputVars);
}
getDealByIdRef.operationName = 'GetDealById';
exports.getDealByIdRef = getDealByIdRef;

exports.getDealById = function getDealById(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getDealByIdRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealTagsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealTags');
}
listDealTagsRef.operationName = 'ListDealTags';
exports.listDealTagsRef = listDealTagsRef;

exports.listDealTags = function listDealTags(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealTagsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealTagAssignmentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealTagAssignments');
}
listDealTagAssignmentsRef.operationName = 'ListDealTagAssignments';
exports.listDealTagAssignmentsRef = listDealTagAssignmentsRef;

exports.listDealTagAssignments = function listDealTagAssignments(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealTagAssignmentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealDocumentsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealDocumentsByDeal', inputVars);
}
listDealDocumentsByDealRef.operationName = 'ListDealDocumentsByDeal';
exports.listDealDocumentsByDealRef = listDealDocumentsByDealRef;

exports.listDealDocumentsByDeal = function listDealDocumentsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealDocumentsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealRatingsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealRatingsByDeal', inputVars);
}
listDealRatingsByDealRef.operationName = 'ListDealRatingsByDeal';
exports.listDealRatingsByDealRef = listDealRatingsByDealRef;

exports.listDealRatingsByDeal = function listDealRatingsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealRatingsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealRatingsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealRatings');
}
listDealRatingsRef.operationName = 'ListDealRatings';
exports.listDealRatingsRef = listDealRatingsRef;

exports.listDealRatings = function listDealRatings(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealRatingsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealReviewerMatchesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealReviewerMatches');
}
listDealReviewerMatchesRef.operationName = 'ListDealReviewerMatches';
exports.listDealReviewerMatchesRef = listDealReviewerMatchesRef;

exports.listDealReviewerMatches = function listDealReviewerMatches(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealReviewerMatchesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealPitchDecksRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealPitchDecks');
}
listDealPitchDecksRef.operationName = 'ListDealPitchDecks';
exports.listDealPitchDecksRef = listDealPitchDecksRef;

exports.listDealPitchDecks = function listDealPitchDecks(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listDealPitchDecksRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealPublicReviewsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealPublicReviewsByDeal', inputVars);
}
listDealPublicReviewsByDealRef.operationName = 'ListDealPublicReviewsByDeal';
exports.listDealPublicReviewsByDealRef = listDealPublicReviewsByDealRef;

exports.listDealPublicReviewsByDeal = function listDealPublicReviewsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealPublicReviewsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listDealFundingRoundsByDealRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDealFundingRoundsByDeal', inputVars);
}
listDealFundingRoundsByDealRef.operationName = 'ListDealFundingRoundsByDeal';
exports.listDealFundingRoundsByDealRef = listDealFundingRoundsByDealRef;

exports.listDealFundingRoundsByDeal = function listDealFundingRoundsByDeal(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listDealFundingRoundsByDealRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getOrganizationMembershipRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetOrganizationMembership', inputVars);
}
getOrganizationMembershipRef.operationName = 'GetOrganizationMembership';
exports.getOrganizationMembershipRef = getOrganizationMembershipRef;

exports.getOrganizationMembership = function getOrganizationMembership(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getOrganizationMembershipRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
