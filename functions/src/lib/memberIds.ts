import { query } from "./dataconnect-admin";

export async function fetchAllMemberIds(): Promise<Set<string>> {
  const rows = await query<{ id: string }>(`SELECT id FROM "member"`);
  return new Set(rows.map((r) => r.id));
}

const MEMBER_DICT_FIELDS = ["allocations", "member_valuations", "member_payouts"] as const;

export interface UnknownMemberReference {
  recordIndex: number;
  field: string;
  reference: string;
}

// Scans every record's per-member dict fields (allocations, member_valuations, member_payouts)
// for keys that don't match a real Member.id. The AI (or a hand-typed import) can end up with a
// dict key that isn't a real member — either the investor genuinely isn't in the system yet, or
// name resolution against the given member list failed silently — and without this check that
// only ever surfaces as a raw foreign-key violation at commit time, with no indication of which
// name/ID was the problem.
export function findUnknownMemberReferences(
  records: Record<string, unknown>[],
  knownMemberIds: Set<string>
): UnknownMemberReference[] {
  const found: UnknownMemberReference[] = [];
  records.forEach((record, recordIndex) => {
    for (const field of MEMBER_DICT_FIELDS) {
      const dict = record[field];
      if (!dict || typeof dict !== "object") continue;
      for (const key of Object.keys(dict as Record<string, unknown>)) {
        if (!knownMemberIds.has(key)) {
          found.push({ recordIndex, field, reference: key });
        }
      }
    }
  });
  return found;
}
