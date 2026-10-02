#!/usr/bin/env node
// Syncs Firebase Auth custom claims for all members whose DB role no longer matches
// their Firebase claims. Run after bulk role changes.
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

async function run() {
  // ── Firebase Admin SDK ──
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in – run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });
  const credential = {
    getAccessToken: async () => {
      const token = await apiv2.getAccessToken();
      return { access_token: token, expires_in: 3600 };
    },
  };
  const app = initializeApp({ credential, projectId: "angelstar-investments" });
  const auth = getAuth(app);

  // ── Cloud SQL ──
  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const opts = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
  const client = new Client({ ...opts, user: IAM_USER, database: DB });
  await client.connect();

  try {
    const { rows: members } = await client.query(
      `SELECT id, "auth_uid" AS "authUid", email, role FROM "member" WHERE "auth_uid" IS NOT NULL ORDER BY id`
    );
    const memberList = members || [];
    console.log(`Found ${memberList.length} provisioned members.`);

    let updated = 0;
    let errors = 0;
    for (const m of memberList) {
      const role = m.role.toLowerCase();
      try {
        const user = await auth.getUser(m.authUid);
        const existingClaims = user.customClaims ?? {};
        if (existingClaims.role === role) {
          console.log(`  ${m.id} ${m.email} – role ${role} already matches, skipping.`);
          continue;
        }
        await auth.setCustomUserClaims(m.authUid, { ...existingClaims, role });
        await auth.revokeRefreshTokens(m.authUid);
        console.log(`  ${m.id} ${m.email} – claims updated to ${role}`);
        updated++;
      } catch (err) {
        console.error(`  ${m.id} ${m.email} – ERROR: ${err}`);
        errors++;
      }
    }
    console.log(`\nDone: ${updated} updated, ${errors} errors.`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });