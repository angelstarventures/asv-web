#!/usr/bin/env node
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

const INSTANCE = "angelstar-investments:us-east1:asv-tracker-sql";
const DB = "asvtrackerdb";
const IAM_USER = "adiljagmag@gmail.com";

async function run() {
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in – run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });
  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const opts = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
  const client = new Client({ ...opts, user: IAM_USER, database: DB });
  await client.connect();

  try {
    // Check references to member 00000
    const tables = ["ledger_entry", "organization_member", "document", "allocation", "member_valuation",
      "organization_feature", "member_organization_feature", "deal", "deal_tag_assignment",
      "deal_rating", "deal_reviewer_match", "event_type_definition", "priced_round_detail",
      "safe_round_detail", "non_participating_round_detail", "exit_event_detail",
      "valuation_assessment_detail", "compliance_flag_detail", "company_update_detail"];
    
    for (const t of tables) {
      try {
        const { rows } = await client.query(
          `SELECT EXISTS (SELECT 1 FROM "${t}" WHERE "created_by_id" = '00000' OR "member_id" = '00000' OR "updated_by_id" = '00000' OR "officer_id" = '00000') AS ref`
        );
        if (rows[0]?.ref) {
          const { rows: count } = await client.query(`SELECT COUNT(*) AS cnt FROM "${t}" WHERE "created_by_id" = '00000' OR "member_id" = '00000' OR "updated_by_id" = '00000' OR "officer_id" = '00000'`);
          console.log(`Table "${t}" references 00000: ${count[0]?.cnt} rows`);
        }
      } catch {}
    }

    // Check ledger_entry.created_by
    const { rows: ledgerRefs } = await client.query(`SELECT COUNT(*) AS cnt FROM "ledger_entry" WHERE "created_by_id" = '00000'`);
    console.log(`\nLedger entries created by 00000: ${ledgerRefs[0]?.cnt}`);
    
    if (ledgerRefs[0]?.cnt > 0) {
      console.log("Cannot delete – 00000 has ledger entries. Keeping as historical author.");
      return;
    }

    // Safe to delete
    const { rows: mem } = await client.query(`SELECT id, email, role FROM "member" WHERE id = '00000'`);
    if (mem.length === 0) { console.log("Member 00000 not found."); return; }
    
    await client.query(`DELETE FROM "member" WHERE id = '00000'`);
    console.log(`Deleted member 00000 (${mem[0].email})`);
  } finally {
    await client.end(); connector.close();
  }
}
run().catch((err) => { console.error(err); process.exitCode = 1; });