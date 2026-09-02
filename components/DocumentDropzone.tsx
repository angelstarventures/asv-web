"use client";

import { useState, type FormEvent } from "react";
import { documentsAnalyze } from "@/lib/functions/documents";
import { readFileAsBase64 } from "@/lib/files";

// Sends file(s) straight to documentsAnalyze for AI drafting — no Drive persistence yet
// (deferred until real OAuth is set up for the personal-Gmail-owned Drive folder).
export function DocumentDropzone({
  companies,
  onAnalyzed,
}: {
  companies: { id: string; name: string; tradeName?: string | null }[];
  onAnalyzed: (proposedRecords: Record<string, unknown>[]) => void;
}) {
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const fileInput = (e.currentTarget.elements.namedItem("files") as HTMLInputElement) ?? null;
    const selectedFiles = fileInput?.files ? Array.from(fileInput.files) : [];
    const pastedText = String(form.get("textBlob") ?? "").trim();
    if (selectedFiles.length === 0 && !pastedText) {
      setError("Choose at least one file, or paste a message below.");
      setBusy(false);
      return;
    }
    const newCompanyName = String(form.get("newCompanyName") ?? "").trim();
    if (isNewCompany && !newCompanyName) {
      setError("Enter the new company's name.");
      setBusy(false);
      return;
    }

    try {
      setStatus("Analyzing with AI — this can take a moment...");
      const sources = pastedText
        ? [...selectedFiles, new File([pastedText], "pasted-message.txt", { type: "text/plain" })]
        : selectedFiles;
      const files = await Promise.all(
        sources.map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await readFileAsBase64(file),
        }))
      );
      const { proposedRecords } = await documentsAnalyze(
        isNewCompany
          ? { newCompanyName, files }
          : { companyId: String(form.get("companyId")), files }
      );
      setStatus(null);
      onAnalyzed(proposedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <h2 className="text-sm font-medium">Analyze document(s)</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {status && <p className="text-sm text-zinc-700 dark:text-zinc-300">{status}</p>}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isNewCompany}
          onChange={(e) => setIsNewCompany(e.target.checked)}
        />
        This is a new company ASV hasn&apos;t invested in before
      </label>

      {isNewCompany ? (
        <label className="flex flex-col gap-1 text-sm">
          New company name
          <input
            type="text"
            name="newCompanyName"
            required
            placeholder="Legal company name"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Company
          <select
            name="companyId"
            required
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Select a company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName ?? c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        File(s)
        <input type="file" name="files" multiple className="text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Or paste a message (e.g. an email or update the company sent as plain text)
        <textarea
          name="textBlob"
          rows={6}
          placeholder="Paste the company's message here instead of uploading a file..."
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-1 self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Working..." : "Analyze"}
      </button>
    </form>
  );
}
