#!/usr/bin/env node
// Looks up members by display_name or email (case-insensitive).
// Usage: node scripts/find-member.js <search-term>
// Pass --id to search by id instead.

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

const INSTANCE = "angelstar-investments:us-east1:asv-tracker-sql";
const DB = "asvtrackerdb";
const IAM_USER = "adiljagmag@gmail.com";

const searchTerm = process.argv[2];
if (!searchTerm) { console.error("Usage: node scripts/find-member.js <search-term>"); process.exit(1); }

async function run() {
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in – run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });
  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const opts = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
  const client = new Client({ ...opts, user: IAM_USER, database: DB });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, display_name AS "displayName", investing_entity_name AS "investingEntityName", email, role FROM "member"
       WHERE display_name ILIKE $1 OR investing_entity_name ILIKE $1 OR email ILIKE $1
       ORDER BY id`,
      [`%${searchTerm}%`]
    );
    console.log(`Found ${rows.length} member(s):`);
    for (const r of rows) {
      console.log(`  ${r.id.padEnd(6)} ${r.displayName.padEnd(25)} ${(r.investingEntityName ?? "").padEnd(30)} ${(r.email ?? "").padEnd(30)} ${r.role}`);
    }
  } finally { await client.end(); connector.close(); }
}
run().catch(e => { console.error(e); process.exit(1); });