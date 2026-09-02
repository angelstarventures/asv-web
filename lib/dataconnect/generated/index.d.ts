import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum CompanyHealth {
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  RED = "RED",
};

export enum CompanyStatus {
  ACTIVE = "ACTIVE",
  EXITED = "EXITED",
  WRITTEN_OFF = "WRITTEN_OFF",
  ARCHIVED = "ARCHIVED",
};

export enum CompanyTrajectory {
  IMPROVING = "IMPROVING",
  STABLE = "STABLE",
  DECLINING = "DECLINING",
};

export enum ComplianceAuditType {
  MANUAL_OVERRIDE = "MANUAL_OVERRIDE",
  SCHEDULED_SHARIAH_REVIEW = "SCHEDULED_SHARIAH_REVIEW",
  STRATEGIC_PIVOT_AUDIT = "STRATEGIC_PIVOT_AUDIT",
};

export enum ComplianceStatus {
  NON_HALAL = "NON_HALAL",
};

export enum DocumentType {
  PITCH_DECK = "PITCH_DECK",
  DD_REPORT = "DD_REPORT",
  DATA_ROOM = "DATA_ROOM",
  COMPANY_UPDATE_DOC = "COMPANY_UPDATE_DOC",
  SPA = "SPA",
  ALLOCATION_SCHEDULE = "ALLOCATION_SCHEDULE",
};

export enum ExitType {
  ACQUISITION = "ACQUISITION",
  IPO = "IPO",
  MERGER = "MERGER",
  SHUTDOWN = "SHUTDOWN",
  DISSOLUTION = "DISSOLUTION",
};

export enum LedgerEntryType {
  PARTICIPATING_PRICED_ROUND = "PARTICIPATING_PRICED_ROUND",
  PARTICIPATING_SAFE_ROUND = "PARTICIPATING_SAFE_ROUND",
  NON_PARTICIPATING_ROUND = "NON_PARTICIPATING_ROUND",
  EXIT_EVENT = "EXIT_EVENT",
  TRANSACTION_VALUATION_CHANGE = "TRANSACTION_VALUATION_CHANGE",
  INTERNAL_VALUATION_ASSESSMENT = "INTERNAL_VALUATION_ASSESSMENT",
  COMPLIANCE_FLAG_CHANGE = "COMPLIANCE_FLAG_CHANGE",
  COMPANY_UPDATE = "COMPANY_UPDATE",
  CUSTOM = "CUSTOM",
};

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
};

export enum MembershipType {
  BOARD_MEMBER = "BOARD_MEMBER",
  MEMBER = "MEMBER",
  ASSOCIATE = "ASSOCIATE",
  EMERITUS = "EMERITUS",
};

export enum Role {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
};

export enum Scenario {
  OPTIMISTIC = "OPTIMISTIC",
  BALANCED = "BALANCED",
  CONSERVATIVE = "CONSERVATIVE",
};



export interface AiProcessingJob_Key {
  id: UUIDString;
  __typename?: 'AiProcessingJob_Key';
}

export interface AiPromptSetting_Key {
  key: string;
  __typename?: 'AiPromptSetting_Key';
}

export interface Allocation_Key {
  id: UUIDString;
  __typename?: 'Allocation_Key';
}

export interface AppSetting_Key {
  key: string;
  __typename?: 'AppSetting_Key';
}

export interface CompanyUpdateDetail_Key {
  id: UUIDString;
  __typename?: 'CompanyUpdateDetail_Key';
}

export interface Company_Key {
  id: UUIDString;
  __typename?: 'Company_Key';
}

export interface ComplianceFlagDetail_Key {
  id: UUIDString;
  __typename?: 'ComplianceFlagDetail_Key';
}

export interface CustomEventDetail_Key {
  id: UUIDString;
  __typename?: 'CustomEventDetail_Key';
}

export interface DocumentAccessLog_Key {
  id: UUIDString;
  __typename?: 'DocumentAccessLog_Key';
}

