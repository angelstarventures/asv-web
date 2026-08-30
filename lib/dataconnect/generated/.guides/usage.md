# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { insertCompany, listCompanies, listMemberProfiles, getPortfolioRollup, listCompanyRollups, listCompanyUpdatesForScenario, listLedgerEntriesForScenario, listMemberAllocations, listMemberValuations, listMemberAllocationsAllScenarios } from '@asv/dataconnect-generated';


// Operation InsertCompany:  For variables, look at type InsertCompanyVars in ../index.d.ts
const { data } = await InsertCompany(dataConnect, insertCompanyVars);

// Operation ListCompanies: 
const { data } = await ListCompanies(dataConnect);

// Operation ListMemberProfiles: 
const { data } = await ListMemberProfiles(dataConnect);

// Operation GetPortfolioRollup:  For variables, look at type GetPortfolioRollupVars in ../index.d.ts
const { data } = await GetPortfolioRollup(dataConnect, getPortfolioRollupVars);

// Operation ListCompanyRollups:  For variables, look at type ListCompanyRollupsVars in ../index.d.ts
const { data } = await ListCompanyRollups(dataConnect, listCompanyRollupsVars);

// Operation ListCompanyUpdatesForScenario:  For variables, look at type ListCompanyUpdatesForScenarioVars in ../index.d.ts
const { data } = await ListCompanyUpdatesForScenario(dataConnect, listCompanyUpdatesForScenarioVars);

// Operation ListLedgerEntriesForScenario:  For variables, look at type ListLedgerEntriesForScenarioVars in ../index.d.ts
const { data } = await ListLedgerEntriesForScenario(dataConnect, listLedgerEntriesForScenarioVars);

// Operation ListMemberAllocations:  For variables, look at type ListMemberAllocationsVars in ../index.d.ts
const { data } = await ListMemberAllocations(dataConnect, listMemberAllocationsVars);

// Operation ListMemberValuations:  For variables, look at type ListMemberValuationsVars in ../index.d.ts
const { data } = await ListMemberValuations(dataConnect, listMemberValuationsVars);

// Operation ListMemberAllocationsAllScenarios:  For variables, look at type ListMemberAllocationsAllScenariosVars in ../index.d.ts
const { data } = await ListMemberAllocationsAllScenarios(dataConnect, listMemberAllocationsAllScenariosVars);


```