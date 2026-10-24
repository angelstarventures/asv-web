# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `asv-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCompanies*](#listcompanies)
  - [*GetCompanyById*](#getcompanybyid)
  - [*ListCompanyDdLeads*](#listcompanyddleads)
  - [*ListMemberProfiles*](#listmemberprofiles)
  - [*GetPortfolioRollup*](#getportfoliorollup)
  - [*ListCompanyRollups*](#listcompanyrollups)
  - [*ListCompanyUpdatesForScenario*](#listcompanyupdatesforscenario)
  - [*ListAllocationsForScenario*](#listallocationsforscenario)
  - [*ListLedgerEntriesForScenario*](#listledgerentriesforscenario)
  - [*ListPricedRoundDetailsForScenario*](#listpricedrounddetailsforscenario)
  - [*ListSafeRoundDetailsForScenario*](#listsaferounddetailsforscenario)
  - [*ListNonParticipatingRoundDetailsForScenario*](#listnonparticipatingrounddetailsforscenario)
  - [*ListExitEventDetailsForScenario*](#listexiteventdetailsforscenario)
  - [*ListValuationAssessmentDetailsForScenario*](#listvaluationassessmentdetailsforscenario)
  - [*ListComplianceFlagDetailsForScenario*](#listcomplianceflagdetailsforscenario)
  - [*ListMemberAllocations*](#listmemberallocations)
  - [*ListMemberValuations*](#listmembervaluations)
  - [*ListMemberAllocationsAllScenarios*](#listmemberallocationsallscenarios)
  - [*ListMemberValuationsAllScenarios*](#listmembervaluationsallscenarios)
  - [*ListAllDocuments*](#listalldocuments)
  - [*GetDocumentById*](#getdocumentbyid)
  - [*ListAllTaxDocuments*](#listalltaxdocuments)
  - [*ListTaxDocumentsByMember*](#listtaxdocumentsbymember)
  - [*GetTaxDocumentById*](#gettaxdocumentbyid)
  - [*GetMemberByAuthUid*](#getmemberbyauthuid)
  - [*ListAllMembers*](#listallmembers)
  - [*GetMemberById*](#getmemberbyid)
  - [*ListCustomEventTypes*](#listcustomeventtypes)
  - [*ListAiPromptSettings*](#listaipromptsettings)
  - [*ListAiProviderSettings*](#listaiprovidersettings)
  - [*ListAppSettings*](#listappsettings)
  - [*ListDeals*](#listdeals)
  - [*GetDealById*](#getdealbyid)
  - [*ListDealTags*](#listdealtags)
  - [*ListDealTagAssignments*](#listdealtagassignments)
  - [*ListDealDocumentsByDeal*](#listdealdocumentsbydeal)
  - [*ListDealRatingsByDeal*](#listdealratingsbydeal)
  - [*ListDealRatings*](#listdealratings)
  - [*ListDealReviewerMatches*](#listdealreviewermatches)
  - [*ListDealPitchDecks*](#listdealpitchdecks)
  - [*ListDealPublicReviewsByDeal*](#listdealpublicreviewsbydeal)
  - [*ListDealFundingRoundsByDeal*](#listdealfundingroundsbydeal)
  - [*GetOrganizationMembership*](#getorganizationmembership)
  - [*ListRealEstateInvestments*](#listrealestateinvestments)
  - [*GetRealEstateInvestmentById*](#getrealestateinvestmentbyid)
  - [*ListRealEstatePaymentSchedule*](#listrealestatepaymentschedule)
  - [*ListRealEstateLedgerEntries*](#listrealestateledgerentries)
  - [*ListRealEstateShares*](#listrealestateshares)
  - [*ListRealEstateRollups*](#listrealestaterollups)
  - [*ListPublicRealEstateInvestments*](#listpublicrealestateinvestments)
  - [*ListMyRealEstateShares*](#listmyrealestateshares)
  - [*ListMyRealEstateLedgerEntries*](#listmyrealestateledgerentries)
  - [*ListMyRealEstateAllocations*](#listmyrealestateallocations)
  - [*ListMyRealEstatePositions*](#listmyrealestatepositions)
  - [*ListMyRealEstateTransfers*](#listmyrealestatetransfers)
- [**Mutations**](#mutations)
  - [*InsertCompany*](#insertcompany)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `asv-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@asv/dataconnect-generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@asv/dataconnect-generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@asv/dataconnect-generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `asv-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListCompanies
You can execute the `ListCompanies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompaniesRef:
```typescript
const name = listCompaniesRef.operationName;
console.log(name);
```

### Variables
The `ListCompanies` query has no variables.
### Return Type
Recall that executing the `ListCompanies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompaniesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListCompanies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanies } from '@asv/dataconnect-generated';


// Call the `listCompanies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanies(dataConnect);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCompanies().then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCompanies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompaniesRef } from '@asv/dataconnect-generated';


// Call the `listCompaniesRef()` function to get a reference to the query.
const ref = listCompaniesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompaniesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.companies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

## GetCompanyById
You can execute the `GetCompanyById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getCompanyById(vars: GetCompanyByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyByIdData, GetCompanyByIdVariables>;

interface GetCompanyByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCompanyByIdVariables): QueryRef<GetCompanyByIdData, GetCompanyByIdVariables>;
}
export const getCompanyByIdRef: GetCompanyByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCompanyById(dc: DataConnect, vars: GetCompanyByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyByIdData, GetCompanyByIdVariables>;

interface GetCompanyByIdRef {
  ...
  (dc: DataConnect, vars: GetCompanyByIdVariables): QueryRef<GetCompanyByIdData, GetCompanyByIdVariables>;
}
export const getCompanyByIdRef: GetCompanyByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCompanyByIdRef:
```typescript
const name = getCompanyByIdRef.operationName;
console.log(name);
```

### Variables
The `GetCompanyById` query requires an argument of type `GetCompanyByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCompanyByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetCompanyById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCompanyByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetCompanyByIdData {
  company?: {
    id: UUIDString;
    name: string;
    tradeName?: string | null;
    tagline?: string | null;
    sector?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    status: CompanyStatus;
    ceoName?: string | null;
    ceoContact?: string | null;
  } & Company_Key;
}
```
### Using `GetCompanyById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCompanyById, GetCompanyByIdVariables } from '@asv/dataconnect-generated';

// The `GetCompanyById` query requires an argument of type `GetCompanyByIdVariables`:
const getCompanyByIdVars: GetCompanyByIdVariables = {
  id: ..., 
};

// Call the `getCompanyById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCompanyById(getCompanyByIdVars);
// Variables can be defined inline as well.
const { data } = await getCompanyById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCompanyById(dataConnect, getCompanyByIdVars);

console.log(data.company);

// Or, you can use the `Promise` API.
getCompanyById(getCompanyByIdVars).then((response) => {
  const data = response.data;
  console.log(data.company);
});
```

### Using `GetCompanyById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCompanyByIdRef, GetCompanyByIdVariables } from '@asv/dataconnect-generated';

// The `GetCompanyById` query requires an argument of type `GetCompanyByIdVariables`:
const getCompanyByIdVars: GetCompanyByIdVariables = {
  id: ..., 
};

// Call the `getCompanyByIdRef()` function to get a reference to the query.
const ref = getCompanyByIdRef(getCompanyByIdVars);
// Variables can be defined inline as well.
const ref = getCompanyByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCompanyByIdRef(dataConnect, getCompanyByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.company);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.company);
});
```

## ListCompanyDdLeads
You can execute the `ListCompanyDdLeads` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCompanyDdLeads(options?: ExecuteQueryOptions): QueryPromise<ListCompanyDdLeadsData, undefined>;

interface ListCompanyDdLeadsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompanyDdLeadsData, undefined>;
}
export const listCompanyDdLeadsRef: ListCompanyDdLeadsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanyDdLeads(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompanyDdLeadsData, undefined>;

interface ListCompanyDdLeadsRef {
  ...
  (dc: DataConnect): QueryRef<ListCompanyDdLeadsData, undefined>;
}
export const listCompanyDdLeadsRef: ListCompanyDdLeadsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompanyDdLeadsRef:
```typescript
const name = listCompanyDdLeadsRef.operationName;
console.log(name);
```

### Variables
The `ListCompanyDdLeads` query has no variables.
### Return Type
Recall that executing the `ListCompanyDdLeads` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompanyDdLeadsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCompanyDdLeadsData {
  companies: ({
    id: UUIDString;
    ceoName?: string | null;
    ceoContact?: string | null;
    ddLead?: {
      id: string;
      displayName: string;
    } & Member_Key;
  } & Company_Key)[];
}
```
### Using `ListCompanyDdLeads`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanyDdLeads } from '@asv/dataconnect-generated';


// Call the `listCompanyDdLeads()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanyDdLeads();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanyDdLeads(dataConnect);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCompanyDdLeads().then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCompanyDdLeads`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompanyDdLeadsRef } from '@asv/dataconnect-generated';


// Call the `listCompanyDdLeadsRef()` function to get a reference to the query.
const ref = listCompanyDdLeadsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompanyDdLeadsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.companies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

## ListMemberProfiles
You can execute the `ListMemberProfiles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMemberProfiles(options?: ExecuteQueryOptions): QueryPromise<ListMemberProfilesData, undefined>;

interface ListMemberProfilesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberProfilesData, undefined>;
}
export const listMemberProfilesRef: ListMemberProfilesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMemberProfiles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberProfilesData, undefined>;

interface ListMemberProfilesRef {
  ...
  (dc: DataConnect): QueryRef<ListMemberProfilesData, undefined>;
}
export const listMemberProfilesRef: ListMemberProfilesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMemberProfilesRef:
```typescript
const name = listMemberProfilesRef.operationName;
console.log(name);
```

### Variables
The `ListMemberProfiles` query has no variables.
### Return Type
Recall that executing the `ListMemberProfiles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMemberProfilesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMemberProfiles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberProfiles } from '@asv/dataconnect-generated';


// Call the `listMemberProfiles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberProfiles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMemberProfiles(dataConnect);

console.log(data.members);

// Or, you can use the `Promise` API.
listMemberProfiles().then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

### Using `ListMemberProfiles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMemberProfilesRef } from '@asv/dataconnect-generated';


// Call the `listMemberProfilesRef()` function to get a reference to the query.
const ref = listMemberProfilesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMemberProfilesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.members);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

## GetPortfolioRollup
You can execute the `GetPortfolioRollup` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getPortfolioRollup(vars: GetPortfolioRollupVariables, options?: ExecuteQueryOptions): QueryPromise<GetPortfolioRollupData, GetPortfolioRollupVariables>;

interface GetPortfolioRollupRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPortfolioRollupVariables): QueryRef<GetPortfolioRollupData, GetPortfolioRollupVariables>;
}
export const getPortfolioRollupRef: GetPortfolioRollupRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPortfolioRollup(dc: DataConnect, vars: GetPortfolioRollupVariables, options?: ExecuteQueryOptions): QueryPromise<GetPortfolioRollupData, GetPortfolioRollupVariables>;

interface GetPortfolioRollupRef {
  ...
  (dc: DataConnect, vars: GetPortfolioRollupVariables): QueryRef<GetPortfolioRollupData, GetPortfolioRollupVariables>;
}
export const getPortfolioRollupRef: GetPortfolioRollupRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPortfolioRollupRef:
```typescript
const name = getPortfolioRollupRef.operationName;
console.log(name);
```

### Variables
The `GetPortfolioRollup` query requires an argument of type `GetPortfolioRollupVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPortfolioRollupVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `GetPortfolioRollup` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPortfolioRollupData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPortfolioRollupData {
  rollupCaches: ({
    moic: number;
    unrealizedValue: number;
    realizedValue: number;
    irr?: number | null;
    computedAt: TimestampString;
  })[];
}
```
### Using `GetPortfolioRollup`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPortfolioRollup, GetPortfolioRollupVariables } from '@asv/dataconnect-generated';

// The `GetPortfolioRollup` query requires an argument of type `GetPortfolioRollupVariables`:
const getPortfolioRollupVars: GetPortfolioRollupVariables = {
  scenario: ..., 
};

// Call the `getPortfolioRollup()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPortfolioRollup(getPortfolioRollupVars);
// Variables can be defined inline as well.
const { data } = await getPortfolioRollup({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPortfolioRollup(dataConnect, getPortfolioRollupVars);

console.log(data.rollupCaches);

// Or, you can use the `Promise` API.
getPortfolioRollup(getPortfolioRollupVars).then((response) => {
  const data = response.data;
  console.log(data.rollupCaches);
});
```

### Using `GetPortfolioRollup`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPortfolioRollupRef, GetPortfolioRollupVariables } from '@asv/dataconnect-generated';

// The `GetPortfolioRollup` query requires an argument of type `GetPortfolioRollupVariables`:
const getPortfolioRollupVars: GetPortfolioRollupVariables = {
  scenario: ..., 
};

// Call the `getPortfolioRollupRef()` function to get a reference to the query.
const ref = getPortfolioRollupRef(getPortfolioRollupVars);
// Variables can be defined inline as well.
const ref = getPortfolioRollupRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPortfolioRollupRef(dataConnect, getPortfolioRollupVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.rollupCaches);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.rollupCaches);
});
```

## ListCompanyRollups
You can execute the `ListCompanyRollups` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCompanyRollups(vars: ListCompanyRollupsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyRollupsData, ListCompanyRollupsVariables>;

interface ListCompanyRollupsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCompanyRollupsVariables): QueryRef<ListCompanyRollupsData, ListCompanyRollupsVariables>;
}
export const listCompanyRollupsRef: ListCompanyRollupsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanyRollups(dc: DataConnect, vars: ListCompanyRollupsVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyRollupsData, ListCompanyRollupsVariables>;

interface ListCompanyRollupsRef {
  ...
  (dc: DataConnect, vars: ListCompanyRollupsVariables): QueryRef<ListCompanyRollupsData, ListCompanyRollupsVariables>;
}
export const listCompanyRollupsRef: ListCompanyRollupsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompanyRollupsRef:
```typescript
const name = listCompanyRollupsRef.operationName;
console.log(name);
```

### Variables
The `ListCompanyRollups` query requires an argument of type `ListCompanyRollupsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCompanyRollupsVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListCompanyRollups` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompanyRollupsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
      status: CompanyStatus;
    } & Company_Key;
  })[];
}
```
### Using `ListCompanyRollups`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanyRollups, ListCompanyRollupsVariables } from '@asv/dataconnect-generated';

// The `ListCompanyRollups` query requires an argument of type `ListCompanyRollupsVariables`:
const listCompanyRollupsVars: ListCompanyRollupsVariables = {
  scenario: ..., 
};

// Call the `listCompanyRollups()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanyRollups(listCompanyRollupsVars);
// Variables can be defined inline as well.
const { data } = await listCompanyRollups({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanyRollups(dataConnect, listCompanyRollupsVars);

console.log(data.rollupCaches);

// Or, you can use the `Promise` API.
listCompanyRollups(listCompanyRollupsVars).then((response) => {
  const data = response.data;
  console.log(data.rollupCaches);
});
```

### Using `ListCompanyRollups`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompanyRollupsRef, ListCompanyRollupsVariables } from '@asv/dataconnect-generated';

// The `ListCompanyRollups` query requires an argument of type `ListCompanyRollupsVariables`:
const listCompanyRollupsVars: ListCompanyRollupsVariables = {
  scenario: ..., 
};

// Call the `listCompanyRollupsRef()` function to get a reference to the query.
const ref = listCompanyRollupsRef(listCompanyRollupsVars);
// Variables can be defined inline as well.
const ref = listCompanyRollupsRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompanyRollupsRef(dataConnect, listCompanyRollupsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.rollupCaches);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.rollupCaches);
});
```

## ListCompanyUpdatesForScenario
You can execute the `ListCompanyUpdatesForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCompanyUpdatesForScenario(vars: ListCompanyUpdatesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;

interface ListCompanyUpdatesForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCompanyUpdatesForScenarioVariables): QueryRef<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;
}
export const listCompanyUpdatesForScenarioRef: ListCompanyUpdatesForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanyUpdatesForScenario(dc: DataConnect, vars: ListCompanyUpdatesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;

interface ListCompanyUpdatesForScenarioRef {
  ...
  (dc: DataConnect, vars: ListCompanyUpdatesForScenarioVariables): QueryRef<ListCompanyUpdatesForScenarioData, ListCompanyUpdatesForScenarioVariables>;
}
export const listCompanyUpdatesForScenarioRef: ListCompanyUpdatesForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompanyUpdatesForScenarioRef:
```typescript
const name = listCompanyUpdatesForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListCompanyUpdatesForScenario` query requires an argument of type `ListCompanyUpdatesForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListCompanyUpdatesForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListCompanyUpdatesForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompanyUpdatesForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCompanyUpdatesForScenarioData {
  companyUpdateDetails: ({
    health: CompanyHealth;
    trajectory: CompanyTrajectory;
    highlights: string[];
    lowlights: string[];
    upcomingPlans: string[];
    driveFileId?: string | null;
    driveUrl?: string | null;
    viewpointScenario: Scenario;
    viewpointMarketResearchGrounding: string;
    viewpointValuationImpactSummary: string;
    viewpointWebSources?: string[] | null;
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
```
### Using `ListCompanyUpdatesForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanyUpdatesForScenario, ListCompanyUpdatesForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListCompanyUpdatesForScenario` query requires an argument of type `ListCompanyUpdatesForScenarioVariables`:
const listCompanyUpdatesForScenarioVars: ListCompanyUpdatesForScenarioVariables = {
  scenario: ..., 
};

// Call the `listCompanyUpdatesForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanyUpdatesForScenario(listCompanyUpdatesForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listCompanyUpdatesForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanyUpdatesForScenario(dataConnect, listCompanyUpdatesForScenarioVars);

console.log(data.companyUpdateDetails);

// Or, you can use the `Promise` API.
listCompanyUpdatesForScenario(listCompanyUpdatesForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.companyUpdateDetails);
});
```

### Using `ListCompanyUpdatesForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompanyUpdatesForScenarioRef, ListCompanyUpdatesForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListCompanyUpdatesForScenario` query requires an argument of type `ListCompanyUpdatesForScenarioVariables`:
const listCompanyUpdatesForScenarioVars: ListCompanyUpdatesForScenarioVariables = {
  scenario: ..., 
};

// Call the `listCompanyUpdatesForScenarioRef()` function to get a reference to the query.
const ref = listCompanyUpdatesForScenarioRef(listCompanyUpdatesForScenarioVars);
// Variables can be defined inline as well.
const ref = listCompanyUpdatesForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompanyUpdatesForScenarioRef(dataConnect, listCompanyUpdatesForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.companyUpdateDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.companyUpdateDetails);
});
```

## ListAllocationsForScenario
You can execute the `ListAllocationsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAllocationsForScenario(vars: ListAllocationsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;

interface ListAllocationsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAllocationsForScenarioVariables): QueryRef<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;
}
export const listAllocationsForScenarioRef: ListAllocationsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllocationsForScenario(dc: DataConnect, vars: ListAllocationsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;

interface ListAllocationsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListAllocationsForScenarioVariables): QueryRef<ListAllocationsForScenarioData, ListAllocationsForScenarioVariables>;
}
export const listAllocationsForScenarioRef: ListAllocationsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllocationsForScenarioRef:
```typescript
const name = listAllocationsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListAllocationsForScenario` query requires an argument of type `ListAllocationsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListAllocationsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListAllocationsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllocationsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllocationsForScenarioData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      id: UUIDString;
      eventDate: DateString;
      type: LedgerEntryType;
      company: {
        id: UUIDString;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}
```
### Using `ListAllocationsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllocationsForScenario, ListAllocationsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListAllocationsForScenario` query requires an argument of type `ListAllocationsForScenarioVariables`:
const listAllocationsForScenarioVars: ListAllocationsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listAllocationsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllocationsForScenario(listAllocationsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listAllocationsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllocationsForScenario(dataConnect, listAllocationsForScenarioVars);

console.log(data.allocations);

// Or, you can use the `Promise` API.
listAllocationsForScenario(listAllocationsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

### Using `ListAllocationsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllocationsForScenarioRef, ListAllocationsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListAllocationsForScenario` query requires an argument of type `ListAllocationsForScenarioVariables`:
const listAllocationsForScenarioVars: ListAllocationsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listAllocationsForScenarioRef()` function to get a reference to the query.
const ref = listAllocationsForScenarioRef(listAllocationsForScenarioVars);
// Variables can be defined inline as well.
const ref = listAllocationsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllocationsForScenarioRef(dataConnect, listAllocationsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.allocations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

## ListLedgerEntriesForScenario
You can execute the `ListLedgerEntriesForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listLedgerEntriesForScenario(vars: ListLedgerEntriesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;

interface ListLedgerEntriesForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLedgerEntriesForScenarioVariables): QueryRef<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;
}
export const listLedgerEntriesForScenarioRef: ListLedgerEntriesForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listLedgerEntriesForScenario(dc: DataConnect, vars: ListLedgerEntriesForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;

interface ListLedgerEntriesForScenarioRef {
  ...
  (dc: DataConnect, vars: ListLedgerEntriesForScenarioVariables): QueryRef<ListLedgerEntriesForScenarioData, ListLedgerEntriesForScenarioVariables>;
}
export const listLedgerEntriesForScenarioRef: ListLedgerEntriesForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listLedgerEntriesForScenarioRef:
```typescript
const name = listLedgerEntriesForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListLedgerEntriesForScenario` query requires an argument of type `ListLedgerEntriesForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListLedgerEntriesForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListLedgerEntriesForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListLedgerEntriesForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListLedgerEntriesForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listLedgerEntriesForScenario, ListLedgerEntriesForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListLedgerEntriesForScenario` query requires an argument of type `ListLedgerEntriesForScenarioVariables`:
const listLedgerEntriesForScenarioVars: ListLedgerEntriesForScenarioVariables = {
  scenario: ..., 
};

// Call the `listLedgerEntriesForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listLedgerEntriesForScenario(listLedgerEntriesForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listLedgerEntriesForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listLedgerEntriesForScenario(dataConnect, listLedgerEntriesForScenarioVars);

console.log(data.ledgerEntries);

// Or, you can use the `Promise` API.
listLedgerEntriesForScenario(listLedgerEntriesForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntries);
});
```

### Using `ListLedgerEntriesForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listLedgerEntriesForScenarioRef, ListLedgerEntriesForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListLedgerEntriesForScenario` query requires an argument of type `ListLedgerEntriesForScenarioVariables`:
const listLedgerEntriesForScenarioVars: ListLedgerEntriesForScenarioVariables = {
  scenario: ..., 
};

// Call the `listLedgerEntriesForScenarioRef()` function to get a reference to the query.
const ref = listLedgerEntriesForScenarioRef(listLedgerEntriesForScenarioVars);
// Variables can be defined inline as well.
const ref = listLedgerEntriesForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listLedgerEntriesForScenarioRef(dataConnect, listLedgerEntriesForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.ledgerEntries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.ledgerEntries);
});
```

## ListPricedRoundDetailsForScenario
You can execute the `ListPricedRoundDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listPricedRoundDetailsForScenario(vars: ListPricedRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;

interface ListPricedRoundDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPricedRoundDetailsForScenarioVariables): QueryRef<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;
}
export const listPricedRoundDetailsForScenarioRef: ListPricedRoundDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPricedRoundDetailsForScenario(dc: DataConnect, vars: ListPricedRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;

interface ListPricedRoundDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListPricedRoundDetailsForScenarioVariables): QueryRef<ListPricedRoundDetailsForScenarioData, ListPricedRoundDetailsForScenarioVariables>;
}
export const listPricedRoundDetailsForScenarioRef: ListPricedRoundDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPricedRoundDetailsForScenarioRef:
```typescript
const name = listPricedRoundDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListPricedRoundDetailsForScenario` query requires an argument of type `ListPricedRoundDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListPricedRoundDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListPricedRoundDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPricedRoundDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPricedRoundDetailsForScenarioData {
  pricedRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    companyUrl?: string | null;
    docLink?: string | null;
    driveFolderId?: string | null;
    asvTotal: number;
    totalRoundSize?: number | null;
    roundName: string;
    pricePerShare: number;
    postMoneyValuation: number;
  })[];
}
```
### Using `ListPricedRoundDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPricedRoundDetailsForScenario, ListPricedRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListPricedRoundDetailsForScenario` query requires an argument of type `ListPricedRoundDetailsForScenarioVariables`:
const listPricedRoundDetailsForScenarioVars: ListPricedRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listPricedRoundDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPricedRoundDetailsForScenario(listPricedRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listPricedRoundDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPricedRoundDetailsForScenario(dataConnect, listPricedRoundDetailsForScenarioVars);

console.log(data.pricedRoundDetails);

// Or, you can use the `Promise` API.
listPricedRoundDetailsForScenario(listPricedRoundDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.pricedRoundDetails);
});
```

### Using `ListPricedRoundDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPricedRoundDetailsForScenarioRef, ListPricedRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListPricedRoundDetailsForScenario` query requires an argument of type `ListPricedRoundDetailsForScenarioVariables`:
const listPricedRoundDetailsForScenarioVars: ListPricedRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listPricedRoundDetailsForScenarioRef()` function to get a reference to the query.
const ref = listPricedRoundDetailsForScenarioRef(listPricedRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listPricedRoundDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPricedRoundDetailsForScenarioRef(dataConnect, listPricedRoundDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.pricedRoundDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.pricedRoundDetails);
});
```

## ListSafeRoundDetailsForScenario
You can execute the `ListSafeRoundDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listSafeRoundDetailsForScenario(vars: ListSafeRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;

interface ListSafeRoundDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSafeRoundDetailsForScenarioVariables): QueryRef<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;
}
export const listSafeRoundDetailsForScenarioRef: ListSafeRoundDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSafeRoundDetailsForScenario(dc: DataConnect, vars: ListSafeRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;

interface ListSafeRoundDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListSafeRoundDetailsForScenarioVariables): QueryRef<ListSafeRoundDetailsForScenarioData, ListSafeRoundDetailsForScenarioVariables>;
}
export const listSafeRoundDetailsForScenarioRef: ListSafeRoundDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSafeRoundDetailsForScenarioRef:
```typescript
const name = listSafeRoundDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListSafeRoundDetailsForScenario` query requires an argument of type `ListSafeRoundDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListSafeRoundDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListSafeRoundDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSafeRoundDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListSafeRoundDetailsForScenarioData {
  safeRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    companyUrl?: string | null;
    docLink?: string | null;
    driveFolderId?: string | null;
    roundName: string;
    asvTotal: number;
    totalRoundSize?: number | null;
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
```
### Using `ListSafeRoundDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSafeRoundDetailsForScenario, ListSafeRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListSafeRoundDetailsForScenario` query requires an argument of type `ListSafeRoundDetailsForScenarioVariables`:
const listSafeRoundDetailsForScenarioVars: ListSafeRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listSafeRoundDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSafeRoundDetailsForScenario(listSafeRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listSafeRoundDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSafeRoundDetailsForScenario(dataConnect, listSafeRoundDetailsForScenarioVars);

console.log(data.safeRoundDetails);

// Or, you can use the `Promise` API.
listSafeRoundDetailsForScenario(listSafeRoundDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.safeRoundDetails);
});
```

### Using `ListSafeRoundDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSafeRoundDetailsForScenarioRef, ListSafeRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListSafeRoundDetailsForScenario` query requires an argument of type `ListSafeRoundDetailsForScenarioVariables`:
const listSafeRoundDetailsForScenarioVars: ListSafeRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listSafeRoundDetailsForScenarioRef()` function to get a reference to the query.
const ref = listSafeRoundDetailsForScenarioRef(listSafeRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listSafeRoundDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSafeRoundDetailsForScenarioRef(dataConnect, listSafeRoundDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.safeRoundDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.safeRoundDetails);
});
```

## ListNonParticipatingRoundDetailsForScenario
You can execute the `ListNonParticipatingRoundDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listNonParticipatingRoundDetailsForScenario(vars: ListNonParticipatingRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;

interface ListNonParticipatingRoundDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListNonParticipatingRoundDetailsForScenarioVariables): QueryRef<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;
}
export const listNonParticipatingRoundDetailsForScenarioRef: ListNonParticipatingRoundDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listNonParticipatingRoundDetailsForScenario(dc: DataConnect, vars: ListNonParticipatingRoundDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;

interface ListNonParticipatingRoundDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListNonParticipatingRoundDetailsForScenarioVariables): QueryRef<ListNonParticipatingRoundDetailsForScenarioData, ListNonParticipatingRoundDetailsForScenarioVariables>;
}
export const listNonParticipatingRoundDetailsForScenarioRef: ListNonParticipatingRoundDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listNonParticipatingRoundDetailsForScenarioRef:
```typescript
const name = listNonParticipatingRoundDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListNonParticipatingRoundDetailsForScenario` query requires an argument of type `ListNonParticipatingRoundDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListNonParticipatingRoundDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListNonParticipatingRoundDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListNonParticipatingRoundDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListNonParticipatingRoundDetailsForScenarioData {
  nonParticipatingRoundDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    roundName: string;
    newPricePerShare: number;
    newPostMoneyValuation: number;
    totalRoundSize?: number | null;
    docLink?: string | null;
    driveFolderId?: string | null;
    notes?: string | null;
  })[];
}
```
### Using `ListNonParticipatingRoundDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listNonParticipatingRoundDetailsForScenario, ListNonParticipatingRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListNonParticipatingRoundDetailsForScenario` query requires an argument of type `ListNonParticipatingRoundDetailsForScenarioVariables`:
const listNonParticipatingRoundDetailsForScenarioVars: ListNonParticipatingRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listNonParticipatingRoundDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listNonParticipatingRoundDetailsForScenario(listNonParticipatingRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listNonParticipatingRoundDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listNonParticipatingRoundDetailsForScenario(dataConnect, listNonParticipatingRoundDetailsForScenarioVars);

console.log(data.nonParticipatingRoundDetails);

// Or, you can use the `Promise` API.
listNonParticipatingRoundDetailsForScenario(listNonParticipatingRoundDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.nonParticipatingRoundDetails);
});
```

### Using `ListNonParticipatingRoundDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listNonParticipatingRoundDetailsForScenarioRef, ListNonParticipatingRoundDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListNonParticipatingRoundDetailsForScenario` query requires an argument of type `ListNonParticipatingRoundDetailsForScenarioVariables`:
const listNonParticipatingRoundDetailsForScenarioVars: ListNonParticipatingRoundDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listNonParticipatingRoundDetailsForScenarioRef()` function to get a reference to the query.
const ref = listNonParticipatingRoundDetailsForScenarioRef(listNonParticipatingRoundDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listNonParticipatingRoundDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listNonParticipatingRoundDetailsForScenarioRef(dataConnect, listNonParticipatingRoundDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.nonParticipatingRoundDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.nonParticipatingRoundDetails);
});
```

## ListExitEventDetailsForScenario
You can execute the `ListExitEventDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listExitEventDetailsForScenario(vars: ListExitEventDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;

interface ListExitEventDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListExitEventDetailsForScenarioVariables): QueryRef<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;
}
export const listExitEventDetailsForScenarioRef: ListExitEventDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listExitEventDetailsForScenario(dc: DataConnect, vars: ListExitEventDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;

interface ListExitEventDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListExitEventDetailsForScenarioVariables): QueryRef<ListExitEventDetailsForScenarioData, ListExitEventDetailsForScenarioVariables>;
}
export const listExitEventDetailsForScenarioRef: ListExitEventDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listExitEventDetailsForScenarioRef:
```typescript
const name = listExitEventDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListExitEventDetailsForScenario` query requires an argument of type `ListExitEventDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListExitEventDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListExitEventDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListExitEventDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListExitEventDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listExitEventDetailsForScenario, ListExitEventDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListExitEventDetailsForScenario` query requires an argument of type `ListExitEventDetailsForScenarioVariables`:
const listExitEventDetailsForScenarioVars: ListExitEventDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listExitEventDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listExitEventDetailsForScenario(listExitEventDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listExitEventDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listExitEventDetailsForScenario(dataConnect, listExitEventDetailsForScenarioVars);

console.log(data.exitEventDetails);

// Or, you can use the `Promise` API.
listExitEventDetailsForScenario(listExitEventDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.exitEventDetails);
});
```

### Using `ListExitEventDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listExitEventDetailsForScenarioRef, ListExitEventDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListExitEventDetailsForScenario` query requires an argument of type `ListExitEventDetailsForScenarioVariables`:
const listExitEventDetailsForScenarioVars: ListExitEventDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listExitEventDetailsForScenarioRef()` function to get a reference to the query.
const ref = listExitEventDetailsForScenarioRef(listExitEventDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listExitEventDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listExitEventDetailsForScenarioRef(dataConnect, listExitEventDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.exitEventDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.exitEventDetails);
});
```

## ListValuationAssessmentDetailsForScenario
You can execute the `ListValuationAssessmentDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listValuationAssessmentDetailsForScenario(vars: ListValuationAssessmentDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;

interface ListValuationAssessmentDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListValuationAssessmentDetailsForScenarioVariables): QueryRef<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;
}
export const listValuationAssessmentDetailsForScenarioRef: ListValuationAssessmentDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listValuationAssessmentDetailsForScenario(dc: DataConnect, vars: ListValuationAssessmentDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;

interface ListValuationAssessmentDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListValuationAssessmentDetailsForScenarioVariables): QueryRef<ListValuationAssessmentDetailsForScenarioData, ListValuationAssessmentDetailsForScenarioVariables>;
}
export const listValuationAssessmentDetailsForScenarioRef: ListValuationAssessmentDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listValuationAssessmentDetailsForScenarioRef:
```typescript
const name = listValuationAssessmentDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListValuationAssessmentDetailsForScenario` query requires an argument of type `ListValuationAssessmentDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListValuationAssessmentDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListValuationAssessmentDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListValuationAssessmentDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListValuationAssessmentDetailsForScenarioData {
  valuationAssessmentDetails: ({
    ledgerEntry: {
      id: UUIDString;
    } & LedgerEntry_Key;
    drivingEventDate: DateString;
    asvTotalFairMarketValue: number;
    impliedEnterpriseValue?: number | null;
    assessmentRationale?: string | null;
    viewpointScenario?: Scenario | null;
    viewpointMarketResearchGrounding?: string | null;
    viewpointValuationImpactSummary?: string | null;
  })[];
}
```
### Using `ListValuationAssessmentDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listValuationAssessmentDetailsForScenario, ListValuationAssessmentDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListValuationAssessmentDetailsForScenario` query requires an argument of type `ListValuationAssessmentDetailsForScenarioVariables`:
const listValuationAssessmentDetailsForScenarioVars: ListValuationAssessmentDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listValuationAssessmentDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listValuationAssessmentDetailsForScenario(listValuationAssessmentDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listValuationAssessmentDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listValuationAssessmentDetailsForScenario(dataConnect, listValuationAssessmentDetailsForScenarioVars);

console.log(data.valuationAssessmentDetails);

// Or, you can use the `Promise` API.
listValuationAssessmentDetailsForScenario(listValuationAssessmentDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.valuationAssessmentDetails);
});
```

### Using `ListValuationAssessmentDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listValuationAssessmentDetailsForScenarioRef, ListValuationAssessmentDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListValuationAssessmentDetailsForScenario` query requires an argument of type `ListValuationAssessmentDetailsForScenarioVariables`:
const listValuationAssessmentDetailsForScenarioVars: ListValuationAssessmentDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listValuationAssessmentDetailsForScenarioRef()` function to get a reference to the query.
const ref = listValuationAssessmentDetailsForScenarioRef(listValuationAssessmentDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listValuationAssessmentDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listValuationAssessmentDetailsForScenarioRef(dataConnect, listValuationAssessmentDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.valuationAssessmentDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.valuationAssessmentDetails);
});
```

## ListComplianceFlagDetailsForScenario
You can execute the `ListComplianceFlagDetailsForScenario` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listComplianceFlagDetailsForScenario(vars: ListComplianceFlagDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;

interface ListComplianceFlagDetailsForScenarioRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListComplianceFlagDetailsForScenarioVariables): QueryRef<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;
}
export const listComplianceFlagDetailsForScenarioRef: ListComplianceFlagDetailsForScenarioRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listComplianceFlagDetailsForScenario(dc: DataConnect, vars: ListComplianceFlagDetailsForScenarioVariables, options?: ExecuteQueryOptions): QueryPromise<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;

interface ListComplianceFlagDetailsForScenarioRef {
  ...
  (dc: DataConnect, vars: ListComplianceFlagDetailsForScenarioVariables): QueryRef<ListComplianceFlagDetailsForScenarioData, ListComplianceFlagDetailsForScenarioVariables>;
}
export const listComplianceFlagDetailsForScenarioRef: ListComplianceFlagDetailsForScenarioRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listComplianceFlagDetailsForScenarioRef:
```typescript
const name = listComplianceFlagDetailsForScenarioRef.operationName;
console.log(name);
```

### Variables
The `ListComplianceFlagDetailsForScenario` query requires an argument of type `ListComplianceFlagDetailsForScenarioVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListComplianceFlagDetailsForScenarioVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListComplianceFlagDetailsForScenario` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListComplianceFlagDetailsForScenarioData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListComplianceFlagDetailsForScenario`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listComplianceFlagDetailsForScenario, ListComplianceFlagDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListComplianceFlagDetailsForScenario` query requires an argument of type `ListComplianceFlagDetailsForScenarioVariables`:
const listComplianceFlagDetailsForScenarioVars: ListComplianceFlagDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listComplianceFlagDetailsForScenario()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listComplianceFlagDetailsForScenario(listComplianceFlagDetailsForScenarioVars);
// Variables can be defined inline as well.
const { data } = await listComplianceFlagDetailsForScenario({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listComplianceFlagDetailsForScenario(dataConnect, listComplianceFlagDetailsForScenarioVars);

console.log(data.complianceFlagDetails);

// Or, you can use the `Promise` API.
listComplianceFlagDetailsForScenario(listComplianceFlagDetailsForScenarioVars).then((response) => {
  const data = response.data;
  console.log(data.complianceFlagDetails);
});
```

### Using `ListComplianceFlagDetailsForScenario`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listComplianceFlagDetailsForScenarioRef, ListComplianceFlagDetailsForScenarioVariables } from '@asv/dataconnect-generated';

// The `ListComplianceFlagDetailsForScenario` query requires an argument of type `ListComplianceFlagDetailsForScenarioVariables`:
const listComplianceFlagDetailsForScenarioVars: ListComplianceFlagDetailsForScenarioVariables = {
  scenario: ..., 
};

// Call the `listComplianceFlagDetailsForScenarioRef()` function to get a reference to the query.
const ref = listComplianceFlagDetailsForScenarioRef(listComplianceFlagDetailsForScenarioVars);
// Variables can be defined inline as well.
const ref = listComplianceFlagDetailsForScenarioRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listComplianceFlagDetailsForScenarioRef(dataConnect, listComplianceFlagDetailsForScenarioVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.complianceFlagDetails);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.complianceFlagDetails);
});
```

## ListMemberAllocations
You can execute the `ListMemberAllocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMemberAllocations(vars: ListMemberAllocationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsData, ListMemberAllocationsVariables>;

interface ListMemberAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMemberAllocationsVariables): QueryRef<ListMemberAllocationsData, ListMemberAllocationsVariables>;
}
export const listMemberAllocationsRef: ListMemberAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMemberAllocations(dc: DataConnect, vars: ListMemberAllocationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsData, ListMemberAllocationsVariables>;

interface ListMemberAllocationsRef {
  ...
  (dc: DataConnect, vars: ListMemberAllocationsVariables): QueryRef<ListMemberAllocationsData, ListMemberAllocationsVariables>;
}
export const listMemberAllocationsRef: ListMemberAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMemberAllocationsRef:
```typescript
const name = listMemberAllocationsRef.operationName;
console.log(name);
```

### Variables
The `ListMemberAllocations` query requires an argument of type `ListMemberAllocationsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMemberAllocationsVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListMemberAllocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMemberAllocationsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMemberAllocationsData {
  allocations: ({
    amount: number;
    ledgerEntry: {
      id: UUIDString;
      eventDate: DateString;
      type: LedgerEntryType;
      company: {
        id: UUIDString;
        name: string;
        tradeName?: string | null;
        sector?: string | null;
        status: CompanyStatus;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}
```
### Using `ListMemberAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberAllocations, ListMemberAllocationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberAllocations` query requires an argument of type `ListMemberAllocationsVariables`:
const listMemberAllocationsVars: ListMemberAllocationsVariables = {
  scenario: ..., 
};

// Call the `listMemberAllocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberAllocations(listMemberAllocationsVars);
// Variables can be defined inline as well.
const { data } = await listMemberAllocations({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMemberAllocations(dataConnect, listMemberAllocationsVars);

console.log(data.allocations);

// Or, you can use the `Promise` API.
listMemberAllocations(listMemberAllocationsVars).then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

### Using `ListMemberAllocations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMemberAllocationsRef, ListMemberAllocationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberAllocations` query requires an argument of type `ListMemberAllocationsVariables`:
const listMemberAllocationsVars: ListMemberAllocationsVariables = {
  scenario: ..., 
};

// Call the `listMemberAllocationsRef()` function to get a reference to the query.
const ref = listMemberAllocationsRef(listMemberAllocationsVars);
// Variables can be defined inline as well.
const ref = listMemberAllocationsRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMemberAllocationsRef(dataConnect, listMemberAllocationsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.allocations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

## ListMemberValuations
You can execute the `ListMemberValuations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMemberValuations(vars: ListMemberValuationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsData, ListMemberValuationsVariables>;

interface ListMemberValuationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMemberValuationsVariables): QueryRef<ListMemberValuationsData, ListMemberValuationsVariables>;
}
export const listMemberValuationsRef: ListMemberValuationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMemberValuations(dc: DataConnect, vars: ListMemberValuationsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsData, ListMemberValuationsVariables>;

interface ListMemberValuationsRef {
  ...
  (dc: DataConnect, vars: ListMemberValuationsVariables): QueryRef<ListMemberValuationsData, ListMemberValuationsVariables>;
}
export const listMemberValuationsRef: ListMemberValuationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMemberValuationsRef:
```typescript
const name = listMemberValuationsRef.operationName;
console.log(name);
```

### Variables
The `ListMemberValuations` query requires an argument of type `ListMemberValuationsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListMemberValuationsVariables {
  scenario: Scenario;
}
```
### Return Type
Recall that executing the `ListMemberValuations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMemberValuationsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
        status: CompanyStatus;
      } & Company_Key;
    } & LedgerEntry_Key;
  })[];
}
```
### Using `ListMemberValuations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberValuations, ListMemberValuationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberValuations` query requires an argument of type `ListMemberValuationsVariables`:
const listMemberValuationsVars: ListMemberValuationsVariables = {
  scenario: ..., 
};

// Call the `listMemberValuations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberValuations(listMemberValuationsVars);
// Variables can be defined inline as well.
const { data } = await listMemberValuations({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMemberValuations(dataConnect, listMemberValuationsVars);

console.log(data.memberValuations);

// Or, you can use the `Promise` API.
listMemberValuations(listMemberValuationsVars).then((response) => {
  const data = response.data;
  console.log(data.memberValuations);
});
```

### Using `ListMemberValuations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMemberValuationsRef, ListMemberValuationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberValuations` query requires an argument of type `ListMemberValuationsVariables`:
const listMemberValuationsVars: ListMemberValuationsVariables = {
  scenario: ..., 
};

// Call the `listMemberValuationsRef()` function to get a reference to the query.
const ref = listMemberValuationsRef(listMemberValuationsVars);
// Variables can be defined inline as well.
const ref = listMemberValuationsRef({ scenario: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMemberValuationsRef(dataConnect, listMemberValuationsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.memberValuations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.memberValuations);
});
```

## ListMemberAllocationsAllScenarios
You can execute the `ListMemberAllocationsAllScenarios` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMemberAllocationsAllScenarios(options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsAllScenariosData, undefined>;

interface ListMemberAllocationsAllScenariosRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberAllocationsAllScenariosData, undefined>;
}
export const listMemberAllocationsAllScenariosRef: ListMemberAllocationsAllScenariosRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMemberAllocationsAllScenarios(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberAllocationsAllScenariosData, undefined>;

interface ListMemberAllocationsAllScenariosRef {
  ...
  (dc: DataConnect): QueryRef<ListMemberAllocationsAllScenariosData, undefined>;
}
export const listMemberAllocationsAllScenariosRef: ListMemberAllocationsAllScenariosRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMemberAllocationsAllScenariosRef:
```typescript
const name = listMemberAllocationsAllScenariosRef.operationName;
console.log(name);
```

### Variables
The `ListMemberAllocationsAllScenarios` query has no variables.
### Return Type
Recall that executing the `ListMemberAllocationsAllScenarios` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMemberAllocationsAllScenariosData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMemberAllocationsAllScenarios`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberAllocationsAllScenarios } from '@asv/dataconnect-generated';


// Call the `listMemberAllocationsAllScenarios()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberAllocationsAllScenarios();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMemberAllocationsAllScenarios(dataConnect);

console.log(data.allocations);

// Or, you can use the `Promise` API.
listMemberAllocationsAllScenarios().then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

### Using `ListMemberAllocationsAllScenarios`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMemberAllocationsAllScenariosRef } from '@asv/dataconnect-generated';


// Call the `listMemberAllocationsAllScenariosRef()` function to get a reference to the query.
const ref = listMemberAllocationsAllScenariosRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMemberAllocationsAllScenariosRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.allocations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.allocations);
});
```

## ListMemberValuationsAllScenarios
You can execute the `ListMemberValuationsAllScenarios` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMemberValuationsAllScenarios(options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsAllScenariosData, undefined>;

interface ListMemberValuationsAllScenariosRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMemberValuationsAllScenariosData, undefined>;
}
export const listMemberValuationsAllScenariosRef: ListMemberValuationsAllScenariosRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMemberValuationsAllScenarios(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMemberValuationsAllScenariosData, undefined>;

interface ListMemberValuationsAllScenariosRef {
  ...
  (dc: DataConnect): QueryRef<ListMemberValuationsAllScenariosData, undefined>;
}
export const listMemberValuationsAllScenariosRef: ListMemberValuationsAllScenariosRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMemberValuationsAllScenariosRef:
```typescript
const name = listMemberValuationsAllScenariosRef.operationName;
console.log(name);
```

### Variables
The `ListMemberValuationsAllScenarios` query has no variables.
### Return Type
Recall that executing the `ListMemberValuationsAllScenarios` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMemberValuationsAllScenariosData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMemberValuationsAllScenarios`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberValuationsAllScenarios } from '@asv/dataconnect-generated';


// Call the `listMemberValuationsAllScenarios()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberValuationsAllScenarios();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMemberValuationsAllScenarios(dataConnect);

console.log(data.memberValuations);

// Or, you can use the `Promise` API.
listMemberValuationsAllScenarios().then((response) => {
  const data = response.data;
  console.log(data.memberValuations);
});
```

### Using `ListMemberValuationsAllScenarios`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMemberValuationsAllScenariosRef } from '@asv/dataconnect-generated';


// Call the `listMemberValuationsAllScenariosRef()` function to get a reference to the query.
const ref = listMemberValuationsAllScenariosRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMemberValuationsAllScenariosRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.memberValuations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.memberValuations);
});
```

## ListAllDocuments
You can execute the `ListAllDocuments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAllDocuments(options?: ExecuteQueryOptions): QueryPromise<ListAllDocumentsData, undefined>;

interface ListAllDocumentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllDocumentsData, undefined>;
}
export const listAllDocumentsRef: ListAllDocumentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllDocuments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllDocumentsData, undefined>;

interface ListAllDocumentsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllDocumentsData, undefined>;
}
export const listAllDocumentsRef: ListAllDocumentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllDocumentsRef:
```typescript
const name = listAllDocumentsRef.operationName;
console.log(name);
```

### Variables
The `ListAllDocuments` query has no variables.
### Return Type
Recall that executing the `ListAllDocuments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllDocumentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllDocumentsData {
  documents: ({
    id: UUIDString;
    filename?: string | null;
    docType: DocumentType;
    uploadedAt: TimestampString;
    company: {
      id: UUIDString;
      name: string;
      tradeName?: string | null;
    } & Company_Key;
  } & Document_Key)[];
}
```
### Using `ListAllDocuments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllDocuments } from '@asv/dataconnect-generated';


// Call the `listAllDocuments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllDocuments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllDocuments(dataConnect);

console.log(data.documents);

// Or, you can use the `Promise` API.
listAllDocuments().then((response) => {
  const data = response.data;
  console.log(data.documents);
});
```

### Using `ListAllDocuments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllDocumentsRef } from '@asv/dataconnect-generated';


// Call the `listAllDocumentsRef()` function to get a reference to the query.
const ref = listAllDocumentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllDocumentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.documents);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.documents);
});
```

## GetDocumentById
You can execute the `GetDocumentById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getDocumentById(vars: GetDocumentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetDocumentByIdData, GetDocumentByIdVariables>;

interface GetDocumentByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDocumentByIdVariables): QueryRef<GetDocumentByIdData, GetDocumentByIdVariables>;
}
export const getDocumentByIdRef: GetDocumentByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getDocumentById(dc: DataConnect, vars: GetDocumentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetDocumentByIdData, GetDocumentByIdVariables>;

interface GetDocumentByIdRef {
  ...
  (dc: DataConnect, vars: GetDocumentByIdVariables): QueryRef<GetDocumentByIdData, GetDocumentByIdVariables>;
}
export const getDocumentByIdRef: GetDocumentByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getDocumentByIdRef:
```typescript
const name = getDocumentByIdRef.operationName;
console.log(name);
```

### Variables
The `GetDocumentById` query requires an argument of type `GetDocumentByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetDocumentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetDocumentById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetDocumentByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetDocumentByIdData {
  document?: {
    id: UUIDString;
    driveFileId: string;
    filename?: string | null;
    docType: DocumentType;
    company: {
      id: UUIDString;
    } & Company_Key;
  } & Document_Key;
}
```
### Using `GetDocumentById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getDocumentById, GetDocumentByIdVariables } from '@asv/dataconnect-generated';

// The `GetDocumentById` query requires an argument of type `GetDocumentByIdVariables`:
const getDocumentByIdVars: GetDocumentByIdVariables = {
  id: ..., 
};

// Call the `getDocumentById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getDocumentById(getDocumentByIdVars);
// Variables can be defined inline as well.
const { data } = await getDocumentById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getDocumentById(dataConnect, getDocumentByIdVars);

console.log(data.document);

// Or, you can use the `Promise` API.
getDocumentById(getDocumentByIdVars).then((response) => {
  const data = response.data;
  console.log(data.document);
});
```

### Using `GetDocumentById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getDocumentByIdRef, GetDocumentByIdVariables } from '@asv/dataconnect-generated';

// The `GetDocumentById` query requires an argument of type `GetDocumentByIdVariables`:
const getDocumentByIdVars: GetDocumentByIdVariables = {
  id: ..., 
};

// Call the `getDocumentByIdRef()` function to get a reference to the query.
const ref = getDocumentByIdRef(getDocumentByIdVars);
// Variables can be defined inline as well.
const ref = getDocumentByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getDocumentByIdRef(dataConnect, getDocumentByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.document);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.document);
});
```

## ListAllTaxDocuments
You can execute the `ListAllTaxDocuments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAllTaxDocuments(options?: ExecuteQueryOptions): QueryPromise<ListAllTaxDocumentsData, undefined>;

interface ListAllTaxDocumentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllTaxDocumentsData, undefined>;
}
export const listAllTaxDocumentsRef: ListAllTaxDocumentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllTaxDocuments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllTaxDocumentsData, undefined>;

interface ListAllTaxDocumentsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllTaxDocumentsData, undefined>;
}
export const listAllTaxDocumentsRef: ListAllTaxDocumentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllTaxDocumentsRef:
```typescript
const name = listAllTaxDocumentsRef.operationName;
console.log(name);
```

### Variables
The `ListAllTaxDocuments` query has no variables.
### Return Type
Recall that executing the `ListAllTaxDocuments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllTaxDocumentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllTaxDocumentsData {
  taxDocuments: ({
    id: UUIDString;
    filename: string;
    taxYear?: number | null;
    uploadedAt: TimestampString;
    member: {
      id: string;
      displayName: string;
    } & Member_Key;
  } & TaxDocument_Key)[];
}
```
### Using `ListAllTaxDocuments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllTaxDocuments } from '@asv/dataconnect-generated';


// Call the `listAllTaxDocuments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllTaxDocuments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllTaxDocuments(dataConnect);

console.log(data.taxDocuments);

// Or, you can use the `Promise` API.
listAllTaxDocuments().then((response) => {
  const data = response.data;
  console.log(data.taxDocuments);
});
```

### Using `ListAllTaxDocuments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllTaxDocumentsRef } from '@asv/dataconnect-generated';


// Call the `listAllTaxDocumentsRef()` function to get a reference to the query.
const ref = listAllTaxDocumentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllTaxDocumentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.taxDocuments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.taxDocuments);
});
```

## ListTaxDocumentsByMember
You can execute the `ListTaxDocumentsByMember` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listTaxDocumentsByMember(vars: ListTaxDocumentsByMemberVariables, options?: ExecuteQueryOptions): QueryPromise<ListTaxDocumentsByMemberData, ListTaxDocumentsByMemberVariables>;

interface ListTaxDocumentsByMemberRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListTaxDocumentsByMemberVariables): QueryRef<ListTaxDocumentsByMemberData, ListTaxDocumentsByMemberVariables>;
}
export const listTaxDocumentsByMemberRef: ListTaxDocumentsByMemberRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTaxDocumentsByMember(dc: DataConnect, vars: ListTaxDocumentsByMemberVariables, options?: ExecuteQueryOptions): QueryPromise<ListTaxDocumentsByMemberData, ListTaxDocumentsByMemberVariables>;

interface ListTaxDocumentsByMemberRef {
  ...
  (dc: DataConnect, vars: ListTaxDocumentsByMemberVariables): QueryRef<ListTaxDocumentsByMemberData, ListTaxDocumentsByMemberVariables>;
}
export const listTaxDocumentsByMemberRef: ListTaxDocumentsByMemberRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTaxDocumentsByMemberRef:
```typescript
const name = listTaxDocumentsByMemberRef.operationName;
console.log(name);
```

### Variables
The `ListTaxDocumentsByMember` query requires an argument of type `ListTaxDocumentsByMemberVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListTaxDocumentsByMemberVariables {
  memberId: string;
}
```
### Return Type
Recall that executing the `ListTaxDocumentsByMember` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTaxDocumentsByMemberData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTaxDocumentsByMemberData {
  taxDocuments: ({
    id: UUIDString;
    filename: string;
    taxYear?: number | null;
    uploadedAt: TimestampString;
  } & TaxDocument_Key)[];
}
```
### Using `ListTaxDocumentsByMember`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTaxDocumentsByMember, ListTaxDocumentsByMemberVariables } from '@asv/dataconnect-generated';

// The `ListTaxDocumentsByMember` query requires an argument of type `ListTaxDocumentsByMemberVariables`:
const listTaxDocumentsByMemberVars: ListTaxDocumentsByMemberVariables = {
  memberId: ..., 
};

// Call the `listTaxDocumentsByMember()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTaxDocumentsByMember(listTaxDocumentsByMemberVars);
// Variables can be defined inline as well.
const { data } = await listTaxDocumentsByMember({ memberId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTaxDocumentsByMember(dataConnect, listTaxDocumentsByMemberVars);

console.log(data.taxDocuments);

// Or, you can use the `Promise` API.
listTaxDocumentsByMember(listTaxDocumentsByMemberVars).then((response) => {
  const data = response.data;
  console.log(data.taxDocuments);
});
```

### Using `ListTaxDocumentsByMember`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTaxDocumentsByMemberRef, ListTaxDocumentsByMemberVariables } from '@asv/dataconnect-generated';

// The `ListTaxDocumentsByMember` query requires an argument of type `ListTaxDocumentsByMemberVariables`:
const listTaxDocumentsByMemberVars: ListTaxDocumentsByMemberVariables = {
  memberId: ..., 
};

// Call the `listTaxDocumentsByMemberRef()` function to get a reference to the query.
const ref = listTaxDocumentsByMemberRef(listTaxDocumentsByMemberVars);
// Variables can be defined inline as well.
const ref = listTaxDocumentsByMemberRef({ memberId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTaxDocumentsByMemberRef(dataConnect, listTaxDocumentsByMemberVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.taxDocuments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.taxDocuments);
});
```

## GetTaxDocumentById
You can execute the `GetTaxDocumentById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getTaxDocumentById(vars: GetTaxDocumentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTaxDocumentByIdData, GetTaxDocumentByIdVariables>;

interface GetTaxDocumentByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTaxDocumentByIdVariables): QueryRef<GetTaxDocumentByIdData, GetTaxDocumentByIdVariables>;
}
export const getTaxDocumentByIdRef: GetTaxDocumentByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTaxDocumentById(dc: DataConnect, vars: GetTaxDocumentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetTaxDocumentByIdData, GetTaxDocumentByIdVariables>;

interface GetTaxDocumentByIdRef {
  ...
  (dc: DataConnect, vars: GetTaxDocumentByIdVariables): QueryRef<GetTaxDocumentByIdData, GetTaxDocumentByIdVariables>;
}
export const getTaxDocumentByIdRef: GetTaxDocumentByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTaxDocumentByIdRef:
```typescript
const name = getTaxDocumentByIdRef.operationName;
console.log(name);
```

### Variables
The `GetTaxDocumentById` query requires an argument of type `GetTaxDocumentByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTaxDocumentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetTaxDocumentById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTaxDocumentByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTaxDocumentByIdData {
  taxDocument?: {
    id: UUIDString;
    driveFileId: string;
    filename: string;
    member: {
      id: string;
    } & Member_Key;
  } & TaxDocument_Key;
}
```
### Using `GetTaxDocumentById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTaxDocumentById, GetTaxDocumentByIdVariables } from '@asv/dataconnect-generated';

// The `GetTaxDocumentById` query requires an argument of type `GetTaxDocumentByIdVariables`:
const getTaxDocumentByIdVars: GetTaxDocumentByIdVariables = {
  id: ..., 
};

// Call the `getTaxDocumentById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTaxDocumentById(getTaxDocumentByIdVars);
// Variables can be defined inline as well.
const { data } = await getTaxDocumentById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTaxDocumentById(dataConnect, getTaxDocumentByIdVars);

console.log(data.taxDocument);

// Or, you can use the `Promise` API.
getTaxDocumentById(getTaxDocumentByIdVars).then((response) => {
  const data = response.data;
  console.log(data.taxDocument);
});
```

### Using `GetTaxDocumentById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTaxDocumentByIdRef, GetTaxDocumentByIdVariables } from '@asv/dataconnect-generated';

// The `GetTaxDocumentById` query requires an argument of type `GetTaxDocumentByIdVariables`:
const getTaxDocumentByIdVars: GetTaxDocumentByIdVariables = {
  id: ..., 
};

// Call the `getTaxDocumentByIdRef()` function to get a reference to the query.
const ref = getTaxDocumentByIdRef(getTaxDocumentByIdVars);
// Variables can be defined inline as well.
const ref = getTaxDocumentByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTaxDocumentByIdRef(dataConnect, getTaxDocumentByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.taxDocument);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.taxDocument);
});
```

## GetMemberByAuthUid
You can execute the `GetMemberByAuthUid` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getMemberByAuthUid(vars: GetMemberByAuthUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;

interface GetMemberByAuthUidRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMemberByAuthUidVariables): QueryRef<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;
}
export const getMemberByAuthUidRef: GetMemberByAuthUidRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMemberByAuthUid(dc: DataConnect, vars: GetMemberByAuthUidVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;

interface GetMemberByAuthUidRef {
  ...
  (dc: DataConnect, vars: GetMemberByAuthUidVariables): QueryRef<GetMemberByAuthUidData, GetMemberByAuthUidVariables>;
}
export const getMemberByAuthUidRef: GetMemberByAuthUidRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMemberByAuthUidRef:
```typescript
const name = getMemberByAuthUidRef.operationName;
console.log(name);
```

### Variables
The `GetMemberByAuthUid` query requires an argument of type `GetMemberByAuthUidVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMemberByAuthUidVariables {
  authUid: string;
}
```
### Return Type
Recall that executing the `GetMemberByAuthUid` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMemberByAuthUidData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMemberByAuthUidData {
  members: ({
    id: string;
    displayName: string;
    role: Role;
    status: MemberStatus;
  } & Member_Key)[];
}
```
### Using `GetMemberByAuthUid`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMemberByAuthUid, GetMemberByAuthUidVariables } from '@asv/dataconnect-generated';

// The `GetMemberByAuthUid` query requires an argument of type `GetMemberByAuthUidVariables`:
const getMemberByAuthUidVars: GetMemberByAuthUidVariables = {
  authUid: ..., 
};

// Call the `getMemberByAuthUid()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMemberByAuthUid(getMemberByAuthUidVars);
// Variables can be defined inline as well.
const { data } = await getMemberByAuthUid({ authUid: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMemberByAuthUid(dataConnect, getMemberByAuthUidVars);

console.log(data.members);

// Or, you can use the `Promise` API.
getMemberByAuthUid(getMemberByAuthUidVars).then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

### Using `GetMemberByAuthUid`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMemberByAuthUidRef, GetMemberByAuthUidVariables } from '@asv/dataconnect-generated';

// The `GetMemberByAuthUid` query requires an argument of type `GetMemberByAuthUidVariables`:
const getMemberByAuthUidVars: GetMemberByAuthUidVariables = {
  authUid: ..., 
};

// Call the `getMemberByAuthUidRef()` function to get a reference to the query.
const ref = getMemberByAuthUidRef(getMemberByAuthUidVars);
// Variables can be defined inline as well.
const ref = getMemberByAuthUidRef({ authUid: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMemberByAuthUidRef(dataConnect, getMemberByAuthUidVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.members);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

## ListAllMembers
You can execute the `ListAllMembers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAllMembers(options?: ExecuteQueryOptions): QueryPromise<ListAllMembersData, undefined>;

interface ListAllMembersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMembersData, undefined>;
}
export const listAllMembersRef: ListAllMembersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllMembers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMembersData, undefined>;

interface ListAllMembersRef {
  ...
  (dc: DataConnect): QueryRef<ListAllMembersData, undefined>;
}
export const listAllMembersRef: ListAllMembersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllMembersRef:
```typescript
const name = listAllMembersRef.operationName;
console.log(name);
```

### Variables
The `ListAllMembers` query has no variables.
### Return Type
Recall that executing the `ListAllMembers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllMembersData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
    phoneNumber?: string | null;
    aiChatEnabled: boolean;
    lockedScenario?: Scenario | null;
    duesSentForYear?: number | null;
    createdAt: TimestampString;
  } & Member_Key)[];
}
```
### Using `ListAllMembers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllMembers } from '@asv/dataconnect-generated';


// Call the `listAllMembers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllMembers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllMembers(dataConnect);

console.log(data.members);

// Or, you can use the `Promise` API.
listAllMembers().then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

### Using `ListAllMembers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllMembersRef } from '@asv/dataconnect-generated';


// Call the `listAllMembersRef()` function to get a reference to the query.
const ref = listAllMembersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllMembersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.members);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.members);
});
```

## GetMemberById
You can execute the `GetMemberById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getMemberById(vars: GetMemberByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByIdData, GetMemberByIdVariables>;

interface GetMemberByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMemberByIdVariables): QueryRef<GetMemberByIdData, GetMemberByIdVariables>;
}
export const getMemberByIdRef: GetMemberByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMemberById(dc: DataConnect, vars: GetMemberByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetMemberByIdData, GetMemberByIdVariables>;

interface GetMemberByIdRef {
  ...
  (dc: DataConnect, vars: GetMemberByIdVariables): QueryRef<GetMemberByIdData, GetMemberByIdVariables>;
}
export const getMemberByIdRef: GetMemberByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMemberByIdRef:
```typescript
const name = getMemberByIdRef.operationName;
console.log(name);
```

### Variables
The `GetMemberById` query requires an argument of type `GetMemberByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMemberByIdVariables {
  id: string;
}
```
### Return Type
Recall that executing the `GetMemberById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMemberByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
    phoneNumber?: string | null;
    professionalProfileUrl?: string | null;
    interests?: string[] | null;
    expertise?: string[] | null;
    membershipType: MembershipType;
    aiChatEnabled: boolean;
    lockedScenario?: Scenario | null;
    duesSentForYear?: number | null;
    createdAt: TimestampString;
  } & Member_Key;
}
```
### Using `GetMemberById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMemberById, GetMemberByIdVariables } from '@asv/dataconnect-generated';

// The `GetMemberById` query requires an argument of type `GetMemberByIdVariables`:
const getMemberByIdVars: GetMemberByIdVariables = {
  id: ..., 
};

// Call the `getMemberById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMemberById(getMemberByIdVars);
// Variables can be defined inline as well.
const { data } = await getMemberById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMemberById(dataConnect, getMemberByIdVars);

console.log(data.member);

// Or, you can use the `Promise` API.
getMemberById(getMemberByIdVars).then((response) => {
  const data = response.data;
  console.log(data.member);
});
```

### Using `GetMemberById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMemberByIdRef, GetMemberByIdVariables } from '@asv/dataconnect-generated';

// The `GetMemberById` query requires an argument of type `GetMemberByIdVariables`:
const getMemberByIdVars: GetMemberByIdVariables = {
  id: ..., 
};

// Call the `getMemberByIdRef()` function to get a reference to the query.
const ref = getMemberByIdRef(getMemberByIdVars);
// Variables can be defined inline as well.
const ref = getMemberByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMemberByIdRef(dataConnect, getMemberByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.member);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.member);
});
```

## ListCustomEventTypes
You can execute the `ListCustomEventTypes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listCustomEventTypes(options?: ExecuteQueryOptions): QueryPromise<ListCustomEventTypesData, undefined>;

interface ListCustomEventTypesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCustomEventTypesData, undefined>;
}
export const listCustomEventTypesRef: ListCustomEventTypesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCustomEventTypes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCustomEventTypesData, undefined>;

interface ListCustomEventTypesRef {
  ...
  (dc: DataConnect): QueryRef<ListCustomEventTypesData, undefined>;
}
export const listCustomEventTypesRef: ListCustomEventTypesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCustomEventTypesRef:
```typescript
const name = listCustomEventTypesRef.operationName;
console.log(name);
```

### Variables
The `ListCustomEventTypes` query has no variables.
### Return Type
Recall that executing the `ListCustomEventTypes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCustomEventTypesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCustomEventTypesData {
  eventTypeDefinitions: ({
    id: UUIDString;
    key: string;
    label: string;
    description?: string | null;
  } & EventTypeDefinition_Key)[];
}
```
### Using `ListCustomEventTypes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCustomEventTypes } from '@asv/dataconnect-generated';


// Call the `listCustomEventTypes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCustomEventTypes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCustomEventTypes(dataConnect);

console.log(data.eventTypeDefinitions);

// Or, you can use the `Promise` API.
listCustomEventTypes().then((response) => {
  const data = response.data;
  console.log(data.eventTypeDefinitions);
});
```

### Using `ListCustomEventTypes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCustomEventTypesRef } from '@asv/dataconnect-generated';


// Call the `listCustomEventTypesRef()` function to get a reference to the query.
const ref = listCustomEventTypesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCustomEventTypesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.eventTypeDefinitions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.eventTypeDefinitions);
});
```

## ListAiPromptSettings
You can execute the `ListAiPromptSettings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAiPromptSettings(options?: ExecuteQueryOptions): QueryPromise<ListAiPromptSettingsData, undefined>;

interface ListAiPromptSettingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAiPromptSettingsData, undefined>;
}
export const listAiPromptSettingsRef: ListAiPromptSettingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAiPromptSettings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAiPromptSettingsData, undefined>;

interface ListAiPromptSettingsRef {
  ...
  (dc: DataConnect): QueryRef<ListAiPromptSettingsData, undefined>;
}
export const listAiPromptSettingsRef: ListAiPromptSettingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAiPromptSettingsRef:
```typescript
const name = listAiPromptSettingsRef.operationName;
console.log(name);
```

### Variables
The `ListAiPromptSettings` query has no variables.
### Return Type
Recall that executing the `ListAiPromptSettings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAiPromptSettingsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAiPromptSettingsData {
  aiPromptSettings: ({
    key: string;
    prompt: string;
    updatedAt: TimestampString;
  } & AiPromptSetting_Key)[];
}
```
### Using `ListAiPromptSettings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAiPromptSettings } from '@asv/dataconnect-generated';


// Call the `listAiPromptSettings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAiPromptSettings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAiPromptSettings(dataConnect);

console.log(data.aiPromptSettings);

// Or, you can use the `Promise` API.
listAiPromptSettings().then((response) => {
  const data = response.data;
  console.log(data.aiPromptSettings);
});
```

### Using `ListAiPromptSettings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAiPromptSettingsRef } from '@asv/dataconnect-generated';


// Call the `listAiPromptSettingsRef()` function to get a reference to the query.
const ref = listAiPromptSettingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAiPromptSettingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.aiPromptSettings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.aiPromptSettings);
});
```

## ListAiProviderSettings
You can execute the `ListAiProviderSettings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAiProviderSettings(options?: ExecuteQueryOptions): QueryPromise<ListAiProviderSettingsData, undefined>;

interface ListAiProviderSettingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAiProviderSettingsData, undefined>;
}
export const listAiProviderSettingsRef: ListAiProviderSettingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAiProviderSettings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAiProviderSettingsData, undefined>;

interface ListAiProviderSettingsRef {
  ...
  (dc: DataConnect): QueryRef<ListAiProviderSettingsData, undefined>;
}
export const listAiProviderSettingsRef: ListAiProviderSettingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAiProviderSettingsRef:
```typescript
const name = listAiProviderSettingsRef.operationName;
console.log(name);
```

### Variables
The `ListAiProviderSettings` query has no variables.
### Return Type
Recall that executing the `ListAiProviderSettings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAiProviderSettingsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAiProviderSettingsData {
  aiProviderSettings: ({
    key: string;
    provider: string;
    openrouterModel?: string | null;
    openrouterProviderSlug?: string | null;
    searchBackend: string;
    updatedAt: TimestampString;
  } & AiProviderSetting_Key)[];
}
```
### Using `ListAiProviderSettings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAiProviderSettings } from '@asv/dataconnect-generated';


// Call the `listAiProviderSettings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAiProviderSettings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAiProviderSettings(dataConnect);

console.log(data.aiProviderSettings);

// Or, you can use the `Promise` API.
listAiProviderSettings().then((response) => {
  const data = response.data;
  console.log(data.aiProviderSettings);
});
```

### Using `ListAiProviderSettings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAiProviderSettingsRef } from '@asv/dataconnect-generated';


// Call the `listAiProviderSettingsRef()` function to get a reference to the query.
const ref = listAiProviderSettingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAiProviderSettingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.aiProviderSettings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.aiProviderSettings);
});
```

## ListAppSettings
You can execute the `ListAppSettings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listAppSettings(options?: ExecuteQueryOptions): QueryPromise<ListAppSettingsData, undefined>;

interface ListAppSettingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAppSettingsData, undefined>;
}
export const listAppSettingsRef: ListAppSettingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAppSettings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAppSettingsData, undefined>;

interface ListAppSettingsRef {
  ...
  (dc: DataConnect): QueryRef<ListAppSettingsData, undefined>;
}
export const listAppSettingsRef: ListAppSettingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAppSettingsRef:
```typescript
const name = listAppSettingsRef.operationName;
console.log(name);
```

### Variables
The `ListAppSettings` query has no variables.
### Return Type
Recall that executing the `ListAppSettings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAppSettingsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAppSettingsData {
  appSettings: ({
    key: string;
    value: string;
  } & AppSetting_Key)[];
}
```
### Using `ListAppSettings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAppSettings } from '@asv/dataconnect-generated';


// Call the `listAppSettings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAppSettings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAppSettings(dataConnect);

console.log(data.appSettings);

// Or, you can use the `Promise` API.
listAppSettings().then((response) => {
  const data = response.data;
  console.log(data.appSettings);
});
```

### Using `ListAppSettings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAppSettingsRef } from '@asv/dataconnect-generated';


// Call the `listAppSettingsRef()` function to get a reference to the query.
const ref = listAppSettingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAppSettingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.appSettings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.appSettings);
});
```

## ListDeals
You can execute the `ListDeals` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDeals(options?: ExecuteQueryOptions): QueryPromise<ListDealsData, undefined>;

interface ListDealsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealsData, undefined>;
}
export const listDealsRef: ListDealsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDeals(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealsData, undefined>;

interface ListDealsRef {
  ...
  (dc: DataConnect): QueryRef<ListDealsData, undefined>;
}
export const listDealsRef: ListDealsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealsRef:
```typescript
const name = listDealsRef.operationName;
console.log(name);
```

### Variables
The `ListDeals` query has no variables.
### Return Type
Recall that executing the `ListDeals` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealsData {
  deals: ({
    id: UUIDString;
    companyName: string;
    companyEmail: string;
    companyUrl?: string | null;
    entrepreneurName: string;
    entrepreneurEmail: string;
    entrepreneurPhone: string;
    executiveSummary?: string | null;
    teamInformation?: string | null;
    round: FundingRound;
    securityType: SecurityType;
    seekingAmount: number;
    currency: string;
    preMoneyValuation?: number | null;
    valuationCap?: number | null;
    discountPercent?: number | null;
    hasLeadInvestor: boolean;
    leadInvestorName?: string | null;
    willHaveInterestBearingDebtAfterClose: boolean;
    hasExistingInterestBearingDebt: boolean;
    hasRestrictedBusinessLines: boolean;
    raiseMethod?: string | null;
    referredBy?: string | null;
    sector?: string | null;
    keywords?: string[] | null;
    companyLocation?: string | null;
    rank?: number | null;
    stage: DealStage;
    driveFolderUrl?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Deal_Key)[];
}
```
### Using `ListDeals`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDeals } from '@asv/dataconnect-generated';


// Call the `listDeals()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDeals();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDeals(dataConnect);

console.log(data.deals);

// Or, you can use the `Promise` API.
listDeals().then((response) => {
  const data = response.data;
  console.log(data.deals);
});
```

### Using `ListDeals`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealsRef } from '@asv/dataconnect-generated';


// Call the `listDealsRef()` function to get a reference to the query.
const ref = listDealsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.deals);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.deals);
});
```

## GetDealById
You can execute the `GetDealById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getDealById(vars: GetDealByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetDealByIdData, GetDealByIdVariables>;

interface GetDealByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetDealByIdVariables): QueryRef<GetDealByIdData, GetDealByIdVariables>;
}
export const getDealByIdRef: GetDealByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getDealById(dc: DataConnect, vars: GetDealByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetDealByIdData, GetDealByIdVariables>;

interface GetDealByIdRef {
  ...
  (dc: DataConnect, vars: GetDealByIdVariables): QueryRef<GetDealByIdData, GetDealByIdVariables>;
}
export const getDealByIdRef: GetDealByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getDealByIdRef:
```typescript
const name = getDealByIdRef.operationName;
console.log(name);
```

### Variables
The `GetDealById` query requires an argument of type `GetDealByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetDealByIdVariables {
  dealId: UUIDString;
}
```
### Return Type
Recall that executing the `GetDealById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetDealByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetDealByIdData {
  deal?: {
    id: UUIDString;
    companyName: string;
    companyEmail: string;
    companyUrl?: string | null;
    entrepreneurName: string;
    entrepreneurEmail: string;
    entrepreneurPhone: string;
    executiveSummary?: string | null;
    teamInformation?: string | null;
    round: FundingRound;
    securityType: SecurityType;
    seekingAmount: number;
    currency: string;
    preMoneyValuation?: number | null;
    valuationCap?: number | null;
    discountPercent?: number | null;
    hasLeadInvestor: boolean;
    leadInvestorName?: string | null;
    willHaveInterestBearingDebtAfterClose: boolean;
    hasExistingInterestBearingDebt: boolean;
    hasRestrictedBusinessLines: boolean;
    raiseMethod?: string | null;
    referredBy?: string | null;
    sector?: string | null;
    keywords?: string[] | null;
    companyLocation?: string | null;
    rank?: number | null;
    stage: DealStage;
    driveFolderUrl?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Deal_Key;
}
```
### Using `GetDealById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getDealById, GetDealByIdVariables } from '@asv/dataconnect-generated';

