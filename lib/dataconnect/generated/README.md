# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `asv-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCompanies*](#listcompanies)
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
  - [*GetMemberByAuthUid*](#getmemberbyauthuid)
  - [*ListAllMembers*](#listallmembers)
  - [*GetMemberById*](#getmemberbyid)
  - [*ListCustomEventTypes*](#listcustomeventtypes)
  - [*ListAiPromptSettings*](#listaipromptsettings)
  - [*ListAppSettings*](#listappsettings)
  - [*ListDeals*](#listdeals)
  - [*GetDealById*](#getdealbyid)
  - [*ListDealTags*](#listdealtags)
  - [*ListDealTagAssignments*](#listdealtagassignments)
  - [*ListDealDocumentsByDeal*](#listdealdocumentsbydeal)
  - [*ListDealRatingsByDeal*](#listdealratingsbydeal)
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
      company: {
        id: UUIDString;
      } & Company_Key;
    };
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
    asvTotal: number;
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
    docLink?: string | null;
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
    docType: DocumentType;
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
    membershipType: MembershipType;
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
    preMoneyValuation: number;
    hasLeadInvestor: boolean;
    leadInvestorName?: string | null;
    willHaveInterestBearingDebtAfterClose: boolean;
    hasExistingInterestBearingDebt: boolean;
    hasRestrictedBusinessLines: boolean;
    raiseMethod?: string | null;
    referredBy?: string | null;
    sector?: string | null;
    keywords?: string[] | null;
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
    preMoneyValuation: number;
    hasLeadInvestor: boolean;
    leadInvestorName?: string | null;
    willHaveInterestBearingDebtAfterClose: boolean;
    hasExistingInterestBearingDebt: boolean;
    hasRestrictedBusinessLines: boolean;
    raiseMethod?: string | null;
    referredBy?: string | null;
    sector?: string | null;
    keywords?: string[] | null;
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

