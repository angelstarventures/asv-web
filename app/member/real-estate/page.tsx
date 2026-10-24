import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { RealEstateTabs } from "@/components/RealEstateTabs";
import { parseRealEstateTab } from "@/lib/realEstateTab";
import { RealEstateView } from "@/lib/realEstateView";
export const dynamic = 'force-dynamic';
export default async function MemberRealEstatePage({ searchParams }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const member = await getCurrentMember();
    if (!member)
        redirect('/login');
    const params = await searchParams, tab = parseRealEstateTab(Array.isArray(params.retab) ? params.retab[0] : params.retab);
    return <div className="font-sans space-y-6 px-6 py-10"><h1 className="text-xl font-semibold tracking-tight">Your real estate investments</h1><RealEstateTabs active={tab}/>{tab === 'investment' ? <RealEstateView authUid={member.authUid}/> : <p className="rounded-2xl border bg-card p-6 text-zinc-500">Rental reporting is coming in phase 2.</p>}</div>;
}
