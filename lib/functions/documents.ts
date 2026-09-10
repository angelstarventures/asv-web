import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export interface GetAccessUrlInput {
  documentId: string;
}
export interface GetAccessUrlOutput {
  downloadUrl: string;
}
// Backs DocumentLink.tsx — checks + audit-logs access (functions/src/functions/documents-
// getAccessUrl.ts) before the browser ever navigates to the actual byte-streaming route
// (app/api/documents/[id]), which independently re-derives the same decision as defense in
// depth but does no logging of its own — this callable is the one place a view gets logged.
export async function getDocumentAccessUrl(input: GetAccessUrlInput): Promise<GetAccessUrlOutput> {
  const call = httpsCallable<GetAccessUrlInput, GetAccessUrlOutput>(functions, "documentsGetAccessUrl");
  const res = await call(input);
  return res.data;
}

// Mirrors functions/src/functions/documents-analyze.ts exactly — same duplicated-boundary-
// contract reasoning as the other lib/functions/*.ts wrappers. Files are sent inline for AI
// analysis, not persisted to Drive yet (Drive upload is deferred until real OAuth is set up —
// a bare service account has no storage quota on the personal-Gmail-owned Drive folder).

export interface DocumentsAnalyzeFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}
export interface DocumentsAnalyzeInput {
  companyId?: string;
  newCompanyName?: string;
  files: DocumentsAnalyzeFile[];
  instruction?: string;
  previousRecords?: Record<string, unknown>[];
  checkErrors?: string[];
}
export interface RecordGroup {
  scenarios: string[];
  recordIndexes: number[];
  visible: boolean;
}
export interface DocumentsAnalyzeOutput {
  proposedRecords: Record<string, unknown>[];
  warnings: string[];
  groups: RecordGroup[];
  unknownMemberReferences: string[];
}
export async function documentsAnalyze(input: DocumentsAnalyzeInput): Promise<DocumentsAnalyzeOutput> {
  // Matches the function's own timeoutSeconds: 300 — the client SDK's 70s default callable
  // timeout was firing before the (successful, server-side) AI call finished.
  const call = httpsCallable<DocumentsAnalyzeInput, DocumentsAnalyzeOutput>(functions, "documentsAnalyze", {
    timeout: 300000,
  });
  const res = await call(input);
  return res.data;
}

export interface DocumentsShareCompanyUpdateFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}
export interface DocumentsShareCompanyUpdateInput {
  companyId: string;
  files: DocumentsShareCompanyUpdateFile[];
}
export interface DocumentsShareCompanyUpdateOutput {
  driveUrls: string[];
}
export async function documentsShareCompanyUpdate(
  input: DocumentsShareCompanyUpdateInput
): Promise<DocumentsShareCompanyUpdateOutput> {
  const call = httpsCallable<DocumentsShareCompanyUpdateInput, DocumentsShareCompanyUpdateOutput>(
    functions,
    "documentsShareCompanyUpdate",
    { timeout: 120000 }
  );
  const res = await call(input);
  return res.data;
}

// Manual "Company Documents/Updates" upload — mirrors functions/src/functions/
// documents-onDriveUpload.ts exactly.
export type ManualDocumentType = "PITCH_DECK" | "DD_REPORT" | "DATA_ROOM" | "COMPANY_UPDATE_DOC" | "SPA" | "ALLOCATION_SCHEDULE";
export interface DocumentsOnDriveUploadInput {
  companyId: string;
  docType: ManualDocumentType;
  filename: string;
  mimeType: string;
  contentBase64: string;
}
export interface DocumentsOnDriveUploadOutput {
  documentId: string;
  driveUrl: string;
}
export async function documentsOnDriveUpload(
  input: DocumentsOnDriveUploadInput
): Promise<DocumentsOnDriveUploadOutput> {
  const call = httpsCallable<DocumentsOnDriveUploadInput, DocumentsOnDriveUploadOutput>(
    functions,
    "documentsOnDriveUpload",
    { timeout: 120000 }
  );
  const res = await call(input);
  return res.data;
}

// Manual "Tax Documents" upload — mirrors functions/src/functions/documents-uploadTaxDocument.ts
// exactly.
export interface DocumentsUploadTaxDocumentInput {
  memberId: string;
  taxYear?: number | null;
  filename: string;
  mimeType: string;
  contentBase64: string;
}
export interface DocumentsUploadTaxDocumentOutput {
  taxDocumentId: string;
  driveUrl: string;
}
export interface DocumentsSyncFromDriveInput {
  companyId?: string;
}
export interface DocumentsSyncFromDriveOutput {
  imported: number;
  alreadyTracked: number;
  companiesScanned: number;
}
export async function documentsSyncFromDrive(
  input: DocumentsSyncFromDriveInput = {}
): Promise<DocumentsSyncFromDriveOutput> {
  const call = httpsCallable<DocumentsSyncFromDriveInput, DocumentsSyncFromDriveOutput>(
    functions,
    "documentsSyncFromDrive",
    { timeout: 300000 }
  );
  const res = await call(input);
  return res.data;
}

export async function documentsUploadTaxDocument(
  input: DocumentsUploadTaxDocumentInput
): Promise<DocumentsUploadTaxDocumentOutput> {
  const call = httpsCallable<DocumentsUploadTaxDocumentInput, DocumentsUploadTaxDocumentOutput>(
    functions,
    "documentsUploadTaxDocument",
    { timeout: 120000 }
  );
  const res = await call(input);
  return res.data;
}
