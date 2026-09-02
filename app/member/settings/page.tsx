import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { EditProfileForm } from "@/components/EditProfileForm";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function MemberSettingsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const { member: profile } = await getMemberById({ id: member.memberId });
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <ProfilePhotoUpload currentPhotoUrl={profile.photoUrl ?? null} />

      <EditProfileForm
        displayName={profile.displayName}
        investingEntityName={profile.investingEntityName}
        profileText={profile.profileText ?? null}
      />

      <ChangePasswordForm />
    </div>
  );
}
