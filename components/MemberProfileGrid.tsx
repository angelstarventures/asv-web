import type { ListMemberProfilesData } from "@/lib/dataconnect/generated";

type Profile = ListMemberProfilesData["members"][number];

const GROUP_ORDER = ["BOARD_MEMBER", "MEMBER", "ASSOCIATE", "EMERITUS"] as const;
const GROUP_LABELS: Record<(typeof GROUP_ORDER)[number], string> = {
  BOARD_MEMBER: "Board Members",
  MEMBER: "Members",
  ASSOCIATE: "Associates",
  EMERITUS: "Emeritus",
};

// A grid of photo cards grouped by membership tier — modeled on
// angelstarventures.com/our-team's public team page layout.
export function MemberProfileGrid({ members }: { members: Profile[] }) {
  const groups = GROUP_ORDER.map((type) => ({
    type,
    label: GROUP_LABELS[type],
    people: members.filter((m) => m.membershipType === type),
  })).filter((g) => g.people.length > 0);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.type}>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">{group.label}</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.people.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2 text-center">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a member-uploaded data: URL, not an optimizable remote image
                  <img
                    src={m.photoUrl}
                    alt={m.displayName}
                    className="h-20 w-20 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-500">
                    {m.displayName.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-medium">{m.displayName}</p>
                {m.profileText && <p className="text-xs text-zinc-500">{m.profileText}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
