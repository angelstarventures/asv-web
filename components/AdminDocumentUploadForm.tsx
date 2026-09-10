"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readFileAsBase64 } from "@/lib/files";
import { documentsOnDriveUpload, type ManualDocumentType } from "@/lib/functions/documents";

const DOC_TYPE_OPTIONS: { value: ManualDocumentType; label: string }[] = [
  { value: "PITCH_DECK", label: "Pitch deck" },
  { value: "DD_REPORT", label: "Due diligence report" },
  { value: "DATA_ROOM", label: "Data room" },
  { value: "COMPANY_UPDATE_DOC", label: "Company update document" },
  { value: "SPA", label: "SPA (deal paperwork)" },
  { value: "ALLOCATION_SCHEDULE", label: "Allocation schedule" },
];

// Manual alternative to the AI-analysis intake flow above it — for a document that doesn't need
// AI drafting (e.g. re-uploading an SPA, a data room link doc, an allocation schedule).
export function AdminDocumentUploadForm({ companies }: { companies: { id: string; name: string; tradeName?: string | null }[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [docType, setDocType] = useState<ManualDocumentType>("COMPANY_UPDATE_DOC");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!companyId || !file) {
      setError("A company and a file are required.");
      return;
    }
    setBusy(true);
    try {
      await documentsOnDriveUpload({
        companyId,
        docType,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: await readFileAsBase64(file),
      });
      setNotice(`Uploaded ${file.name}.`);
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800"
    >
      <h2 className="text-sm font-semibold">Upload a document manually</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Company
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName ?? c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Document type
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as ManualDocumentType)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <label className="w-fit cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700">
          Choose file
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <span className="min-w-0 truncate text-zinc-500">{file?.name ?? "No file chosen"}</span>
      </div>
      <button
        type="submit"
        disabled={busy || !file}
        className="self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