export interface Document_Key {
  id: UUIDString;
  __typename?: 'Document_Key';
}

export interface EventTypeDefinition_Key {
  id: UUIDString;
  __typename?: 'EventTypeDefinition_Key';
}

export interface ExitEventDetail_Key {
  id: UUIDString;
  __typename?: 'ExitEventDetail_Key';
}

export interface GetMemberByAuthUidData {
  members: ({
    id: string;
    displayName: string;
    role: Role;
    status: MemberStatus;
  } & Member_Key)[];
}

export interface GetMemberByAuthUidVariables {
  authUid: string;
}

export interface GetMemberByIdData {
  member?: {
    id: string;
    displayName: string;
    investingEntityName: string;
    email: string;
    role: Role;
    status: MemberStatus;
    authUid?: string | null;
    photoUrl?: string | null;
    profileText?: string | null;
    membershipType: MembershipType;
    createdAt: TimestampString;
  } & Member_Key;
}

export interface GetMemberByIdVariables {
  id: string;
}

export interface GetPortfolioRollupData {
  rollupCaches: ({
    moic: number;
    unrealizedValue: number;
    realizedValue: number;
    computedAt: TimestampString;
  })[];
}

export interface GetPortfolioRollupVariables {
  scenario: Scenario;
}

export interface ImportedRecordHash_Key {
  id: UUIDString;
  __typename?: 'ImportedRecordHash_Key';
}

export interface InsertCompanyData {
  company_insert: Company_Key;
}

export interface InsertCompanyVariables {
  name: string;
  sector?: string | null;
}

export interface LedgerEntry_Key {
  id: UUIDString;
  __typename?: 'LedgerEntry_Key';
}

export interface ListAiPromptSettingsData {
  aiPromptSettings: ({
    key: string;
    prompt: string;
    updatedAt: TimestampString;
  } & AiPromptSetting_Key)[];
}

export interface ListAllDocumentsData {
  documents: ({
    id: UUIDString;
    docType: DocumentType;
    company: {
      id: UUIDString;
      name: string;
      tradeName?: string | null;
    } & Company_Key;
  } & Document_Key)[];
}

export interface ListAllMembersData {
  members: ({
    id: string;
    displayName: string;
    investingEntityName: string;
    email: string;
    role: Role;
    status: MemberStatus;
    authUid?: string | null;
    membershipType: MembershipType;
    createdAt: TimestampString;
  } & Member_Key)[];
}

export interface ListAllocationsForScenarioData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      company: {
        id: UUIDString;
      } & Company_Key;
    };
  })[];
}

export interface ListAllocationsForScenarioVariables {
  scenario: Scenario;
}

export interface ListAppSettingsData {
  appSettings: ({
    key: string;
    value: string;
  } & AppSetting_Key)[];
}

export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    tradeName?: string | null;
    tagline?: string | null;
    sector?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    status: CompanyStatus;
  } & Company_Key)[];
}

export interface ListCompanyRollupsData {
  rollupCaches: ({
    companyKey: string;
    moic: number;
    unrealizedValue: number;
    realizedValue: number;
    company?: {
      id: UUIDString;
      name: string;
      tradeName?: string | null;
      sector?: string | null;
    } & Company_Key;
  })[];
}

export interface ListCompanyRollupsVariables {
  scenario: Scenario;
}

export interface ListCompanyUpdatesForScenarioData {
  companyUpdateDetails: ({
    health: CompanyHealth;
    trajectory: CompanyTrajectory;
    highlights: string[];
    lowlights: string[];
    upcomingPlans: string[];
    ledgerEntry: {
      id: UUIDString;
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
        sector?: string | null;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}

export interface ListCompanyUpdatesForScenarioVariables {
  scenario: Scenario;
}

export interface ListComplianceFlagDetailsForScenarioData {
  complianceFlagDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    status: ComplianceStatus;
    flaggedDate: DateString;
    reason: string;
    auditType: ComplianceAuditType;
    complianceOfficerNotes: string;
  })[];
}

export interface ListComplianceFlagDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface ListCustomEventTypesData {
  eventTypeDefinitions: ({
    id: UUIDString;
    key: string;
    label: string;
    description?: string | null;
  } & EventTypeDefinition_Key)[];
}

export interface ListExitEventDetailsForScenarioData {
  exitEventDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    exitType: ExitType;
    totalExitValue: number;
    asvTotalPayout: number;
    docLink?: string | null;
  })[];
}

export interface ListExitEventDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface ListLedgerEntriesForScenarioData {
  ledgerEntries: ({
    id: UUIDString;
    eventDate: DateString;
    type: LedgerEntryType;
    needsReview: boolean;
    sourceDocument?: string | null;
    company: {
      id: UUIDString;
      name: string;
      tradeName?: string | null;
      sector?: string | null;
    } & Company_Key;
  } & LedgerEntry_Key)[];
}

export interface ListLedgerEntriesForScenarioVariables {
  scenario: Scenario;
}

export interface ListMemberAllocationsAllScenariosData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      eventDate: DateString;
      scenario: Scenario;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
      } & Company_Key;
    };
  })[];
}

export interface ListMemberAllocationsData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      id: UUIDString;
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
        sector?: string | null;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}

export interface ListMemberAllocationsVariables {
  scenario: Scenario;
}

export interface ListMemberProfilesData {
  members: ({
    id: string;
    displayName: string;
    role: Role;
    membershipType: MembershipType;
    photoUrl?: string | null;
    profileText?: string | null;
  } & Member_Key)[];
}

export interface ListMemberValuationsAllScenariosData {
  memberValuations: ({
    value: number;
    ledgerEntry: {
      eventDate: DateString;
      scenario: Scenario;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
      } & Company_Key;
    };
  })[];
}

export interface ListMemberValuationsData {
  memberValuations: ({
    value: number;
    ledgerEntry: {
      id: UUIDString;
      eventDate: DateString;
      type: LedgerEntryType;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
        sector?: string | null;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}

export interface ListMemberValuationsVariables {
  scenario: Scenario;
}

export interface ListNonParticipatingRoundDetailsForScenarioData {
  nonParticipatingRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    roundName: string;
    newPricePerShare: number;
    newPostMoneyValuation: number;
    docLink?: string | null;
    notes?: string | null;
  })[];
}

export interface ListNonParticipatingRoundDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface ListPricedRoundDetailsForScenarioData {
  pricedRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    companyUrl?: string | null;
    docLink?: string | null;
    asvTotal: number;
    roundName: string;
    pricePerShare: number;
    postMoneyValuation: number;
  })[];
}

export interface ListPricedRoundDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface ListSafeRoundDetailsForScenarioData {
  safeRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    companyUrl?: string | null;
    docLink?: string | null;
    asvTotal: number;
    postMoneyValCap: number;
    discount: number;
    warrantShares?: number | null;
    warrantShareClass?: string | null;
    warrantExercisePrice?: number | null;
    warrantExpirationYears?: number | null;
    warrantVestingTerms?: string | null;
    notes?: string | null;
  })[];
}

export interface ListSafeRoundDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface ListValuationAssessmentDetailsForScenarioData {
  valuationAssessmentDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    drivingEventDate: DateString;
    asvTotalFairMarketValue: number;
    impliedEnterpriseValue?: number | null;
    assessmentRationale?: string | null;
  })[];
}

export interface ListValuationAssessmentDetailsForScenarioVariables {
  scenario: Scenario;
}

export interface MemberValuation_Key {
  id: UUIDString;
  __typename?: 'MemberValuation_Key';
}

export interface Member_Key {
  id: string;
  __typename?: 'Member_Key';
}

export interface NonParticipatingRoundDetail_Key {
  id: UUIDString;
  __typename?: 'NonParticipatingRoundDetail_Key';
}

export interface PitchSubmission_Key {
  id: UUIDString;
  __typename?: 'PitchSubmission_Key';
}

