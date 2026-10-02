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
    // Find VentureDesk org
    const { rows: orgs } = await client.query(`SELECT id, name FROM "organization" WHERE LOWER(name) = 'venturedesk'`);
    if (orgs.length === 0) {
      console.error("VentureDesk organization not found.");
      return;
    }
    const orgId = orgs[0].id;
    console.log(`Using VentureDesk org: ${orgs[0].name} (${orgId})`);

    // Update / insert org_member row for 00000
    const { rows: existing } = await client.query(`SELECT id FROM "organization_member" WHERE "member_id" = '00000'`);
    if (existing.length > 0) {
      await client.query(`UPDATE "organization_member" SET "organization_id" = $1, "role_in_organization" = 'System' WHERE "member_id" = '00000'`, [orgId]);
      console.log("Moved System Migration (00000) to VentureDesk.");
    } else {
      await client.query(`INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at") VALUES ($1, '00000', 'System', now())`, [orgId]);
      console.log("Added System Migration (00000) to VentureDesk.");
    }
  } finally {
    await client.end(); connector.close();
  }
}
run().catch((err) => { console.error(err); process.exitCode = 1; });