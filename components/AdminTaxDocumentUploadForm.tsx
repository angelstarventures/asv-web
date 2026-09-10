"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readFileAsBase64 } from "@/lib/files";
import { documentsUploadTaxDocument } from "@/lib/functions/documents";

export function AdminTaxDocumentUploadForm({ members }: { members: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [taxYear, setTaxYear] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!memberId || !file) {
      setError("A member and a file are required.");
      return;
    }
    let taxYearNum: number | null = null;
    if (taxYear.trim()) {
      taxYearNum = Number(taxYear);
      if (!Number.isInteger(taxYearNum)) {
        setError("Tax year must be a whole number.");
        return;
      }
    }
    setBusy(true);
    try {
      await documentsUploadTaxDocument({
        memberId,
        taxYear: taxYearNum,
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
      <h2 className="text-sm font-semibold">Upload a tax document</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Member
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tax year (optional)
          <input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            placeholder="e.g. 2025"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
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
