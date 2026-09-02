import type { PoolClient } from "pg";

// Every per-type detail table, plus the two per-member breakdown tables and the import-hash
// row — schema.gql declares no cascade behavior anywhere (a deliberate append-only-ledger
// design, see applyLedgerRecord.ts), so a ledger_entry row's children must be deleted
// explicitly, in child-before-parent order, or the FK constraints reject the delete outright.
// Deleting from a table where no matching row exists is a harmless no-op, so this list doesn't
// need to know the entry's type first.
const DETAIL_TABLES = [
  "priced_round_detail",
  "safe_round_detail",
  "non_participating_round_detail",
  "exit_event_detail",
  "valuation_assessment_detail",
  "compliance_flag_detail",
  "company_update_detail",
  "custom_event_detail",
];

// Shared by ledgerDeleteRecord (delete) and ledgerUpdateRecord (delete-then-reinsert via
// applyLedgerRecord, since the ledger is append-only and "editing" a row in place has no
// existing precedent to build on). Returns the company id so the caller can recomputeRollups.
export async function deleteLedgerEntry(client: PoolClient, ledgerEntryId: string): Promise<string> {
  const { rows } = await client.query<{ company_id: string }>(
    `SELECT "company_id" FROM "ledger_entry" WHERE id = $1`,
    [ledgerEntryId]
  );
  const companyId = rows[0]?.company_id;
  if (!companyId) {
    throw new Error(`No ledger_entry row for id "${ledgerEntryId}".`);
  }

  await client.query(`DELETE FROM "allocation" WHERE "ledger_entry_id" = $1`, [ledgerEntryId]);
  await client.query(`DELETE FROM "member_valuation" WHERE "ledger_entry_id" = $1`, [ledgerEntryId]);
  await client.query(`DELETE FROM "imported_record_hash" WHERE "ledger_entry_id" = $1`, [ledgerEntryId]);
  for (const table of DETAIL_TABLES) {
    await client.query(`DELETE FROM "${table}" WHERE "ledger_entry_id" = $1`, [ledgerEntryId]);
  }
  await client.query(`DELETE FROM "ledger_entry" WHERE id = $1`, [ledgerEntryId]);

  return companyId;
}
