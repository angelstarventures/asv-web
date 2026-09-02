"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { manageDealTag } from "@/lib/functions/deals";
import type { DealTagOption } from "@/components/DealListTable";

// Admin-only tag CRUD, folded into /admin/deals rather than a separate route — low-volume
// config, same reasoning as AppSettingsForm living directly on /admin/settings.
export function DealTagManager({ tags }: { tags: DealTagOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await manageDealTag({ action: "create", name: name.trim() });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tag.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(tagId: string) {
    setError(null);
    setBusy(true);
    try {
      await manageDealTag({ action: "delete", tagId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete tag.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <h2 className="text-sm font-medium">Manage deal tags</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag.id} className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
            {tag.name}
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDelete(tag.id)}
              aria-label={`Delete ${tag.name}`}
              className="text-zinc-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-sm text-zinc-500">No tags yet.</p>}
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag name"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
