import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

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
}
export interface DocumentsAnalyzeOutput {
  proposedRecords: Record<string, unknown>[];
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
