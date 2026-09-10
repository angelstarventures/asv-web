import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/users-onCreateProvision.ts's input/output shapes exactly —
// duplicated rather than imported so the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract (plan §4).

export interface CreateMemberInput {
  displayName: string;
  email: string;
  role: "admin" | "member";
  membershipType?: MembershipType;
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
  phoneNumber?: string | null;
  email?: string | null;
  professionalProfileUrl?: string | null;
  interests?: string[] | null;
  expertise?: string[] | null;
}
export async function updateMember(input: UpdateMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateMemberInput, { ok: true }>(functions, "updateMember");
  const res = await call(input);
  return res.data;
}

export type ScenarioLockValue = "" | "optimistic" | "balanced" | "conservative";

export interface UpdateMemberAiSettingsInput {
  memberId: string;
  aiChatEnabled: boolean;
  lockedScenario: ScenarioLockValue;
}
export async function updateMemberAiSettings(input: UpdateMemberAiSettingsInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateMemberAiSettingsInput, { ok: true }>(functions, "updateMemberAiSettings");
  const res = await call(input);
  return res.data;
}

export interface MembersSendDuesReminderInput {
  memberId: string;
  channel: "whatsapp" | "email";
}
export interface MembersSendDuesReminderOutput {
  message: string;
}
export async function sendDuesReminder(input: MembersSendDuesReminderInput): Promise<MembersSendDuesReminderOutput> {
  const call = httpsCallable<MembersSendDuesReminderInput, MembersSendDuesReminderOutput>(
    functions,
    "membersSendDuesReminder"
  );
  const res = await call(input);
  return res.data;
}

export interface UpdateMemberDuesStatusInput {
  memberId: string;
  sent: boolean;
}
export async function updateMemberDuesStatus(input: UpdateMemberDuesStatusInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateMemberDuesStatusInput, { ok: true }>(functions, "updateMemberDuesStatus");
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

export interface AdminSetTemporaryPasswordInput {
  memberId: string;
  temporaryPassword: string;
}
export async function adminSetTemporaryPassword(input: AdminSetTemporaryPasswordInput): Promise<{ ok: true }> {
  const call = httpsCallable<AdminSetTemporaryPasswordInput, { ok: true }>(functions, "adminSetTemporaryPassword");
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

export interface SetMemberRoleInput {
  memberId: string;
  role: "admin" | "member" | "site_admin";
}
export async function setMemberRole(input: SetMemberRoleInput): Promise<{ ok: true }> {
  const call = httpsCallable<SetMemberRoleInput, { ok: true }>(functions, "setMemberRole");
  const res = await call(input);
  return res.data;
}

export interface SetSiteAdminModeInput {
  on: boolean;
}
export async function setSiteAdminMode(input: SetSiteAdminModeInput): Promise<{ ok: true }> {
  const call = httpsCallable<SetSiteAdminModeInput, { ok: true }>(functions, "setSiteAdminMode");
  const res = await call(input);
  return res.data;
}
