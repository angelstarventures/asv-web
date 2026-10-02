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
  if (!account) throw new Error("Not logged in — run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const opts = await connector.getOptions({ instanceConnectionName: INSTANCE, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
  const client = new Client({ ...opts, user: IAM_USER, database: DB });
  await client.connect();

  try {
    // Find VentureDesk org
    const { rows: orgs } = await client.query(`SELECT id, name FROM "organization" WHERE LOWER(name) = 'venturedesk'`);
    let orgId;
    if (orgs.length > 0) {
      orgId = orgs[0].id;
      console.log(`Found organization: "${orgs[0].name}" (${orgId})`);
    } else {
      console.log("VentureDesk org not found — creating it.");
      const { rows: inserted } = await client.query(
        `INSERT INTO "organization" (name) VALUES ('VentureDesk') RETURNING id`
      );
      orgId = inserted[0].id;
      console.log(`Created VentureDesk organization (${orgId})`);
    }

    // Find next member ID
    const { rows: maxRow } = await client.query(`SELECT MAX(id::int) AS max FROM "member"`);
    const nextId = (Number(maxRow[0]?.max ?? "0") + 1).toString().padStart(5, "0");
    console.log(`Next member ID: ${nextId}`);

    // Create member
    const email = "venturedesk53@gmail.com";
    const displayName = "VentureDesk (Adil)";
    const role = "DEV_SITE_ADMIN";
    const { rows: existing } = await client.query(`SELECT id FROM "member" WHERE email = $1`, [email]);
    if (existing.length > 0) {
      console.log(`Member with email ${email} already exists (id=${existing[0].id}) — updating role.`);
      await client.query(`UPDATE "member" SET role = $1, "display_name" = $2 WHERE id = $3`, [role, displayName, existing[0].id]);
    } else {
      await client.query(
        `INSERT INTO "member" (id, "display_name", "investing_entity_name", email, role, "membership_type", status, "created_at")
         VALUES ($1, $2, $2, $3, $4, 'MEMBER', 'ACTIVE', now())`,
        [nextId, displayName, email, role]
      );
      console.log(`Created member ${nextId}: ${displayName}`);
    }

    // Create org_member row
    const memberId = existing.length > 0 ? existing[0].id : nextId;
    const { rows: omRows } = await client.query(
      `SELECT id FROM "organization_member" WHERE "member_id" = $1`, [memberId]
    );
    if (omRows.length === 0) {
      await client.query(
        `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
         VALUES ($1, $2, 'Dev Site Admin', now())`,
        [orgId, memberId]
      );
      console.log(`Assigned ${memberId} to VentureDesk organization.`);
    } else {
      console.log(`Member ${memberId} already assigned to an org — moving to VentureDesk.`);
      await client.query(
        `UPDATE "organization_member" SET "organization_id" = $1, "role_in_organization" = 'Dev Site Admin' WHERE "member_id" = $2`,
        [orgId, memberId]
      );
    }

    console.log(`\n✅ Created/updated member: ${displayName} (${memberId}) as ${role} in VentureDesk`);
    console.log(`📝 Next step: Create a Firebase Auth account for ${email}`);
    console.log(`   Set custom claims: { role: "dev_site_admin", status: "active", memberId: "${memberId}" }`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });