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

export enum CompanyTrajectory {
  IMPROVING = "IMPROVING",
  STABLE = "STABLE",
  DECLINING = "DECLINING",
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

export interface Allocation_Key {
  id: UUIDString;
  __typename?: 'Allocation_Key';
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
    email: string;
    role: Role;
    status: MemberStatus;
    authUid?: string | null;
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

export interface ListAllMembersData {
  members: ({
    id: string;
    displayName: string;
    email: string;
    role: Role;
    status: MemberStatus;
    authUid?: string | null;
    createdAt: TimestampString;
  } & Member_Key)[];
}

export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    name: string;
    sector?: string | null;
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
    ledgerEntry: {
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
        sector?: string | null;
      } & Company_Key;
    };
  })[];
}

export interface ListCompanyUpdatesForScenarioVariables {
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
      sector?: string | null;
    } & Company_Key;
  } & LedgerEntry_Key)[];
}

export interface ListLedgerEntriesForScenarioVariables {
  scenario: Scenario;
}

export interface ListMemberAllocationsData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
      } & Company_Key;
    };
  })[];
}

export interface ListMemberAllocationsVariables {
  memberId: string;
  scenario: Scenario;
}

export interface ListMemberProfilesData {
  members: ({
    id: string;
    displayName: string;
    role: Role;
  } & Member_Key)[];
}

export interface ListMemberValuationsData {
  memberValuations: ({
    value: number;
    ledgerEntry: {
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
      } & Company_Key;
    };
  })[];
}

export interface ListMemberValuationsVariables {
  memberId: string;
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

