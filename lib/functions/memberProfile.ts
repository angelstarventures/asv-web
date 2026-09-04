import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/users-onCreateProvision.ts's updateOwnProfile shape exactly
// — duplicated rather than imported so the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract (plan §4). Self-service analog of
// lib/functions/adminMembers.ts's updateMember — no memberId input, the callable always
// derives the caller's own row server-side.

export interface UpdateOwnProfileInput {
  displayName: string;
  investingEntityName: string;
  profileText?: string | null;
  phoneNumber?: string | null;
  expertiseKeywords?: string[] | null;
}
export async function updateOwnProfile(input: UpdateOwnProfileInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateOwnProfileInput, { ok: true }>(functions, "updateOwnProfile");
  const res = await call(input);
  return res.data;
}

export interface UpdateOwnPhotoInput {
  photoDataUrl: string | null;
}
export async function updateOwnPhoto(input: UpdateOwnPhotoInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateOwnPhotoInput, { ok: true }>(functions, "updateOwnPhoto");
  const res = await call(input);
  return res.data;
}

// Clears the mustChangePassword claim after the member successfully sets their own password on
// the forced /change-password screen — see ChangePasswordForm's onSuccess usage there.
export async function completePasswordChange(): Promise<{ ok: true }> {
  const call = httpsCallable<Record<string, never>, { ok: true }>(functions, "memberCompletePasswordChange");
  const res = await call({});
  return res.data;
}
