import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export interface ListOrganizationsOutput {
  organizations: { id: string; name: string }[];
}
export async function listOrganizations(): Promise<ListOrganizationsOutput> {
  const call = httpsCallable<Record<string, never>, ListOrganizationsOutput>(functions, "listOrganizations");
  const res = await call({});
  return res.data;
}

export interface AssignOrganizationMemberInput {
  memberId: string;
  organizationId: string;
  roleInOrganization?: string;
}
export async function assignOrganizationMember(input: AssignOrganizationMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<AssignOrganizationMemberInput, { ok: true }>(functions, "assignOrganizationMember");
  const res = await call(input);
  return res.data;
}

export interface RemoveOrganizationMemberInput {
  memberId: string;
}
export async function removeOrganizationMember(input: RemoveOrganizationMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<RemoveOrganizationMemberInput, { ok: true }>(functions, "removeOrganizationMember");
  const res = await call(input);
  return res.data;
}

export interface ListOrganizationMembersInput {
  organizationId: string;
}
export interface ListOrganizationMembersOutput {
  members: { memberId: string; displayName: string; email: string; roleInOrganization: string | null }[];
}
export async function listOrganizationMembers(
  input: ListOrganizationMembersInput
): Promise<ListOrganizationMembersOutput> {
  const call = httpsCallable<ListOrganizationMembersInput, ListOrganizationMembersOutput>(
    functions,
    "listOrganizationMembers"
  );
  const res = await call(input);
  return res.data;
}