export interface PricedRoundDetail_Key {
  id: UUIDString;
  __typename?: 'PricedRoundDetail_Key';
}

export interface RollupCache_Key {
  companyKey: string;
  scenario: Scenario;
  __typename?: 'RollupCache_Key';
}

export interface SafeRoundDetail_Key {
  id: UUIDString;
  __typename?: 'SafeRoundDetail_Key';
}

export interface ValuationAssessmentDetail_Key {
  id: UUIDString;
  __typename?: 'ValuationAssessmentDetail_Key';
}

export interface WatchlistRating_Key {
  id: UUIDString;
  __typename?: 'WatchlistRating_Key';
}

interface InsertCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
  operationName: string;
}
export const insertCompanyRef: InsertCompanyRef;

export function insertCompany(vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;
export function insertCompany(dc: DataConnect, vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface ListCompaniesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
  operationName: string;
}
export const listCompaniesRef: ListCompaniesRef;

export function listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;
export function listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListMemberProfilesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberProfilesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMemberProfilesData, undefined>;
  operationName: string;
}
export const listMemberProfilesRef: ListMemberProfilesRef;

export function listMemberProfiles(options?: ExecuteQueryOptions): QueryPromise<ListMemberProfilesData, undefined>;
export function listMemberProfiles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberProfilesData, undefined>;

interface GetPortfolioRollupRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPortfolioRollupVariables): QueryRef<GetPortfolioRollupData, GetPortfolioRollupVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPortfolioRollupVariables): QueryRef<GetPortfolioRollupData, GetPortfolioRollupVariables>;
  operationName: string;
}
export const getPortfolioRollupRef: GetPortfolioRollupRef;

export function getPortfolioRollup(vars: GetPortfolioRollupVariables, options?: ExecuteQueryOptions): QueryPromise<GetPortfolioRollupData, GetPortfolioRollupVariables>;
export function getPortfolioRollup(dc: DataConnect, vars: GetPortfolioRollupVariables, options?: ExecuteQueryOptions): QueryPromise<GetPortfolioRollupData, GetPortfolioRollupVariables>;

interface ListCompanyRollupsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCompanyRollupsVariables): QueryRef<ListCompanyRollupsData, ListCompanyRollupsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListCompanyRollupsVariables): QueryRef<ListCompanyRollupsData, ListCompanyRollupsVariables>;
  operationName: string;
}
export const listCompanyRollupsRef: ListCompanyRollupsRef;

export function listCompanyRollups(vars: ListCompanyRollupsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyRollupsData, ListCompanyRollupsVariables>;
export function listCompanyRollups(dc: DataConnect, vars: ListCompanyRollupsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyRollupsData, ListCompanyRollupsVariables>;

interface ListCompanyUpdatesForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCompanyUpdatesForScenarioVariables): QueryRef<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListCompanyUpdatesForScenarioVariables): QueryRef<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;
  operationName: string;
}
export const listCompanyUpdatesForScenarioRef: ListCompanyUpdatesForScenarioRef;

export function listCompanyUpdatesForScenario(vars: ListCompanyUpdatesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;
export function listCompanyUpdatesForScenario(dc: DataConnect, vars: ListCompanyUpdatesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;

interface ListAllocationsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAllocationsForScenarioVariables): QueryRef<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListAllocationsForScenarioVariables): QueryRef<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;
  operationName: string;
}
export const listAllocationsForScenarioRef: ListAllocationsForScenarioRef;

export function listAllocationsForScenario(vars: ListAllocationsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;
export function listAllocationsForScenario(dc: DataConnect, vars: ListAllocationsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;

interface ListLedgerEntriesForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLedgerEntriesForScenarioVariables): QueryRef<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListLedgerEntriesForScenarioVariables): QueryRef<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;
  operationName: string;
}
export const listLedgerEntriesForScenarioRef: ListLedgerEntriesForScenarioRef;

