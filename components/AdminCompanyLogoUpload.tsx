"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyLogo } from "@/lib/functions/companies";

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

// Same upload/preview/save/remove shape as AdminPhotoUpload, scoped to a Company row instead
// of a Member — one row in the /admin/companies list.
export function AdminCompanyLogoUpload({
  companyId,
  name,
  currentLogoUrl,
}: {
  companyId: string;
  name: string;
  currentLogoUrl: string | null;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError(`Logo exceeds the ${MAX_LOGO_BYTES / (1024 * 1024)}MB limit.`);
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
    setPendingUpload(dataUrl);
  }

  async function handleSave() {
    if (!pendingUpload) return;
    setError(null);
    setBusy(true);
    try {
      await updateCompanyLogo({ companyId, photoDataUrl: pendingUpload });
      setPendingUpload(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the logo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await updateCompanyLogo({ companyId, photoDataUrl: null });
      setPreview(null);
      setPendingUpload(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- an admin-uploaded data: URL, not an optimizable remote image
        <img src={preview} alt={name} className="h-14 w-14 rounded-md border border-zinc-200 object-contain bg-white" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-500">
          {name.charAt(0)}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-sm font-medium">{name}</span>
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <label className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700">
            Choose logo
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleFileChange} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !pendingUpload}
            className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          {(preview || currentLogoUrl) && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