// The `GetDealById` query requires an argument of type `GetDealByIdVariables`:
const getDealByIdVars: GetDealByIdVariables = {
  dealId: ..., 
};

// Call the `getDealById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getDealById(getDealByIdVars);
// Variables can be defined inline as well.
const { data } = await getDealById({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getDealById(dataConnect, getDealByIdVars);

console.log(data.deal);

// Or, you can use the `Promise` API.
getDealById(getDealByIdVars).then((response) => {
  const data = response.data;
  console.log(data.deal);
});
```

### Using `GetDealById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getDealByIdRef, GetDealByIdVariables } from '@asv/dataconnect-generated';

// The `GetDealById` query requires an argument of type `GetDealByIdVariables`:
const getDealByIdVars: GetDealByIdVariables = {
  dealId: ..., 
};

// Call the `getDealByIdRef()` function to get a reference to the query.
const ref = getDealByIdRef(getDealByIdVars);
// Variables can be defined inline as well.
const ref = getDealByIdRef({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getDealByIdRef(dataConnect, getDealByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.deal);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.deal);
});
```

## ListDealTags
You can execute the `ListDealTags` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealTags(options?: ExecuteQueryOptions): QueryPromise<ListDealTagsData, undefined>;

interface ListDealTagsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealTagsData, undefined>;
}
export const listDealTagsRef: ListDealTagsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealTags(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealTagsData, undefined>;

interface ListDealTagsRef {
  ...
  (dc: DataConnect): QueryRef<ListDealTagsData, undefined>;
}
export const listDealTagsRef: ListDealTagsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealTagsRef:
```typescript
const name = listDealTagsRef.operationName;
console.log(name);
```

### Variables
The `ListDealTags` query has no variables.
### Return Type
Recall that executing the `ListDealTags` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealTagsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealTagsData {
  dealTags: ({
    id: UUIDString;
    name: string;
    color?: string | null;
  } & DealTag_Key)[];
}
```
### Using `ListDealTags`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealTags } from '@asv/dataconnect-generated';


