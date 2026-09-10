"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateMember, type MembershipType } from "@/lib/functions/adminMembers";

const MEMBERSHIP_TYPE_OPTIONS: { value: MembershipType; label: string }[] = [
  { value: "BOARD_MEMBER", label: "Board Member" },
  { value: "MEMBER", label: "Member" },
  { value: "ASSOCIATE", label: "Associate" },
  { value: "EMERITUS", label: "Emeritus" },
];

// Backs the "Manage" -> edit flow on app/admin/members/[memberId] — the only path that
// changes an existing Member row's name/investing-entity/membership-type/profile-text fields
// after creation. membershipType is an admin-only org classification, distinct from Role.
const INTEREST_OPTIONS = [
  "Healthcare",
  "Medical Device",
  "Bio/Pharma",
  "Media/Pubs",
  "Financial",
  "Telecom",
  "CPG/retail",
  "Mfg",
  "IT",
  "Energy/Env",
];

export function EditMemberForm({
  memberId,
  displayName,
  investingEntityName,
  membershipType,
  profileText,
  phoneNumber,
  email,
  professionalProfileUrl,
  interests,
  expertise,
}: {
  memberId: string;
  displayName: string;
  investingEntityName: string;
  membershipType: MembershipType;
  profileText: string | null;
  phoneNumber: string | null;
  email: string;
  professionalProfileUrl: string | null;
  interests: string[] | null;
  expertise: string[] | null;
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
      await updateMember({
        memberId,
        displayName: String(form.get("displayName")),
        investingEntityName: String(form.get("investingEntityName")),
        membershipType: String(form.get("membershipType")) as MembershipType,
        profileText: String(form.get("profileText") ?? "").trim() || null,
        phoneNumber: String(form.get("phoneNumber") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        professionalProfileUrl: String(form.get("professionalProfileUrl") ?? "").trim() || null,
        interests: form.getAll("interests").map(String),
        expertise: String(form.get("expertise") ?? "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setNotice("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800"
    >
      <h2 className="text-sm font-medium">Edit member</h2>
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
        Membership type
        <select
          name="membershipType"
          required
          defaultValue={membershipType}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {MEMBERSHIP_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          defaultValue={email}
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
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Professional profile (e.g. LinkedIn)
        <input
          type="url"
          name="professionalProfileUrl"
          placeholder="https://www.linkedin.com/in/..."
          defaultValue={professionalProfileUrl ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend>Interests</legend>
        <div className="grid grid-cols-2 gap-1">
          {INTEREST_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="interests" value={opt} defaultChecked={(interests ?? []).includes(opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Expertise
        <input
          type="text"
          name="expertise"
          placeholder="e.g. Machine Learning, Medical Devices, B2B SaaS Sales"
          defaultValue={(expertise ?? []).join(", ")}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Profile text
        <textarea
          name="profileText"
          rows={4}
          defaultValue={profileText ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-1 self-start rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
