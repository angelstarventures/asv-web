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
  - [*ListLedgerEntriesForScenario*](#listledgerentriesforscenario)
  - [*ListMemberAllocations*](#listmemberallocations)
  - [*ListMemberValuations*](#listmembervaluations)
  - [*GetMemberByAuthUid*](#getmemberbyauthuid)
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
    sector?: string | null;
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
  memberId: string;
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
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
      } & Company_Key;
    };
  })[];
}
```
### Using `ListMemberAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberAllocations, ListMemberAllocationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberAllocations` query requires an argument of type `ListMemberAllocationsVariables`:
const listMemberAllocationsVars: ListMemberAllocationsVariables = {
  memberId: ..., 
  scenario: ..., 
};

// Call the `listMemberAllocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberAllocations(listMemberAllocationsVars);
// Variables can be defined inline as well.
const { data } = await listMemberAllocations({ memberId: ..., scenario: ..., });

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
  memberId: ..., 
  scenario: ..., 
};

// Call the `listMemberAllocationsRef()` function to get a reference to the query.
const ref = listMemberAllocationsRef(listMemberAllocationsVars);
// Variables can be defined inline as well.
const ref = listMemberAllocationsRef({ memberId: ..., scenario: ..., });

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
  memberId: string;
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
      eventDate: DateString;
      company: {
        id: UUIDString;
        name: string;
      } & Company_Key;
    };
  })[];
}
```
### Using `ListMemberValuations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMemberValuations, ListMemberValuationsVariables } from '@asv/dataconnect-generated';

// The `ListMemberValuations` query requires an argument of type `ListMemberValuationsVariables`:
const listMemberValuationsVars: ListMemberValuationsVariables = {
  memberId: ..., 
  scenario: ..., 
};

// Call the `listMemberValuations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMemberValuations(listMemberValuationsVars);
// Variables can be defined inline as well.
const { data } = await listMemberValuations({ memberId: ..., scenario: ..., });

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
  memberId: ..., 
  scenario: ..., 
};

// Call the `listMemberValuationsRef()` function to get a reference to the query.
const ref = listMemberValuationsRef(listMemberValuationsVars);
// Variables can be defined inline as well.
const ref = listMemberValuationsRef({ memberId: ..., scenario: ..., });

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