// Call the `listDealTags()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealTags();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealTags(dataConnect);

console.log(data.dealTags);

// Or, you can use the `Promise` API.
listDealTags().then((response) => {
  const data = response.data;
  console.log(data.dealTags);
});
```

### Using `ListDealTags`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealTagsRef } from '@asv/dataconnect-generated';


// Call the `listDealTagsRef()` function to get a reference to the query.
const ref = listDealTagsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealTagsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealTags);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealTags);
});
```

## ListDealTagAssignments
You can execute the `ListDealTagAssignments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealTagAssignments(options?: ExecuteQueryOptions): QueryPromise<ListDealTagAssignmentsData, undefined>;

interface ListDealTagAssignmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealTagAssignmentsData, undefined>;
}
export const listDealTagAssignmentsRef: ListDealTagAssignmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealTagAssignments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealTagAssignmentsData, undefined>;

interface ListDealTagAssignmentsRef {
  ...
  (dc: DataConnect): QueryRef<ListDealTagAssignmentsData, undefined>;
}
export const listDealTagAssignmentsRef: ListDealTagAssignmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealTagAssignmentsRef:
```typescript
const name = listDealTagAssignmentsRef.operationName;
console.log(name);
```

### Variables
The `ListDealTagAssignments` query has no variables.
### Return Type
Recall that executing the `ListDealTagAssignments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealTagAssignmentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealTagAssignmentsData {
  dealTagAssignments: ({
    deal: {
      id: UUIDString;
    } & Deal_Key;
    tag: {
      id: UUIDString;
    } & DealTag_Key;
  })[];
}
```
### Using `ListDealTagAssignments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealTagAssignments } from '@asv/dataconnect-generated';


// Call the `listDealTagAssignments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealTagAssignments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealTagAssignments(dataConnect);

console.log(data.dealTagAssignments);

// Or, you can use the `Promise` API.
listDealTagAssignments().then((response) => {
  const data = response.data;
  console.log(data.dealTagAssignments);
});
```

### Using `ListDealTagAssignments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealTagAssignmentsRef } from '@asv/dataconnect-generated';


// Call the `listDealTagAssignmentsRef()` function to get a reference to the query.
const ref = listDealTagAssignmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealTagAssignmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealTagAssignments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealTagAssignments);
});
```

## ListDealDocumentsByDeal
You can execute the `ListDealDocumentsByDeal` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealDocumentsByDeal(vars: ListDealDocumentsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealDocumentsByDealData, ListDealDocumentsByDealVariables>;

interface ListDealDocumentsByDealRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDealDocumentsByDealVariables): QueryRef<ListDealDocumentsByDealData, ListDealDocumentsByDealVariables>;
}
export const listDealDocumentsByDealRef: ListDealDocumentsByDealRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealDocumentsByDeal(dc: DataConnect, vars: ListDealDocumentsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealDocumentsByDealData, ListDealDocumentsByDealVariables>;

interface ListDealDocumentsByDealRef {
  ...
  (dc: DataConnect, vars: ListDealDocumentsByDealVariables): QueryRef<ListDealDocumentsByDealData, ListDealDocumentsByDealVariables>;
}
export const listDealDocumentsByDealRef: ListDealDocumentsByDealRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealDocumentsByDealRef:
```typescript
const name = listDealDocumentsByDealRef.operationName;
console.log(name);
```

### Variables
The `ListDealDocumentsByDeal` query requires an argument of type `ListDealDocumentsByDealVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDealDocumentsByDealVariables {
  dealId: UUIDString;
}
```
### Return Type
Recall that executing the `ListDealDocumentsByDeal` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealDocumentsByDealData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealDocumentsByDealData {
  dealDocuments: ({
    id: UUIDString;
    docType: DealDocumentType;
    driveUrl: string;
    filename: string;
    uploadedAt: TimestampString;
  } & DealDocument_Key)[];
}
```
### Using `ListDealDocumentsByDeal`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealDocumentsByDeal, ListDealDocumentsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealDocumentsByDeal` query requires an argument of type `ListDealDocumentsByDealVariables`:
const listDealDocumentsByDealVars: ListDealDocumentsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealDocumentsByDeal()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealDocumentsByDeal(listDealDocumentsByDealVars);
// Variables can be defined inline as well.
const { data } = await listDealDocumentsByDeal({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealDocumentsByDeal(dataConnect, listDealDocumentsByDealVars);

console.log(data.dealDocuments);

// Or, you can use the `Promise` API.
listDealDocumentsByDeal(listDealDocumentsByDealVars).then((response) => {
  const data = response.data;
  console.log(data.dealDocuments);
});
```

### Using `ListDealDocumentsByDeal`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealDocumentsByDealRef, ListDealDocumentsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealDocumentsByDeal` query requires an argument of type `ListDealDocumentsByDealVariables`:
const listDealDocumentsByDealVars: ListDealDocumentsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealDocumentsByDealRef()` function to get a reference to the query.
const ref = listDealDocumentsByDealRef(listDealDocumentsByDealVars);
// Variables can be defined inline as well.
const ref = listDealDocumentsByDealRef({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealDocumentsByDealRef(dataConnect, listDealDocumentsByDealVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealDocuments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealDocuments);
});
```

## ListDealRatingsByDeal
You can execute the `ListDealRatingsByDeal` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealRatingsByDeal(vars: ListDealRatingsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealRatingsByDealData, ListDealRatingsByDealVariables>;

interface ListDealRatingsByDealRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDealRatingsByDealVariables): QueryRef<ListDealRatingsByDealData, ListDealRatingsByDealVariables>;
}
export const listDealRatingsByDealRef: ListDealRatingsByDealRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealRatingsByDeal(dc: DataConnect, vars: ListDealRatingsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealRatingsByDealData, ListDealRatingsByDealVariables>;

interface ListDealRatingsByDealRef {
  ...
  (dc: DataConnect, vars: ListDealRatingsByDealVariables): QueryRef<ListDealRatingsByDealData, ListDealRatingsByDealVariables>;
}
export const listDealRatingsByDealRef: ListDealRatingsByDealRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealRatingsByDealRef:
```typescript
const name = listDealRatingsByDealRef.operationName;
console.log(name);
```

### Variables
The `ListDealRatingsByDeal` query requires an argument of type `ListDealRatingsByDealVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDealRatingsByDealVariables {
  dealId: UUIDString;
}
```
### Return Type
Recall that executing the `ListDealRatingsByDeal` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealRatingsByDealData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealRatingsByDealData {
  dealRatings: ({
    rating: number;
    review?: string | null;
    updatedAt: TimestampString;
    member: {
      id: string;
      displayName: string;
    } & Member_Key;
  })[];
}
```
### Using `ListDealRatingsByDeal`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealRatingsByDeal, ListDealRatingsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealRatingsByDeal` query requires an argument of type `ListDealRatingsByDealVariables`:
const listDealRatingsByDealVars: ListDealRatingsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealRatingsByDeal()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealRatingsByDeal(listDealRatingsByDealVars);
// Variables can be defined inline as well.
const { data } = await listDealRatingsByDeal({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealRatingsByDeal(dataConnect, listDealRatingsByDealVars);

console.log(data.dealRatings);

// Or, you can use the `Promise` API.
listDealRatingsByDeal(listDealRatingsByDealVars).then((response) => {
  const data = response.data;
  console.log(data.dealRatings);
});
```

### Using `ListDealRatingsByDeal`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealRatingsByDealRef, ListDealRatingsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealRatingsByDeal` query requires an argument of type `ListDealRatingsByDealVariables`:
const listDealRatingsByDealVars: ListDealRatingsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealRatingsByDealRef()` function to get a reference to the query.
const ref = listDealRatingsByDealRef(listDealRatingsByDealVars);
// Variables can be defined inline as well.
const ref = listDealRatingsByDealRef({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealRatingsByDealRef(dataConnect, listDealRatingsByDealVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealRatings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealRatings);
});
```

## ListDealRatings
You can execute the `ListDealRatings` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealRatings(options?: ExecuteQueryOptions): QueryPromise<ListDealRatingsData, undefined>;

interface ListDealRatingsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealRatingsData, undefined>;
}
export const listDealRatingsRef: ListDealRatingsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealRatings(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealRatingsData, undefined>;

interface ListDealRatingsRef {
  ...
  (dc: DataConnect): QueryRef<ListDealRatingsData, undefined>;
}
export const listDealRatingsRef: ListDealRatingsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealRatingsRef:
```typescript
const name = listDealRatingsRef.operationName;
console.log(name);
```

### Variables
The `ListDealRatings` query has no variables.
### Return Type
Recall that executing the `ListDealRatings` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealRatingsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealRatingsData {
  dealRatings: ({
    deal: {
      id: UUIDString;
    } & Deal_Key;
    rating: number;
  })[];
}
```
### Using `ListDealRatings`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealRatings } from '@asv/dataconnect-generated';


// Call the `listDealRatings()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealRatings();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealRatings(dataConnect);

console.log(data.dealRatings);

// Or, you can use the `Promise` API.
listDealRatings().then((response) => {
  const data = response.data;
  console.log(data.dealRatings);
});
```

### Using `ListDealRatings`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealRatingsRef } from '@asv/dataconnect-generated';


// Call the `listDealRatingsRef()` function to get a reference to the query.
const ref = listDealRatingsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealRatingsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealRatings);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealRatings);
});
```

## ListDealReviewerMatches
You can execute the `ListDealReviewerMatches` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealReviewerMatches(options?: ExecuteQueryOptions): QueryPromise<ListDealReviewerMatchesData, undefined>;

interface ListDealReviewerMatchesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealReviewerMatchesData, undefined>;
}
export const listDealReviewerMatchesRef: ListDealReviewerMatchesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealReviewerMatches(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealReviewerMatchesData, undefined>;

interface ListDealReviewerMatchesRef {
  ...
  (dc: DataConnect): QueryRef<ListDealReviewerMatchesData, undefined>;
}
export const listDealReviewerMatchesRef: ListDealReviewerMatchesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealReviewerMatchesRef:
```typescript
const name = listDealReviewerMatchesRef.operationName;
console.log(name);
```

### Variables
The `ListDealReviewerMatches` query has no variables.
### Return Type
Recall that executing the `ListDealReviewerMatches` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealReviewerMatchesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealReviewerMatchesData {
  dealReviewerMatches: ({
    deal: {
      id: UUIDString;
    } & Deal_Key;
    member: {
      id: string;
      displayName: string;
      phoneNumber?: string | null;
    } & Member_Key;
    reason: string;
  })[];
}
```
### Using `ListDealReviewerMatches`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealReviewerMatches } from '@asv/dataconnect-generated';


// Call the `listDealReviewerMatches()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealReviewerMatches();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealReviewerMatches(dataConnect);

console.log(data.dealReviewerMatches);

// Or, you can use the `Promise` API.
listDealReviewerMatches().then((response) => {
  const data = response.data;
  console.log(data.dealReviewerMatches);
});
```

### Using `ListDealReviewerMatches`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealReviewerMatchesRef } from '@asv/dataconnect-generated';


// Call the `listDealReviewerMatchesRef()` function to get a reference to the query.
const ref = listDealReviewerMatchesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealReviewerMatchesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealReviewerMatches);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealReviewerMatches);
});
```

## ListDealPitchDecks
You can execute the `ListDealPitchDecks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealPitchDecks(options?: ExecuteQueryOptions): QueryPromise<ListDealPitchDecksData, undefined>;

interface ListDealPitchDecksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDealPitchDecksData, undefined>;
}
export const listDealPitchDecksRef: ListDealPitchDecksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealPitchDecks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListDealPitchDecksData, undefined>;

interface ListDealPitchDecksRef {
  ...
  (dc: DataConnect): QueryRef<ListDealPitchDecksData, undefined>;
}
export const listDealPitchDecksRef: ListDealPitchDecksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealPitchDecksRef:
```typescript
const name = listDealPitchDecksRef.operationName;
console.log(name);
```

### Variables
The `ListDealPitchDecks` query has no variables.
### Return Type
Recall that executing the `ListDealPitchDecks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealPitchDecksData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealPitchDecksData {
  dealDocuments: ({
    deal: {
      id: UUIDString;
    } & Deal_Key;
    driveUrl: string;
  })[];
}
```
### Using `ListDealPitchDecks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealPitchDecks } from '@asv/dataconnect-generated';


// Call the `listDealPitchDecks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealPitchDecks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealPitchDecks(dataConnect);

console.log(data.dealDocuments);

// Or, you can use the `Promise` API.
listDealPitchDecks().then((response) => {
  const data = response.data;
  console.log(data.dealDocuments);
});
```

### Using `ListDealPitchDecks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealPitchDecksRef } from '@asv/dataconnect-generated';


// Call the `listDealPitchDecksRef()` function to get a reference to the query.
const ref = listDealPitchDecksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealPitchDecksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealDocuments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealDocuments);
});
```

## ListDealPublicReviewsByDeal
You can execute the `ListDealPublicReviewsByDeal` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealPublicReviewsByDeal(vars: ListDealPublicReviewsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealPublicReviewsByDealData, ListDealPublicReviewsByDealVariables>;

interface ListDealPublicReviewsByDealRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDealPublicReviewsByDealVariables): QueryRef<ListDealPublicReviewsByDealData, ListDealPublicReviewsByDealVariables>;
}
export const listDealPublicReviewsByDealRef: ListDealPublicReviewsByDealRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealPublicReviewsByDeal(dc: DataConnect, vars: ListDealPublicReviewsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealPublicReviewsByDealData, ListDealPublicReviewsByDealVariables>;

interface ListDealPublicReviewsByDealRef {
  ...
  (dc: DataConnect, vars: ListDealPublicReviewsByDealVariables): QueryRef<ListDealPublicReviewsByDealData, ListDealPublicReviewsByDealVariables>;
}
export const listDealPublicReviewsByDealRef: ListDealPublicReviewsByDealRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealPublicReviewsByDealRef:
```typescript
const name = listDealPublicReviewsByDealRef.operationName;
console.log(name);
```

### Variables
The `ListDealPublicReviewsByDeal` query requires an argument of type `ListDealPublicReviewsByDealVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDealPublicReviewsByDealVariables {
  dealId: UUIDString;
}
```
### Return Type
Recall that executing the `ListDealPublicReviewsByDeal` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealPublicReviewsByDealData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealPublicReviewsByDealData {
  dealPublicReviews: ({
    reviewerName: string;
    reviewerContact: string;
    comment: string;
    createdAt: TimestampString;
  })[];
}
```
### Using `ListDealPublicReviewsByDeal`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealPublicReviewsByDeal, ListDealPublicReviewsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealPublicReviewsByDeal` query requires an argument of type `ListDealPublicReviewsByDealVariables`:
const listDealPublicReviewsByDealVars: ListDealPublicReviewsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealPublicReviewsByDeal()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealPublicReviewsByDeal(listDealPublicReviewsByDealVars);
// Variables can be defined inline as well.
const { data } = await listDealPublicReviewsByDeal({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealPublicReviewsByDeal(dataConnect, listDealPublicReviewsByDealVars);

console.log(data.dealPublicReviews);

// Or, you can use the `Promise` API.
listDealPublicReviewsByDeal(listDealPublicReviewsByDealVars).then((response) => {
  const data = response.data;
  console.log(data.dealPublicReviews);
});
```

### Using `ListDealPublicReviewsByDeal`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealPublicReviewsByDealRef, ListDealPublicReviewsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealPublicReviewsByDeal` query requires an argument of type `ListDealPublicReviewsByDealVariables`:
const listDealPublicReviewsByDealVars: ListDealPublicReviewsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealPublicReviewsByDealRef()` function to get a reference to the query.
const ref = listDealPublicReviewsByDealRef(listDealPublicReviewsByDealVars);
// Variables can be defined inline as well.
const ref = listDealPublicReviewsByDealRef({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealPublicReviewsByDealRef(dataConnect, listDealPublicReviewsByDealVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealPublicReviews);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealPublicReviews);
});
```

## ListDealFundingRoundsByDeal
You can execute the `ListDealFundingRoundsByDeal` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listDealFundingRoundsByDeal(vars: ListDealFundingRoundsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealFundingRoundsByDealData, ListDealFundingRoundsByDealVariables>;

interface ListDealFundingRoundsByDealRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDealFundingRoundsByDealVariables): QueryRef<ListDealFundingRoundsByDealData, ListDealFundingRoundsByDealVariables>;
}
export const listDealFundingRoundsByDealRef: ListDealFundingRoundsByDealRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDealFundingRoundsByDeal(dc: DataConnect, vars: ListDealFundingRoundsByDealVariables, options?: ExecuteQueryOptions): QueryPromise<ListDealFundingRoundsByDealData, ListDealFundingRoundsByDealVariables>;

interface ListDealFundingRoundsByDealRef {
  ...
  (dc: DataConnect, vars: ListDealFundingRoundsByDealVariables): QueryRef<ListDealFundingRoundsByDealData, ListDealFundingRoundsByDealVariables>;
}
export const listDealFundingRoundsByDealRef: ListDealFundingRoundsByDealRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDealFundingRoundsByDealRef:
```typescript
const name = listDealFundingRoundsByDealRef.operationName;
console.log(name);
```

### Variables
The `ListDealFundingRoundsByDeal` query requires an argument of type `ListDealFundingRoundsByDealVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDealFundingRoundsByDealVariables {
  dealId: UUIDString;
}
```
### Return Type
Recall that executing the `ListDealFundingRoundsByDeal` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDealFundingRoundsByDealData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDealFundingRoundsByDealData {
  dealFundingRoundEntries: ({
    id: UUIDString;
    round: FundingRound;
    amount: number;
    currency: string;
  } & DealFundingRoundEntry_Key)[];
}
```
### Using `ListDealFundingRoundsByDeal`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDealFundingRoundsByDeal, ListDealFundingRoundsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealFundingRoundsByDeal` query requires an argument of type `ListDealFundingRoundsByDealVariables`:
const listDealFundingRoundsByDealVars: ListDealFundingRoundsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealFundingRoundsByDeal()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDealFundingRoundsByDeal(listDealFundingRoundsByDealVars);
// Variables can be defined inline as well.
const { data } = await listDealFundingRoundsByDeal({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDealFundingRoundsByDeal(dataConnect, listDealFundingRoundsByDealVars);

console.log(data.dealFundingRoundEntries);

// Or, you can use the `Promise` API.
listDealFundingRoundsByDeal(listDealFundingRoundsByDealVars).then((response) => {
  const data = response.data;
  console.log(data.dealFundingRoundEntries);
});
```

### Using `ListDealFundingRoundsByDeal`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDealFundingRoundsByDealRef, ListDealFundingRoundsByDealVariables } from '@asv/dataconnect-generated';

// The `ListDealFundingRoundsByDeal` query requires an argument of type `ListDealFundingRoundsByDealVariables`:
const listDealFundingRoundsByDealVars: ListDealFundingRoundsByDealVariables = {
  dealId: ..., 
};

// Call the `listDealFundingRoundsByDealRef()` function to get a reference to the query.
const ref = listDealFundingRoundsByDealRef(listDealFundingRoundsByDealVars);
// Variables can be defined inline as well.
const ref = listDealFundingRoundsByDealRef({ dealId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDealFundingRoundsByDealRef(dataConnect, listDealFundingRoundsByDealVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dealFundingRoundEntries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dealFundingRoundEntries);
});
```

## GetOrganizationMembership
You can execute the `GetOrganizationMembership` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getOrganizationMembership(vars: GetOrganizationMembershipVariables, options?: ExecuteQueryOptions): QueryPromise<GetOrganizationMembershipData, GetOrganizationMembershipVariables>;

interface GetOrganizationMembershipRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetOrganizationMembershipVariables): QueryRef<GetOrganizationMembershipData, GetOrganizationMembershipVariables>;
}
export const getOrganizationMembershipRef: GetOrganizationMembershipRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getOrganizationMembership(dc: DataConnect, vars: GetOrganizationMembershipVariables, options?: ExecuteQueryOptions): QueryPromise<GetOrganizationMembershipData, GetOrganizationMembershipVariables>;

interface GetOrganizationMembershipRef {
  ...
  (dc: DataConnect, vars: GetOrganizationMembershipVariables): QueryRef<GetOrganizationMembershipData, GetOrganizationMembershipVariables>;
}
export const getOrganizationMembershipRef: GetOrganizationMembershipRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getOrganizationMembershipRef:
```typescript
const name = getOrganizationMembershipRef.operationName;
console.log(name);
```

### Variables
The `GetOrganizationMembership` query requires an argument of type `GetOrganizationMembershipVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetOrganizationMembershipVariables {
  memberId: string;
}
```
### Return Type
Recall that executing the `GetOrganizationMembership` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetOrganizationMembershipData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetOrganizationMembershipData {
  organizationMembers: ({
    id: UUIDString;
    organization: {
      id: UUIDString;
      name: string;
    } & Organization_Key;
  } & OrganizationMember_Key)[];
}
```
### Using `GetOrganizationMembership`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getOrganizationMembership, GetOrganizationMembershipVariables } from '@asv/dataconnect-generated';

// The `GetOrganizationMembership` query requires an argument of type `GetOrganizationMembershipVariables`:
const getOrganizationMembershipVars: GetOrganizationMembershipVariables = {
  memberId: ..., 
};

// Call the `getOrganizationMembership()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getOrganizationMembership(getOrganizationMembershipVars);
// Variables can be defined inline as well.
const { data } = await getOrganizationMembership({ memberId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getOrganizationMembership(dataConnect, getOrganizationMembershipVars);

console.log(data.organizationMembers);

// Or, you can use the `Promise` API.
getOrganizationMembership(getOrganizationMembershipVars).then((response) => {
  const data = response.data;
  console.log(data.organizationMembers);
});
```

### Using `GetOrganizationMembership`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getOrganizationMembershipRef, GetOrganizationMembershipVariables } from '@asv/dataconnect-generated';

// The `GetOrganizationMembership` query requires an argument of type `GetOrganizationMembershipVariables`:
const getOrganizationMembershipVars: GetOrganizationMembershipVariables = {
  memberId: ..., 
};

// Call the `getOrganizationMembershipRef()` function to get a reference to the query.
const ref = getOrganizationMembershipRef(getOrganizationMembershipVars);
// Variables can be defined inline as well.
const ref = getOrganizationMembershipRef({ memberId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getOrganizationMembershipRef(dataConnect, getOrganizationMembershipVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.organizationMembers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.organizationMembers);
});
```

## ListRealEstateInvestments
You can execute the `ListRealEstateInvestments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listRealEstateInvestments(options?: ExecuteQueryOptions): QueryPromise<ListRealEstateInvestmentsData, undefined>;

interface ListRealEstateInvestmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRealEstateInvestmentsData, undefined>;
}
export const listRealEstateInvestmentsRef: ListRealEstateInvestmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRealEstateInvestments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateInvestmentsData, undefined>;

interface ListRealEstateInvestmentsRef {
  ...
  (dc: DataConnect): QueryRef<ListRealEstateInvestmentsData, undefined>;
}
export const listRealEstateInvestmentsRef: ListRealEstateInvestmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRealEstateInvestmentsRef:
```typescript
const name = listRealEstateInvestmentsRef.operationName;
console.log(name);
```

### Variables
The `ListRealEstateInvestments` query has no variables.
### Return Type
Recall that executing the `ListRealEstateInvestments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRealEstateInvestmentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRealEstateInvestmentsData {
  realEstateInvestments: ({
    id: UUIDString;
    name: string;
    kind: RealEstateKind;
    status: RealEstateStatus;
    currency: string;
    defaultFxRateToUsd: number;
    carryPercent: number;
    firstInvestmentDate?: DateString | null;
    estimatedCompletionDate?: DateString | null;
    actualCompletionDate?: DateString | null;
    saleDate?: DateString | null;
    totalPropertyCost?: number | null;
    salePrice?: number | null;
    scheduleDocUrl?: string | null;
    transactionSheetUrl?: string | null;
    driveFolderUrl?: string | null;
    transactionSheetId?: string | null;
    developerName?: string | null;
    projectName?: string | null;
    locationLabel?: string | null;
    unitIdentifier?: string | null;
    publicBlurb?: string | null;
    brochureDriveFileId?: string | null;
    showPublicly: boolean;
  } & RealEstateInvestment_Key)[];
}
```
### Using `ListRealEstateInvestments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRealEstateInvestments } from '@asv/dataconnect-generated';


// Call the `listRealEstateInvestments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRealEstateInvestments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRealEstateInvestments(dataConnect);

console.log(data.realEstateInvestments);

// Or, you can use the `Promise` API.
listRealEstateInvestments().then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestments);
});
```

### Using `ListRealEstateInvestments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRealEstateInvestmentsRef } from '@asv/dataconnect-generated';


// Call the `listRealEstateInvestmentsRef()` function to get a reference to the query.
const ref = listRealEstateInvestmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRealEstateInvestmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateInvestments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestments);
});
```

## GetRealEstateInvestmentById
You can execute the `GetRealEstateInvestmentById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getRealEstateInvestmentById(vars: GetRealEstateInvestmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRealEstateInvestmentByIdData, GetRealEstateInvestmentByIdVariables>;

interface GetRealEstateInvestmentByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRealEstateInvestmentByIdVariables): QueryRef<GetRealEstateInvestmentByIdData, GetRealEstateInvestmentByIdVariables>;
}
export const getRealEstateInvestmentByIdRef: GetRealEstateInvestmentByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRealEstateInvestmentById(dc: DataConnect, vars: GetRealEstateInvestmentByIdVariables, options?: ExecuteQueryOptions): QueryPromise<GetRealEstateInvestmentByIdData, GetRealEstateInvestmentByIdVariables>;

interface GetRealEstateInvestmentByIdRef {
  ...
  (dc: DataConnect, vars: GetRealEstateInvestmentByIdVariables): QueryRef<GetRealEstateInvestmentByIdData, GetRealEstateInvestmentByIdVariables>;
}
export const getRealEstateInvestmentByIdRef: GetRealEstateInvestmentByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRealEstateInvestmentByIdRef:
```typescript
const name = getRealEstateInvestmentByIdRef.operationName;
console.log(name);
```

### Variables
The `GetRealEstateInvestmentById` query requires an argument of type `GetRealEstateInvestmentByIdVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRealEstateInvestmentByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetRealEstateInvestmentById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRealEstateInvestmentByIdData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRealEstateInvestmentByIdData {
  realEstateInvestment?: {
    id: UUIDString;
    name: string;
    kind: RealEstateKind;
    status: RealEstateStatus;
    currency: string;
    defaultFxRateToUsd: number;
    carryPercent: number;
    firstInvestmentDate?: DateString | null;
    estimatedCompletionDate?: DateString | null;
    actualCompletionDate?: DateString | null;
    saleDate?: DateString | null;
    totalPropertyCost?: number | null;
    salePrice?: number | null;
    scheduleDocUrl?: string | null;
    transactionSheetUrl?: string | null;
    driveFolderUrl?: string | null;
    transactionSheetId?: string | null;
    developerName?: string | null;
    projectName?: string | null;
    locationLabel?: string | null;
    unitIdentifier?: string | null;
    publicBlurb?: string | null;
    brochureDriveFileId?: string | null;
    showPublicly: boolean;
  } & RealEstateInvestment_Key;
}
```
### Using `GetRealEstateInvestmentById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRealEstateInvestmentById, GetRealEstateInvestmentByIdVariables } from '@asv/dataconnect-generated';

// The `GetRealEstateInvestmentById` query requires an argument of type `GetRealEstateInvestmentByIdVariables`:
const getRealEstateInvestmentByIdVars: GetRealEstateInvestmentByIdVariables = {
  id: ..., 
};

// Call the `getRealEstateInvestmentById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRealEstateInvestmentById(getRealEstateInvestmentByIdVars);
// Variables can be defined inline as well.
const { data } = await getRealEstateInvestmentById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRealEstateInvestmentById(dataConnect, getRealEstateInvestmentByIdVars);

console.log(data.realEstateInvestment);

// Or, you can use the `Promise` API.
getRealEstateInvestmentById(getRealEstateInvestmentByIdVars).then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestment);
});
```

### Using `GetRealEstateInvestmentById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRealEstateInvestmentByIdRef, GetRealEstateInvestmentByIdVariables } from '@asv/dataconnect-generated';

// The `GetRealEstateInvestmentById` query requires an argument of type `GetRealEstateInvestmentByIdVariables`:
const getRealEstateInvestmentByIdVars: GetRealEstateInvestmentByIdVariables = {
  id: ..., 
};

// Call the `getRealEstateInvestmentByIdRef()` function to get a reference to the query.
const ref = getRealEstateInvestmentByIdRef(getRealEstateInvestmentByIdVars);
// Variables can be defined inline as well.
const ref = getRealEstateInvestmentByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRealEstateInvestmentByIdRef(dataConnect, getRealEstateInvestmentByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateInvestment);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestment);
});
```

## ListRealEstatePaymentSchedule
You can execute the `ListRealEstatePaymentSchedule` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listRealEstatePaymentSchedule(vars: ListRealEstatePaymentScheduleVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstatePaymentScheduleData, ListRealEstatePaymentScheduleVariables>;

interface ListRealEstatePaymentScheduleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListRealEstatePaymentScheduleVariables): QueryRef<ListRealEstatePaymentScheduleData, ListRealEstatePaymentScheduleVariables>;
}
export const listRealEstatePaymentScheduleRef: ListRealEstatePaymentScheduleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRealEstatePaymentSchedule(dc: DataConnect, vars: ListRealEstatePaymentScheduleVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstatePaymentScheduleData, ListRealEstatePaymentScheduleVariables>;

interface ListRealEstatePaymentScheduleRef {
  ...
  (dc: DataConnect, vars: ListRealEstatePaymentScheduleVariables): QueryRef<ListRealEstatePaymentScheduleData, ListRealEstatePaymentScheduleVariables>;
}
export const listRealEstatePaymentScheduleRef: ListRealEstatePaymentScheduleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRealEstatePaymentScheduleRef:
```typescript
const name = listRealEstatePaymentScheduleRef.operationName;
console.log(name);
```

### Variables
The `ListRealEstatePaymentSchedule` query requires an argument of type `ListRealEstatePaymentScheduleVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListRealEstatePaymentScheduleVariables {
  investmentId: UUIDString;
}
```
### Return Type
Recall that executing the `ListRealEstatePaymentSchedule` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRealEstatePaymentScheduleData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRealEstatePaymentScheduleData {
  realEstatePaymentSchedules: ({
    id: UUIDString;
    installmentCode?: string | null;
    milestoneLabel?: string | null;
    eventDate?: DateString | null;
    dueDate?: DateString | null;
    percent?: number | null;
    amountDue: number;
    vat: number;
    total: number;
    sortOrder: number;
  } & RealEstatePaymentSchedule_Key)[];
}
```
### Using `ListRealEstatePaymentSchedule`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRealEstatePaymentSchedule, ListRealEstatePaymentScheduleVariables } from '@asv/dataconnect-generated';

// The `ListRealEstatePaymentSchedule` query requires an argument of type `ListRealEstatePaymentScheduleVariables`:
const listRealEstatePaymentScheduleVars: ListRealEstatePaymentScheduleVariables = {
  investmentId: ..., 
};

// Call the `listRealEstatePaymentSchedule()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRealEstatePaymentSchedule(listRealEstatePaymentScheduleVars);
// Variables can be defined inline as well.
const { data } = await listRealEstatePaymentSchedule({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRealEstatePaymentSchedule(dataConnect, listRealEstatePaymentScheduleVars);

console.log(data.realEstatePaymentSchedules);

// Or, you can use the `Promise` API.
listRealEstatePaymentSchedule(listRealEstatePaymentScheduleVars).then((response) => {
  const data = response.data;
  console.log(data.realEstatePaymentSchedules);
});
```

### Using `ListRealEstatePaymentSchedule`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRealEstatePaymentScheduleRef, ListRealEstatePaymentScheduleVariables } from '@asv/dataconnect-generated';

// The `ListRealEstatePaymentSchedule` query requires an argument of type `ListRealEstatePaymentScheduleVariables`:
const listRealEstatePaymentScheduleVars: ListRealEstatePaymentScheduleVariables = {
  investmentId: ..., 
};

// Call the `listRealEstatePaymentScheduleRef()` function to get a reference to the query.
const ref = listRealEstatePaymentScheduleRef(listRealEstatePaymentScheduleVars);
// Variables can be defined inline as well.
const ref = listRealEstatePaymentScheduleRef({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRealEstatePaymentScheduleRef(dataConnect, listRealEstatePaymentScheduleVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstatePaymentSchedules);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstatePaymentSchedules);
});
```

## ListRealEstateLedgerEntries
You can execute the `ListRealEstateLedgerEntries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listRealEstateLedgerEntries(vars: ListRealEstateLedgerEntriesVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateLedgerEntriesData, ListRealEstateLedgerEntriesVariables>;

interface ListRealEstateLedgerEntriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListRealEstateLedgerEntriesVariables): QueryRef<ListRealEstateLedgerEntriesData, ListRealEstateLedgerEntriesVariables>;
}
export const listRealEstateLedgerEntriesRef: ListRealEstateLedgerEntriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRealEstateLedgerEntries(dc: DataConnect, vars: ListRealEstateLedgerEntriesVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateLedgerEntriesData, ListRealEstateLedgerEntriesVariables>;

interface ListRealEstateLedgerEntriesRef {
  ...
  (dc: DataConnect, vars: ListRealEstateLedgerEntriesVariables): QueryRef<ListRealEstateLedgerEntriesData, ListRealEstateLedgerEntriesVariables>;
}
export const listRealEstateLedgerEntriesRef: ListRealEstateLedgerEntriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRealEstateLedgerEntriesRef:
```typescript
const name = listRealEstateLedgerEntriesRef.operationName;
console.log(name);
```

### Variables
The `ListRealEstateLedgerEntries` query requires an argument of type `ListRealEstateLedgerEntriesVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListRealEstateLedgerEntriesVariables {
  investmentId: UUIDString;
}
```
### Return Type
Recall that executing the `ListRealEstateLedgerEntries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRealEstateLedgerEntriesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRealEstateLedgerEntriesData {
  realEstateLedgerEntries: ({
    id: UUIDString;
    type: RealEstateLedgerEntryType;
    eventDate: DateString;
    amountUsd: number;
    amountNative?: number | null;
    fxRateToUsd?: number | null;
    currency: string;
    counterparty?: string | null;
    description?: string | null;
    fundedOutsideHub: boolean;
    cashDirection: number;
    needsReview: boolean;
    sourceSheetRowKey?: string | null;
    sourceSheetRowHash?: string | null;
    reversesEntry?: {
      id: UUIDString;
    } & RealEstateLedgerEntry_Key;
  } & RealEstateLedgerEntry_Key)[];
}
```
### Using `ListRealEstateLedgerEntries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRealEstateLedgerEntries, ListRealEstateLedgerEntriesVariables } from '@asv/dataconnect-generated';

// The `ListRealEstateLedgerEntries` query requires an argument of type `ListRealEstateLedgerEntriesVariables`:
const listRealEstateLedgerEntriesVars: ListRealEstateLedgerEntriesVariables = {
  investmentId: ..., 
};

// Call the `listRealEstateLedgerEntries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRealEstateLedgerEntries(listRealEstateLedgerEntriesVars);
// Variables can be defined inline as well.
const { data } = await listRealEstateLedgerEntries({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRealEstateLedgerEntries(dataConnect, listRealEstateLedgerEntriesVars);

console.log(data.realEstateLedgerEntries);

// Or, you can use the `Promise` API.
listRealEstateLedgerEntries(listRealEstateLedgerEntriesVars).then((response) => {
  const data = response.data;
  console.log(data.realEstateLedgerEntries);
});
```

### Using `ListRealEstateLedgerEntries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRealEstateLedgerEntriesRef, ListRealEstateLedgerEntriesVariables } from '@asv/dataconnect-generated';

// The `ListRealEstateLedgerEntries` query requires an argument of type `ListRealEstateLedgerEntriesVariables`:
const listRealEstateLedgerEntriesVars: ListRealEstateLedgerEntriesVariables = {
  investmentId: ..., 
};

// Call the `listRealEstateLedgerEntriesRef()` function to get a reference to the query.
const ref = listRealEstateLedgerEntriesRef(listRealEstateLedgerEntriesVars);
// Variables can be defined inline as well.
const ref = listRealEstateLedgerEntriesRef({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRealEstateLedgerEntriesRef(dataConnect, listRealEstateLedgerEntriesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateLedgerEntries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateLedgerEntries);
});
```

## ListRealEstateShares
You can execute the `ListRealEstateShares` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listRealEstateShares(vars: ListRealEstateSharesVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateSharesData, ListRealEstateSharesVariables>;

interface ListRealEstateSharesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListRealEstateSharesVariables): QueryRef<ListRealEstateSharesData, ListRealEstateSharesVariables>;
}
export const listRealEstateSharesRef: ListRealEstateSharesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRealEstateShares(dc: DataConnect, vars: ListRealEstateSharesVariables, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateSharesData, ListRealEstateSharesVariables>;

interface ListRealEstateSharesRef {
  ...
  (dc: DataConnect, vars: ListRealEstateSharesVariables): QueryRef<ListRealEstateSharesData, ListRealEstateSharesVariables>;
}
export const listRealEstateSharesRef: ListRealEstateSharesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRealEstateSharesRef:
```typescript
const name = listRealEstateSharesRef.operationName;
console.log(name);
```

### Variables
The `ListRealEstateShares` query requires an argument of type `ListRealEstateSharesVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListRealEstateSharesVariables {
  investmentId: UUIDString;
}
```
### Return Type
Recall that executing the `ListRealEstateShares` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRealEstateSharesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRealEstateSharesData {
  realEstateMemberShares: ({
    id: UUIDString;
    member: {
      id: string;
      displayName: string;
    } & Member_Key;
    shareUnits: number;
    committedAmount?: number | null;
    effectiveFrom: DateString;
    supersededBy?: {
      id: UUIDString;
    } & RealEstateMemberShare_Key;
  } & RealEstateMemberShare_Key)[];
}
```
### Using `ListRealEstateShares`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRealEstateShares, ListRealEstateSharesVariables } from '@asv/dataconnect-generated';

// The `ListRealEstateShares` query requires an argument of type `ListRealEstateSharesVariables`:
const listRealEstateSharesVars: ListRealEstateSharesVariables = {
  investmentId: ..., 
};

// Call the `listRealEstateShares()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRealEstateShares(listRealEstateSharesVars);
// Variables can be defined inline as well.
const { data } = await listRealEstateShares({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRealEstateShares(dataConnect, listRealEstateSharesVars);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
listRealEstateShares(listRealEstateSharesVars).then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

### Using `ListRealEstateShares`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRealEstateSharesRef, ListRealEstateSharesVariables } from '@asv/dataconnect-generated';

// The `ListRealEstateShares` query requires an argument of type `ListRealEstateSharesVariables`:
const listRealEstateSharesVars: ListRealEstateSharesVariables = {
  investmentId: ..., 
};

// Call the `listRealEstateSharesRef()` function to get a reference to the query.
const ref = listRealEstateSharesRef(listRealEstateSharesVars);
// Variables can be defined inline as well.
const ref = listRealEstateSharesRef({ investmentId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRealEstateSharesRef(dataConnect, listRealEstateSharesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

## ListRealEstateRollups
You can execute the `ListRealEstateRollups` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listRealEstateRollups(options?: ExecuteQueryOptions): QueryPromise<ListRealEstateRollupsData, undefined>;

interface ListRealEstateRollupsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRealEstateRollupsData, undefined>;
}
export const listRealEstateRollupsRef: ListRealEstateRollupsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRealEstateRollups(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRealEstateRollupsData, undefined>;

interface ListRealEstateRollupsRef {
  ...
  (dc: DataConnect): QueryRef<ListRealEstateRollupsData, undefined>;
}
export const listRealEstateRollupsRef: ListRealEstateRollupsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRealEstateRollupsRef:
```typescript
const name = listRealEstateRollupsRef.operationName;
console.log(name);
```

### Variables
The `ListRealEstateRollups` query has no variables.
### Return Type
Recall that executing the `ListRealEstateRollups` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRealEstateRollupsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRealEstateRollupsData {
  realEstateRollupCaches: ({
    investmentKey: string;
    kind: RealEstateKind;
    capitalCommittedUsd: number;
    capitalDeployedUsd: number;
    realizedProfitUsd: number;
    cumulativeNetCashFlowUsd: number;
    currentValueUsd: number;
    roi?: number | null;
    irr?: number | null;
  } & RealEstateRollupCache_Key)[];
}
```
### Using `ListRealEstateRollups`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRealEstateRollups } from '@asv/dataconnect-generated';


// Call the `listRealEstateRollups()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRealEstateRollups();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRealEstateRollups(dataConnect);

console.log(data.realEstateRollupCaches);

// Or, you can use the `Promise` API.
listRealEstateRollups().then((response) => {
  const data = response.data;
  console.log(data.realEstateRollupCaches);
});
```

### Using `ListRealEstateRollups`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRealEstateRollupsRef } from '@asv/dataconnect-generated';


// Call the `listRealEstateRollupsRef()` function to get a reference to the query.
const ref = listRealEstateRollupsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRealEstateRollupsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateRollupCaches);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateRollupCaches);
});
```

## ListPublicRealEstateInvestments
You can execute the `ListPublicRealEstateInvestments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listPublicRealEstateInvestments(options?: ExecuteQueryOptions): QueryPromise<ListPublicRealEstateInvestmentsData, undefined>;

interface ListPublicRealEstateInvestmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicRealEstateInvestmentsData, undefined>;
}
export const listPublicRealEstateInvestmentsRef: ListPublicRealEstateInvestmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPublicRealEstateInvestments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPublicRealEstateInvestmentsData, undefined>;

interface ListPublicRealEstateInvestmentsRef {
  ...
  (dc: DataConnect): QueryRef<ListPublicRealEstateInvestmentsData, undefined>;
}
export const listPublicRealEstateInvestmentsRef: ListPublicRealEstateInvestmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPublicRealEstateInvestmentsRef:
```typescript
const name = listPublicRealEstateInvestmentsRef.operationName;
console.log(name);
```

### Variables
The `ListPublicRealEstateInvestments` query has no variables.
### Return Type
Recall that executing the `ListPublicRealEstateInvestments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPublicRealEstateInvestmentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPublicRealEstateInvestmentsData {
  realEstateInvestments: ({
    id: UUIDString;
    name: string;
    developerName?: string | null;
    projectName?: string | null;
    locationLabel?: string | null;
    unitIdentifier?: string | null;
    publicBlurb?: string | null;
    brochureDriveFileId?: string | null;
  } & RealEstateInvestment_Key)[];
}
```
### Using `ListPublicRealEstateInvestments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPublicRealEstateInvestments } from '@asv/dataconnect-generated';


// Call the `listPublicRealEstateInvestments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPublicRealEstateInvestments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPublicRealEstateInvestments(dataConnect);

console.log(data.realEstateInvestments);

// Or, you can use the `Promise` API.
listPublicRealEstateInvestments().then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestments);
});
```

### Using `ListPublicRealEstateInvestments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPublicRealEstateInvestmentsRef } from '@asv/dataconnect-generated';


// Call the `listPublicRealEstateInvestmentsRef()` function to get a reference to the query.
const ref = listPublicRealEstateInvestmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPublicRealEstateInvestmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateInvestments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateInvestments);
});
```

## ListMyRealEstateShares
You can execute the `ListMyRealEstateShares` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMyRealEstateShares(options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateSharesData, undefined>;

interface ListMyRealEstateSharesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyRealEstateSharesData, undefined>;
}
export const listMyRealEstateSharesRef: ListMyRealEstateSharesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyRealEstateShares(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateSharesData, undefined>;

interface ListMyRealEstateSharesRef {
  ...
  (dc: DataConnect): QueryRef<ListMyRealEstateSharesData, undefined>;
}
export const listMyRealEstateSharesRef: ListMyRealEstateSharesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyRealEstateSharesRef:
```typescript
const name = listMyRealEstateSharesRef.operationName;
console.log(name);
```

### Variables
The `ListMyRealEstateShares` query has no variables.
### Return Type
Recall that executing the `ListMyRealEstateShares` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyRealEstateSharesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyRealEstateSharesData {
  realEstateMemberShares: ({
    id: UUIDString;
    shareUnits: number;
    committedAmount?: number | null;
    effectiveFrom: DateString;
    supersededBy?: {
      id: UUIDString;
    } & RealEstateMemberShare_Key;
    investment: {
      id: UUIDString;
      name: string;
      kind: RealEstateKind;
      status: RealEstateStatus;
      currency: string;
      defaultFxRateToUsd: number;
      carryPercent: number;
      firstInvestmentDate?: DateString | null;
      estimatedCompletionDate?: DateString | null;
      actualCompletionDate?: DateString | null;
      saleDate?: DateString | null;
      totalPropertyCost?: number | null;
      salePrice?: number | null;
      scheduleDocUrl?: string | null;
      transactionSheetUrl?: string | null;
      driveFolderUrl?: string | null;
    } & RealEstateInvestment_Key;
  } & RealEstateMemberShare_Key)[];
}
```
### Using `ListMyRealEstateShares`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateShares } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateShares()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyRealEstateShares();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyRealEstateShares(dataConnect);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
listMyRealEstateShares().then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

### Using `ListMyRealEstateShares`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateSharesRef } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateSharesRef()` function to get a reference to the query.
const ref = listMyRealEstateSharesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyRealEstateSharesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

## ListMyRealEstateLedgerEntries
You can execute the `ListMyRealEstateLedgerEntries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMyRealEstateLedgerEntries(options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateLedgerEntriesData, undefined>;

interface ListMyRealEstateLedgerEntriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyRealEstateLedgerEntriesData, undefined>;
}
export const listMyRealEstateLedgerEntriesRef: ListMyRealEstateLedgerEntriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyRealEstateLedgerEntries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateLedgerEntriesData, undefined>;

interface ListMyRealEstateLedgerEntriesRef {
  ...
  (dc: DataConnect): QueryRef<ListMyRealEstateLedgerEntriesData, undefined>;
}
export const listMyRealEstateLedgerEntriesRef: ListMyRealEstateLedgerEntriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyRealEstateLedgerEntriesRef:
```typescript
const name = listMyRealEstateLedgerEntriesRef.operationName;
console.log(name);
```

### Variables
The `ListMyRealEstateLedgerEntries` query has no variables.
### Return Type
Recall that executing the `ListMyRealEstateLedgerEntries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyRealEstateLedgerEntriesData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyRealEstateLedgerEntriesData {
  realEstateLedgerEntries: ({
    id: UUIDString;
    type: RealEstateLedgerEntryType;
    eventDate: DateString;
    amountUsd: number;
    amountNative?: number | null;
    fxRateToUsd?: number | null;
    currency: string;
    counterparty?: string | null;
    description?: string | null;
    fundedOutsideHub: boolean;
    cashDirection: number;
    needsReview: boolean;
    sourceSheetRowKey?: string | null;
    sourceSheetRowHash?: string | null;
    reversesEntry?: {
      id: UUIDString;
    } & RealEstateLedgerEntry_Key;
    investment: {
      id: UUIDString;
    } & RealEstateInvestment_Key;
  } & RealEstateLedgerEntry_Key)[];
}
```
### Using `ListMyRealEstateLedgerEntries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateLedgerEntries } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateLedgerEntries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyRealEstateLedgerEntries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyRealEstateLedgerEntries(dataConnect);

console.log(data.realEstateLedgerEntries);

// Or, you can use the `Promise` API.
listMyRealEstateLedgerEntries().then((response) => {
  const data = response.data;
  console.log(data.realEstateLedgerEntries);
});
```

### Using `ListMyRealEstateLedgerEntries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateLedgerEntriesRef } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateLedgerEntriesRef()` function to get a reference to the query.
const ref = listMyRealEstateLedgerEntriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyRealEstateLedgerEntriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateLedgerEntries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateLedgerEntries);
});
```

## ListMyRealEstateAllocations
You can execute the `ListMyRealEstateAllocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMyRealEstateAllocations(options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateAllocationsData, undefined>;

interface ListMyRealEstateAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyRealEstateAllocationsData, undefined>;
}
export const listMyRealEstateAllocationsRef: ListMyRealEstateAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyRealEstateAllocations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateAllocationsData, undefined>;

interface ListMyRealEstateAllocationsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyRealEstateAllocationsData, undefined>;
}
export const listMyRealEstateAllocationsRef: ListMyRealEstateAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyRealEstateAllocationsRef:
```typescript
const name = listMyRealEstateAllocationsRef.operationName;
console.log(name);
```

### Variables
The `ListMyRealEstateAllocations` query has no variables.
### Return Type
Recall that executing the `ListMyRealEstateAllocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyRealEstateAllocationsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyRealEstateAllocationsData {
  realEstateAllocations: ({
    id: UUIDString;
    amountUsd: number;
    amountNative?: number | null;
    cashDirection: number;
    ledgerEntry: {
      id: UUIDString;
      type: RealEstateLedgerEntryType;
      eventDate: DateString;
      amountUsd: number;
      amountNative?: number | null;
      fxRateToUsd?: number | null;
      currency: string;
      counterparty?: string | null;
      description?: string | null;
      fundedOutsideHub: boolean;
      cashDirection: number;
      needsReview: boolean;
      sourceSheetRowKey?: string | null;
      sourceSheetRowHash?: string | null;
      reversesEntry?: {
        id: UUIDString;
      } & RealEstateLedgerEntry_Key;
      investment: {
        id: UUIDString;
      } & RealEstateInvestment_Key;
    } & RealEstateLedgerEntry_Key;
  } & RealEstateAllocation_Key)[];
}
```
### Using `ListMyRealEstateAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateAllocations } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateAllocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyRealEstateAllocations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyRealEstateAllocations(dataConnect);

console.log(data.realEstateAllocations);

// Or, you can use the `Promise` API.
listMyRealEstateAllocations().then((response) => {
  const data = response.data;
  console.log(data.realEstateAllocations);
});
```

### Using `ListMyRealEstateAllocations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateAllocationsRef } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateAllocationsRef()` function to get a reference to the query.
const ref = listMyRealEstateAllocationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyRealEstateAllocationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateAllocations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateAllocations);
});
```

## ListMyRealEstatePositions
You can execute the `ListMyRealEstatePositions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMyRealEstatePositions(options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstatePositionsData, undefined>;

interface ListMyRealEstatePositionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyRealEstatePositionsData, undefined>;
}
export const listMyRealEstatePositionsRef: ListMyRealEstatePositionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyRealEstatePositions(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstatePositionsData, undefined>;

interface ListMyRealEstatePositionsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyRealEstatePositionsData, undefined>;
}
export const listMyRealEstatePositionsRef: ListMyRealEstatePositionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyRealEstatePositionsRef:
```typescript
const name = listMyRealEstatePositionsRef.operationName;
console.log(name);
```

### Variables
The `ListMyRealEstatePositions` query has no variables.
### Return Type
Recall that executing the `ListMyRealEstatePositions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyRealEstatePositionsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyRealEstatePositionsData {
  realEstateMemberShares: ({
    investment: {
      id: UUIDString;
      realEstateRollupCaches_on_investment: ({
        capitalDeployedUsd: number;
      })[];
      realEstateMemberShares_on_investment: ({
        shareUnits: number;
      })[];
      realEstateLedgerEntries_on_investment: ({
        id: UUIDString;
        type: RealEstateLedgerEntryType;
        eventDate: DateString;
        amountUsd: number;
        reversesEntry?: {
          id: UUIDString;
        } & RealEstateLedgerEntry_Key;
      } & RealEstateLedgerEntry_Key)[];
    } & RealEstateInvestment_Key;
  })[];
}
```
### Using `ListMyRealEstatePositions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstatePositions } from '@asv/dataconnect-generated';


// Call the `listMyRealEstatePositions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyRealEstatePositions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyRealEstatePositions(dataConnect);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
listMyRealEstatePositions().then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

### Using `ListMyRealEstatePositions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstatePositionsRef } from '@asv/dataconnect-generated';


// Call the `listMyRealEstatePositionsRef()` function to get a reference to the query.
const ref = listMyRealEstatePositionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyRealEstatePositionsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.realEstateMemberShares);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.realEstateMemberShares);
});
```

## ListMyRealEstateTransfers
You can execute the `ListMyRealEstateTransfers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
listMyRealEstateTransfers(options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateTransfersData, undefined>;

interface ListMyRealEstateTransfersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyRealEstateTransfersData, undefined>;
}
export const listMyRealEstateTransfersRef: ListMyRealEstateTransfersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyRealEstateTransfers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyRealEstateTransfersData, undefined>;

interface ListMyRealEstateTransfersRef {
  ...
  (dc: DataConnect): QueryRef<ListMyRealEstateTransfersData, undefined>;
}
export const listMyRealEstateTransfersRef: ListMyRealEstateTransfersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyRealEstateTransfersRef:
```typescript
const name = listMyRealEstateTransfersRef.operationName;
console.log(name);
```

### Variables
The `ListMyRealEstateTransfers` query has no variables.
### Return Type
Recall that executing the `ListMyRealEstateTransfers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyRealEstateTransfersData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyRealEstateTransfersData {
  sales: ({
    sellerCostBasis: number;
    carryAmount: number;
    ledgerEntry: {
      amountUsd: number;
      investment: {
        id: UUIDString;
      } & RealEstateInvestment_Key;
    };
  })[];
}
```
### Using `ListMyRealEstateTransfers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateTransfers } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateTransfers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyRealEstateTransfers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyRealEstateTransfers(dataConnect);

console.log(data.sales);

// Or, you can use the `Promise` API.
listMyRealEstateTransfers().then((response) => {
  const data = response.data;
  console.log(data.sales);
});
```

### Using `ListMyRealEstateTransfers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyRealEstateTransfersRef } from '@asv/dataconnect-generated';


// Call the `listMyRealEstateTransfersRef()` function to get a reference to the query.
const ref = listMyRealEstateTransfersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyRealEstateTransfersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.sales);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.sales);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `asv-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## InsertCompany
You can execute the `InsertCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
insertCompany(vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface InsertCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
}
export const insertCompanyRef: InsertCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertCompany(dc: DataConnect, vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface InsertCompanyRef {
  ...
  (dc: DataConnect, vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
}
export const insertCompanyRef: InsertCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertCompanyRef:
```typescript
const name = insertCompanyRef.operationName;
console.log(name);
```

### Variables
The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertCompanyVariables {
  name: string;
  sector?: string | null;
}
```
### Return Type
Recall that executing the `InsertCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertCompanyData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertCompanyData {
  company_insert: Company_Key;
}
```
### Using `InsertCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertCompany, InsertCompanyVariables } from '@asv/dataconnect-generated';

// The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`:
const insertCompanyVars: InsertCompanyVariables = {
  name: ..., 
  sector: ..., // optional
};

// Call the `insertCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertCompany(insertCompanyVars);
// Variables can be defined inline as well.
const { data } = await insertCompany({ name: ..., sector: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertCompany(dataConnect, insertCompanyVars);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
insertCompany(insertCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

### Using `InsertCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertCompanyRef, InsertCompanyVariables } from '@asv/dataconnect-generated';

// The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`:
const insertCompanyVars: InsertCompanyVariables = {
  name: ..., 
  sector: ..., // optional
};

// Call the `insertCompanyRef()` function to get a reference to the mutation.
const ref = insertCompanyRef(insertCompanyVars);
// Variables can be defined inline as well.
const ref = insertCompanyRef({ name: ..., sector: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertCompanyRef(dataConnect, insertCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

