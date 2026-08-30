import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/users-onCreateProvision.ts's input/output shapes exactly —
// duplicated rather than imported so the web app never reaches into the Cloud Functions
// project's internals; this boundary IS the contract (plan §4).

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
