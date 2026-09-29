import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export interface AssignCompanyMemberInput {
  memberId: string;
  companyId: string;
  roleInCompany?: string;
}
export async function assignCompanyMember(input: AssignCompanyMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<AssignCompanyMemberInput, { ok: true }>(functions, "assignCompanyMember");
  const res = await call(input);
  return res.data;
}

export interface RemoveCompanyMemberInput {
  memberId: string;
}
export async function removeCompanyMember(input: RemoveCompanyMemberInput): Promise<{ ok: true }> {
  const call = httpsCallable<RemoveCompanyMemberInput, { ok: true }>(functions, "removeCompanyMember");
  const res = await call(input);
  return res.data;
}

export interface ListCompanyMembersInput {
  companyId: string;
}
export interface ListCompanyMembersOutput {
  members: { memberId: string; displayName: string; email: string; roleInCompany: string | null }[];
}
export async function listCompanyMembers(input: ListCompanyMembersInput): Promise<ListCompanyMembersOutput> {
  const call = httpsCallable<ListCompanyMembersInput, ListCompanyMembersOutput>(functions, "listCompanyMembers");
  const res = await call(input);
  return res.data;
}
