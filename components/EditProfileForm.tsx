"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfile } from "@/lib/functions/memberProfile";

// Self-service analog of the admin's EditMemberForm — no memberId prop, updateOwnProfile
// always derives the caller's own row server-side (plan §3, Data isolation). membershipType
// is deliberately absent here — admin-only, same posture as Role.
export function EditProfileForm({
  displayName,
  investingEntityName,
  profileText,
  phoneNumber,
  expertiseKeywords,
}: {
  displayName: string;
  investingEntityName: string;
  profileText: string | null;
  phoneNumber: string | null;
  expertiseKeywords: string[] | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await updateOwnProfile({
        displayName: String(form.get("displayName")),
        investingEntityName: String(form.get("investingEntityName")),
        profileText: String(form.get("profileText") ?? "").trim() || null,
        phoneNumber: String(form.get("phoneNumber") ?? "").trim() || null,
        expertiseKeywords: String(form.get("expertiseKeywords") ?? "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5">
      <h2 className="text-sm font-medium">Profile</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          name="displayName"
          required
          defaultValue={displayName}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Investing entity
        <input
          type="text"
          name="investingEntityName"
          required
          defaultValue={investingEntityName}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Phone number
        <input
          type="tel"
          name="phoneNumber"
          placeholder="+1 555 123 4567"
          defaultValue={phoneNumber ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">Used so admins can reach you on WhatsApp about deals in your area of expertise.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Areas of expertise
        <input
          type="text"
          name="expertiseKeywords"
          placeholder="e.g. Machine Learning, Medical Devices, B2B SaaS Sales"
          defaultValue={(expertiseKeywords ?? []).join(", ")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">Comma-separated skills/domains, phrased the way you&apos;d list them on a resume — used to match you with relevant deals.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Profile bio
        <textarea
          name="profileText"
          rows={4}
          placeholder="A short bio shown alongside your profile."
          defaultValue={profileText ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-1 self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