export function listLedgerEntriesForScenario(vars: ListLedgerEntriesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;
export function listLedgerEntriesForScenario(dc: DataConnect, vars: ListLedgerEntriesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;

interface ListPricedRoundDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPricedRoundDetailsForScenarioVariables): QueryRef<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListPricedRoundDetailsForScenarioVariables): QueryRef<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;
  operationName: string;
}
export const listPricedRoundDetailsForScenarioRef: ListPricedRoundDetailsForScenarioRef;

export function listPricedRoundDetailsForScenario(vars: ListPricedRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;
export function listPricedRoundDetailsForScenario(dc: DataConnect, vars: ListPricedRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;

interface ListSafeRoundDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSafeRoundDetailsForScenarioVariables): QueryRef<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListSafeRoundDetailsForScenarioVariables): QueryRef<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;
  operationName: string;
}
export const listSafeRoundDetailsForScenarioRef: ListSafeRoundDetailsForScenarioRef;

export function listSafeRoundDetailsForScenario(vars: ListSafeRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;
export function listSafeRoundDetailsForScenario(dc: DataConnect, vars: ListSafeRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;

interface ListNonParticipatingRoundDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListNonParticipatingRoundDetailsForScenarioVariables): QueryRef<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListNonParticipatingRoundDetailsForScenarioVariables): QueryRef<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;
  operationName: string;
}
export const listNonParticipatingRoundDetailsForScenarioRef: ListNonParticipatingRoundDetailsForScenarioRef;

export function listNonParticipatingRoundDetailsForScenario(vars: ListNonParticipatingRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;
export function listNonParticipatingRoundDetailsForScenario(dc: DataConnect, vars: ListNonParticipatingRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;

interface ListExitEventDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListExitEventDetailsForScenarioVariables): QueryRef<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListExitEventDetailsForScenarioVariables): QueryRef<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;
  operationName: string;
}
export const listExitEventDetailsForScenarioRef: ListExitEventDetailsForScenarioRef;

export function listExitEventDetailsForScenario(vars: ListExitEventDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;
export function listExitEventDetailsForScenario(dc: DataConnect, vars: ListExitEventDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;

interface ListValuationAssessmentDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListValuationAssessmentDetailsForScenarioVariables): QueryRef<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListValuationAssessmentDetailsForScenarioVariables): QueryRef<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;
  operationName: string;
}
export const listValuationAssessmentDetailsForScenarioRef: ListValuationAssessmentDetailsForScenarioRef;

export function listValuationAssessmentDetailsForScenario(vars: ListValuationAssessmentDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;
export function listValuationAssessmentDetailsForScenario(dc: DataConnect, vars: ListValuationAssessmentDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;

interface ListComplianceFlagDetailsForScenarioRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListComplianceFlagDetailsForScenarioVariables): QueryRef<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListComplianceFlagDetailsForScenarioVariables): QueryRef<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;
  operationName: string;
}
export const listComplianceFlagDetailsForScenarioRef: ListComplianceFlagDetailsForScenarioRef;

export function listComplianceFlagDetailsForScenario(vars: ListComplianceFlagDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;
export function listComplianceFlagDetailsForScenario(dc: DataConnect, vars: ListComplianceFlagDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;

interface ListMemberAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMemberAllocationsVariables): QueryRef<ListMemberAllocationsData, ListMemberAllocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMemberAllocationsVariables): QueryRef<ListMemberAllocationsData, ListMemberAllocationsVariables>;
  operationName: string;
}
export const listMemberAllocationsRef: ListMemberAllocationsRef;

export function listMemberAllocations(vars: ListMemberAllocationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsData, ListMemberAllocationsVariables>;
export function listMemberAllocations(dc: DataConnect, vars: ListMemberAllocationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsData, ListMemberAllocationsVariables>;

interface ListMemberValuationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMemberValuationsVariables): QueryRef<ListMemberValuationsData, ListMemberValuationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMemberValuationsVariables): QueryRef<ListMemberValuationsData, ListMemberValuationsVariables>;
  operationName: string;
}
export const listMemberValuationsRef: ListMemberValuationsRef;

