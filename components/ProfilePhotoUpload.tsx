"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateOwnPhoto } from "@/lib/functions/memberProfile";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

// Self-service photo upload for /member/settings — stored as a data: URL directly on the
// member row (see updateOwnPhoto), displayed wherever a member's own profile is shown
// (this page, and the admin's read-only member detail page).
export function ProfilePhotoUpload({ currentPhotoUrl }: { currentPhotoUrl: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [pendingUpload, setPendingUpload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`Photo exceeds the ${MAX_PHOTO_BYTES / (1024 * 1024)}MB limit.`);
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
      await updateOwnPhoto({ photoDataUrl: pendingUpload });
      setPendingUpload(null);
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await updateOwnPhoto({ photoDataUrl: null });
      setPreview(null);
      setPendingUpload(null);
      setNotice("Removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5">
      <h2 className="text-sm font-medium">Profile photo</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}

      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a self-uploaded data: URL, not an optimizable remote image
          <img src={preview} alt="Profile" className="h-16 w-16 rounded-full border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xl font-semibold text-zinc-500">
            ?
          </div>
        )}
        <label className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium">
          Choose photo
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !pendingUpload}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save photo"}
        </button>
        {(preview || currentPhotoUrl) && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
