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
    // Count members before
    const { rows: before } = await client.query(`SELECT role, COUNT(*) AS cnt FROM "member" GROUP BY role ORDER BY role`);
    console.log("Before:");
    for (const r of before) console.log(`  ${r.role}: ${r.cnt}`);

    // Update all members except VentureDesk (Adil) – member ID 00112
    const { rows: updated } = await client.query(
      `UPDATE "member" SET role = 'USER' WHERE id != '00112' AND role != 'USER' RETURNING id, role, "display_name"`
    );
    console.log(`\nChanged ${updated.length} members to USER:`);
    for (const r of updated) console.log(`  ${r.id} ${r.display_name} (was ${r.role})`);

    // Count after
    const { rows: after } = await client.query(`SELECT role, COUNT(*) AS cnt FROM "member" GROUP BY role ORDER BY role`);
    console.log("\nAfter:");
    for (const r of after) console.log(`  ${r.role}: ${r.cnt}`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });