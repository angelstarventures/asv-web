"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePhotoForMember } from "@/lib/functions/adminMembers";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

// Admin analog of ProfilePhotoUpload — same upload/preview/save/remove shape, but scoped to
// an explicit memberId (updatePhotoForMember) rather than the caller's own row.
export function AdminPhotoUpload({
  memberId,
  displayName,
  currentPhotoUrl,
}: {
  memberId: string;
  displayName: string;
  currentPhotoUrl: string | null;
}) {
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
      await updatePhotoForMember({ memberId, photoDataUrl: pendingUpload });
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
      await updatePhotoForMember({ memberId, photoDataUrl: null });
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
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}

      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a member-uploaded data: URL, not an optimizable remote image
          <img src={preview} alt={displayName} className="h-14 w-14 rounded-full border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-lg font-semibold text-zinc-500">
            {displayName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Member ID {memberId}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <label className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium">
          Choose photo
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
        </label>
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
