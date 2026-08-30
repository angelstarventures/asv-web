"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { eventTypesDefine } from "@/lib/functions/ledgerWrites";
import { DynamicEntryForm } from "@/components/DynamicEntryForm";
import type { EventTypeFieldDef, FieldType } from "@/lib/eventTypes/schema";

const FIELD_TYPES: FieldType[] = ["string", "text", "number", "date", "enum", "boolean", "string[]"];

function emptyField(): EventTypeFieldDef {
  return { key: "", label: "", type: "string", required: true, variesByScenario: false };
}

// FR-10a's type builder — a live preview renders DynamicEntryForm against the in-progress
// schema, the same renderer /admin/ledger/entry/<newTypeId> uses once saved, so what the
// admin sees here is exactly what they (and everyone else) will see filling the type in for
// real — no code deploy in between (plan §4).
export default function NewEventTypePage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<EventTypeFieldDef[]>([emptyField()]);
  const [previewShared, setPreviewShared] = useState<Record<string, unknown>>({});
  const [previewPerScenario, setPreviewPerScenario] = useState<
    Record<"OPTIMISTIC" | "BALANCED" | "CONSERVATIVE", Record<string, unknown>>
  >({ OPTIMISTIC: {}, BALANCED: {}, CONSERVATIVE: {} });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateField(index: number, patch: Partial<EventTypeFieldDef>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await eventTypesDefine({
        key: key.trim().toUpperCase().replace(/\s+/g, "_"),
        label,
        description: description || undefined,
        fields,
      });
      router.push(`/admin/ledger/entry/${result.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the event type.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">New event type</h1>

      {/* Two siblings, not one <form> — the live preview's inputs carry their own `required`
          attributes and must never sit inside the real <form>, or an empty preview field
          silently blocks native submission of the actual builder form. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Key
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. BOARD_SEAT_CHANGE"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Label
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <h2 className="mt-2 text-sm font-medium">Fields</h2>
          {fields.map((field, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="key"
                  value={field.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                  className="w-1/2 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <input
                  type="text"
                  required
                  placeholder="label"
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  className="w-1/2 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <select
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                  />
                  required
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={field.variesByScenario}
                    onChange={(e) => updateField(i, { variesByScenario: e.target.checked })}
                  />
                  varies by scenario
                </label>
                <button
                  type="button"
                  onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={fields.length === 1}
                  className="ml-auto text-zinc-500 underline underline-offset-2 disabled:opacity-40 dark:text-zinc-400"
                >
                  Remove
                </button>
              </div>
              {field.type === "enum" && (
                <input
                  type="text"
                  placeholder="Comma-separated options, e.g. RED,YELLOW,GREEN"
                  value={field.options?.join(",") ?? ""}
                  onChange={(e) =>
                    updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFields((prev) => [...prev, emptyField()])}
            className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Add field
          </button>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save event type"}
          </button>
        </form>

        <div>
          <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Live preview</h2>
          <DynamicEntryForm
            fields={fields.filter((f) => f.key && f.label)}
            shared={previewShared}
            onSharedChange={(k, v) => setPreviewShared((prev) => ({ ...prev, [k]: v }))}
            perScenario={previewPerScenario}
            onPerScenarioChange={(scenario, k, v) =>
              setPreviewPerScenario((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [k]: v } }))
            }
          />
        </div>
      </div>
    </div>
  );
}
