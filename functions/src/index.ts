import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();

// Same region as the Data Connect Cloud SQL instance (dataconnect/dataconnect.yaml) — every
// function-to-Postgres call would otherwise cross regions on every request.
setGlobalOptions({ region: "us-east1" });

export { provisionMember, adminTriggerPasswordReset, setMemberStatus } from "./functions/users-onCreateProvision";
export { documentsGetAccessUrl } from "./functions/documents-getAccessUrl";
export { documentsOnDriveUpload } from "./functions/documents-onDriveUpload";
export { ledgerCreateInvestmentRound } from "./functions/ledger-createInvestmentRound";
export { ledgerCreateValuationEvent } from "./functions/ledger-createValuationEvent";
export { ledgerCreateComplianceFlag } from "./functions/ledger-createComplianceFlag";
export { ledgerCreateCompanyUpdate } from "./functions/ledger-createCompanyUpdate";
export { ledgerCustomEventWrite } from "./functions/ledger-customEventWrite";
export { ledgerCustomEventRead } from "./functions/ledger-customEventRead";
export { eventTypesDefine } from "./functions/eventTypes-define";
export { ledgerMassExport } from "./functions/ledger-massExport";
export { ledgerMassImportDiff } from "./functions/ledger-massImportDiff";
export { ledgerMassImportCommit } from "./functions/ledger-massImportCommit";
export { rollupsRecompute } from "./functions/rollups-recompute";