export function listMemberValuations(vars: ListMemberValuationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsData, ListMemberValuationsVariables>;
export function listMemberValuations(dc: DataConnect, vars: ListMemberValuationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsData, ListMemberValuationsVariables>;

interface ListMemberAllocationsAllScenariosRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberAllocationsAllScenariosData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMemberAllocationsAllScenariosData, undefined>;
  operationName: string;
}
export const listMemberAllocationsAllScenariosRef: ListMemberAllocationsAllScenariosRef;

export function listMemberAllocationsAllScenarios(options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsAllScenariosData, undefined>;
export function listMemberAllocationsAllScenarios(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsAllScenariosData, undefined>;

interface ListMemberValuationsAllScenariosRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberValuationsAllScenariosData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMemberValuationsAllScenariosData, undefined>;
  operationName: string;
}
export const listMemberValuationsAllScenariosRef: ListMemberValuationsAllScenariosRef;

export function listMemberValuationsAllScenarios(options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsAllScenariosData, undefined>;
export function listMemberValuationsAllScenarios(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsAllScenariosData, undefined>;

interface ListAllDocumentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllDocumentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllDocumentsData, undefined>;
  operationName: string;
}
export const listAllDocumentsRef: ListAllDocumentsRef;

export function listAllDocuments(options?: ExecuteQueryOptions): QueryPromise<ListAllDocumentsData, undefined>;
export function listAllDocuments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllDocumentsData, undefined>;

interface GetMemberByAuthUidRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMemberByAuthUidVariables): QueryRef<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMemberByAuthUidVariables): QueryRef<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;
  operationName: string;
}
export const getMemberByAuthUidRef: GetMemberByAuthUidRef;

export function getMemberByAuthUid(vars: GetMemberByAuthUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;
export function getMemberByAuthUid(dc: DataConnect, vars: GetMemberByAuthUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;

interface ListAllMembersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMembersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllMembersData, undefined>;
  operationName: string;
}
export const listAllMembersRef: ListAllMembersRef;

export function listAllMembers(options?: ExecuteQueryOptions): QueryPromise<ListAllMembersData, undefined>;
export function listAllMembers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMembersData, undefined>;

interface GetMemberByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMemberByIdVariables): QueryRef<GetMemberByIdData, GetMemberByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMemberByIdVariables): QueryRef<GetMemberByIdData, GetMemberByIdVariables>;
  operationName: string;
}
export const getMemberByIdRef: GetMemberByIdRef;

export function getMemberById(vars: GetMemberByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByIdData, GetMemberByIdVariables>;
export function getMemberById(dc: DataConnect, vars: GetMemberByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByIdData, GetMemberByIdVariables>;

interface ListCustomEventTypesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCustomEventTypesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCustomEventTypesData, undefined>;
  operationName: string;
}
export const listCustomEventTypesRef: ListCustomEventTypesRef;

export function listCustomEventTypes(options?: ExecuteQueryOptions): QueryPromise<ListCustomEventTypesData, undefined>;
export function listCustomEventTypes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCustomEventTypesData, undefined>;

interface ListAiPromptSettingsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAiPromptSettingsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAiPromptSettingsData, undefined>;
  operationName: string;
}
export const listAiPromptSettingsRef: ListAiPromptSettingsRef;

export function listAiPromptSettings(options?: ExecuteQueryOptions): QueryPromise<ListAiPromptSettingsData, undefined>;
export function listAiPromptSettings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAiPromptSettingsData, undefined>;

interface ListAppSettingsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAppSettingsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAppSettingsData, undefined>;
  operationName: string;
}
export const listAppSettingsRef: ListAppSettingsRef;

export function listAppSettings(options?: ExecuteQueryOptions): QueryPromise<ListAppSettingsData, undefined>;
export function listAppSettings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAppSettingsData, undefined>;

