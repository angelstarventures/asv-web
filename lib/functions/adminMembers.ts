import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/users-onCreateProvision.ts's input/output shapes exactly —
// duplicated rather than imported so the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract (plan §4).

export interface CreateMemberInput {
  displayName: string;
  email: string;
  role: "admin" | "member";
}
export interface CreateMemberOutput {
  memberId: string;
}
export async function createMember(input: CreateMemberInput): Promise<CreateMemberOutput> {
  const call = httpsCallable<CreateMemberInput, CreateMemberOutput>(functions, "createMember");
  const res = await call(input);
  return res.data;
}

export type MembershipType = "BOARD_MEMBER" | "MEMBER" | "ASSOCIATE" | "EMERITUS";

export interface UpdateMemberInput {
  memberId: string;
  displayName: string;
  investingEntityName: string;
  membershipType: MembershipType;
  profileText?: string | null;
}
export async function updateMember(input: UpdateMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateMemberInput, { ok: true }>(functions, "updateMember");
  const res = await call(input);
  return res.data;
}

export interface ProvisionMemberInput {
  memberId: string;
  email: string;
  role: "admin" | "member";
  temporaryPassword: string;
}
export interface ProvisionMemberOutput {
  authUid: string;
  email: string;
}
export async function provisionMember(input: ProvisionMemberInput): Promise<ProvisionMemberOutput> {
  const call = httpsCallable<ProvisionMemberInput, ProvisionMemberOutput>(functions, "provisionMember");
  const res = await call(input);
  return res.data;
}

export interface UpdatePhotoForMemberInput {
  memberId: string;
  photoDataUrl: string | null;
}
export async function updatePhotoForMember(input: UpdatePhotoForMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdatePhotoForMemberInput, { ok: true }>(functions, "updatePhotoForMember");
  const res = await call(input);
  return res.data;
}

export interface AdminTriggerPasswordResetInput {
  memberId: string;
}
export interface AdminTriggerPasswordResetOutput {
  resetLink: string;
}
export async function adminTriggerPasswordReset(
  input: AdminTriggerPasswordResetInput
): Promise<AdminTriggerPasswordResetOutput> {
  const call = httpsCallable<AdminTriggerPasswordResetInput, AdminTriggerPasswordResetOutput>(
    functions,
    "adminTriggerPasswordReset"
  );
  const res = await call(input);
  return res.data;
}

export interface SetMemberStatusInput {
  memberId: string;
  status: "active" | "disabled";
}
export async function setMemberStatus(input: SetMemberStatusInput): Promise<{ ok: true }> {
  const call = httpsCallable<SetMemberStatusInput, { ok: true }>(functions, "setMemberStatus");
  const res = await call(input);
  return res.data;
}
