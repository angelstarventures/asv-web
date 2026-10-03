#!/usr/bin/env node
// Provisions Firebase Auth accounts for all members who don't have one yet.
// Dry-run by default; pass --commit to write.
//
// Usage:
//   node scripts/provision-all-members.js [--commit]

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");
const crypto = require("node:crypto");

const INSTANCE = "angelstar-investments:us-east1:asv-tracker-sql";
const DB = "asvtrackerdb";
const IAM_USER = "adiljagmag@gmail.com";

const commit = process.argv.includes("--commit");

async function run() {
  console.log(`Mode: ${commit ? "COMMIT (will write)" : "DRY RUN (no writes)"}`);
  console.log("");

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
    // Find all members without an auth account
    const { rows: members } = await client.query(
      `SELECT id, email, role, \"display_name\" AS \"displayName\" FROM \"member\" WHERE \"auth_uid\" IS NULL ORDER BY id`
    );
    const memberList = members || [];
    console.log(`Found ${memberList.length} unprovisioned member(s).`);
    console.log("");

    if (memberList.length === 0) {
      console.log("Nothing to do — all members already have an auth account.");
      return;
    }

    let created = 0;
    let errors = 0;

    for (const m of memberList) {
      const role = m.role.toLowerCase();
      const temporaryPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "A1!";

      if (commit) {
        try {
          // Create the Firebase Auth account
          const userRecord = await auth.createUser({ email: m.email, password: temporaryPassword });

          // Set custom claims
          await auth.setCustomUserClaims(userRecord.uid, {
            role,
            status: "active",
            memberId: m.id,
            mustChangePassword: true,
          });

          // Update the member row with the authUid
          await client.query(
            `UPDATE "member" SET "auth_uid" = $1 WHERE id = $2`,
            [userRecord.uid, m.id]
          );

          console.log(`  ${m.id} ${m.email} → ${role} – OK (uid: ${userRecord.uid})`);
          created++;
        } catch (err) {
          console.error(`  ${m.id} ${m.email} – ERROR: ${err.message ?? err}`);
          errors++;
        }
      } else {
        // Dry run — just log what would happen
        console.log(`  ${m.id} ${m.email} → ${role} – WOULD CREATE`);
        created++;
      }
    }

    console.log("");
    console.log(`Done: ${created} would be created, ${errors} errors.`);
    if (!commit) {
      console.log("");
      console.log("Pass --commit to execute these changes.");
    }
    if (commit) {
      console.log("");
      console.log("NOTE: Invitation emails were NOT sent by this script.");
      console.log("Send individual password resets from each member's detail page,");
      console.log("or run the email-sending step separately.");
    }
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });