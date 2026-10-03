#!/usr/bin/env node
// Merges two member records into one. Dry-run by default; pass --commit to write.
// Usage: node scripts/merge-members.js <survivor-id> <merge-from-id> [--commit]

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

const INSTANCE = "angelstar-investments:us-east1:asv-tracker-sql";
const DB = "asvtrackerdb";
const IAM_USER = "adiljagmag@gmail.com";

const survivorId = process.argv[2];
const mergeFromId = process.argv[3];
const commit = process.argv.includes("--commit");

if (!survivorId || !mergeFromId) {
  console.error("Usage: node scripts/merge-members.js <survivor-id> <merge-from-id> [--commit]");
  process.exit(1);
}
async function run() {
  console.log(`Mode: ${commit ? "COMMIT" : "DRY RUN"}`);
  console.log(`Survivor: ${survivorId}`);
  console.log(`Merge from: ${mergeFromId}`);
  console.log("");

  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in – run 'firebase login' first.");
  await requireAuth({ user: account.user, tokens: account.tokens });

  const credential = {
    getAccessToken: async () => {
      const token = await apiv2.getAccessToken();
      return { access_token: token, expires_in: 3600 };
    },
  };
  const app = initializeApp({ credential, projectId: "angelstar-investments" });
  const auth = getAuth(app);

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const opts = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
  const client = new Client({ ...opts, user: IAM_USER, database: DB });
  await client.connect();

  try {
    // ── Check both members exist ──────────────────────────────────────────────
    const { rows: survivors } = await client.query(
      `SELECT id, display_name AS "displayName", investing_entity_name AS "investingEntityName", email, auth_uid AS "authUid" FROM "member" WHERE id = $1`,
      [survivorId]
    );
    const { rows: mergeds } = await client.query(
      `SELECT id, display_name AS "displayName", investing_entity_name AS "investingEntityName", email, auth_uid AS "authUid" FROM "member" WHERE id = $1`,
      [mergeFromId]
    );
    if (survivors.length === 0) throw new Error(`Survivor ${survivorId} not found.`);
    if (mergeds.length === 0) throw new Error(`Merge-from ${mergeFromId} not found.`);

    const s = survivors[0];
    const m = mergeds[0];

    console.log("Survivor:", s.id, s.displayName, `(${s.investingEntityName})`, s.email);
    console.log("Merge from:", m.id, m.displayName, `(${m.investingEntityName})`, m.email);
    console.log("");

    // ── Tables that may reference mergeFromId ─────────────────────────────────
    const TABLE_MAP = [
      { table: "allocation", column: "member_id" },
      { table: "member_valuation", column: "member_id" },
      { table: "organization_member", column: "member_id" },
      { table: "member_organization_feature", column: "member_id" },
      { table: "organization_feature", column: "updated_by_id" },
    ];

    for (const { table, column } of TABLE_MAP) {
      const { rows: refs } = await client.query(`SELECT COUNT(*) AS cnt FROM "${table}" WHERE "${column}" = $1`, [mergeFromId]);
      const count = Number(refs[0]?.cnt ?? 0);
      if (count > 0) {
        console.log(`  ${table}.${column}: ${count} row(s) — will UPDATE to ${survivorId}`);
        if (commit) {
          await client.query(`UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`, [survivorId, mergeFromId]);
        }
      }
    }

    // ── Update survivor investing entity name from merge-from ────────────────
    if (s.investingEntityName !== m.investingEntityName && m.investingEntityName) {
      console.log(`  investing_entity_name for ${survivorId} — will UPDATE to "${m.investingEntityName}"`);
      if (commit) {
        await client.query(`UPDATE "member" SET "investing_entity_name" = $1 WHERE id = $2`, [m.investingEntityName, survivorId]);
      }
    }

    // ── Delete the old Firebase Auth account ──────────────────────────────────
    if (m.authUid) {
      console.log(`  Firebase Auth user ${m.authUid} — will DELETE`);
      if (commit) {
        try { await auth.deleteUser(m.authUid); console.log("    Deleted."); }
        catch (e) { console.warn(`    Delete failed: ${e.message}`); }
      }
    }

    // ── Delete the merge-from member ──────────────────────────────────────────
    console.log(`  Member ${mergeFromId} — will DELETE`);
    if (commit) {
      await client.query(`DELETE FROM "member" WHERE id = $1`, [mergeFromId]);
      console.log("    Deleted.");
    }

    console.log("");
    if (commit) {
      console.log("Merge complete.");
    } else {
      console.log("Dry run — pass --commit to execute.");
    }
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });