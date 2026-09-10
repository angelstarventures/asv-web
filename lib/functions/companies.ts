import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/companies-updateLogo.ts exactly — same duplicated-boundary-
// contract reasoning as the other lib/functions/*.ts wrappers.
export interface UpdateCompanyLogoInput {
  companyId: string;
  photoDataUrl: string | null;
}
export async function updateCompanyLogo(input: UpdateCompanyLogoInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateCompanyLogoInput, { ok: true }>(functions, "updateCompanyLogo");
  const res = await call(input);
  return res.data;
}

export interface CompaniesSetDdLeadInput {
  companyId: string;
  memberId: string | null;
}
export async function setDdLead(input: CompaniesSetDdLeadInput): Promise<{ ok: true }> {
  const call = httpsCallable<CompaniesSetDdLeadInput, { ok: true }>(functions, "companiesSetDdLead");
  const res = await call(input);
  return res.data;
}

export interface CompaniesSetCeoInfoInput {
  companyId: string;
  ceoName: string | null;
  ceoContact: string | null;
}
export async function setCeoInfo(input: CompaniesSetCeoInfoInput): Promise<{ ok: true }> {
  const call = httpsCallable<CompaniesSetCeoInfoInput, { ok: true }>(functions, "companiesSetCeoInfo");
  const res = await call(input);
  return res.data;
}
