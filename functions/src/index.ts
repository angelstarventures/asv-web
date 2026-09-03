import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();

// Same region as the Data Connect Cloud SQL instance (dataconnect/dataconnect.yaml) — every
// function-to-Postgres call would otherwise cross regions on every request.
setGlobalOptions({ region: "us-east1" });

export { createMember, updateMember, updateOwnProfile, updateOwnPhoto, updatePhotoForMember, provisionMember, adminTriggerPasswordReset, setMemberStatus, setMemberRole } from "./functions/users-onCreateProvision";
export { updateAiPromptSetting } from "./functions/ai-updatePromptSetting";
export { updateAppSetting } from "./functions/app-updateSetting";
export { aiPortfolioQuery } from "./functions/ai-portfolioQuery";
export { documentsAnalyze } from "./functions/documents-analyze";
export { documentsGetAccessUrl } from "./functions/documents-getAccessUrl";
export { documentsOnDriveUpload } from "./functions/documents-onDriveUpload";
export { ledgerCustomEventWrite } from "./functions/ledger-customEventWrite";
export { ledgerCustomEventRead } from "./functions/ledger-customEventRead";
export { eventTypesDefine } from "./functions/eventTypes-define";
export { eventTypesGetByKey } from "./functions/eventTypes-getByKey";
export { ledgerMassExport } from "./functions/ledger-massExport";
export { ledgerGetSchema } from "./functions/ledger-getSchema";
export { ledgerMassImportDiff } from "./functions/ledger-massImportDiff";
export { ledgerMassImportCommit } from "./functions/ledger-massImportCommit";
export { ledgerDeleteRecord } from "./functions/ledger-deleteRecord";
export { ledgerUpdateRecord } from "./functions/ledger-updateRecord";
export { rollupsRecompute } from "./functions/rollups-recompute";
export { dealsSubmitPitch } from "./functions/deals-submitPitch";
export { dealsSetRating } from "./functions/deals-setRating";
export { dealsUpdateStage } from "./functions/deals-updateStage";
export { dealsManageTag } from "./functions/deals-manageTag";
export { dealsAssignTag } from "./functions/deals-assignTag";
export { dealsDeleteDeal } from "./functions/deals-deleteDeal";
export { updateCompanyLogo } from "./functions/companies-updateLogo";
export { dealsSetRanks } from "./functions/deals-setRanks";
export { dealsUpdateFields } from "./functions/deals-updateFields";
