#!/usr/bin/env node
// Seeds demo/test data: organization, members, companies, and feature flags.
// Reads data from demo-data.json in the same directory — edit that file to customize.
// Can target either the Data Connect emulator (local Postgres) or Cloud SQL production.
//
// Usage:
//   # Emulator (run alongside `firebase emulators:start --only dataconnect`)
//   node functions/scripts/seed-demo-data.js --emulator
//
//   # Cloud SQL (same auth pattern as apply-post-migrations.js)
//   node functions/scripts/seed-demo-data.js \
//     --instance <project:region:instance> --database <db> --iam-user <email>

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

// ── Load data from JSON file ────────────────────────────────────────────────
const { organizationName: ORG_NAME, members: MEMBERS, companies: COMPANIES, featureKeys: FEATURE_KEYS } = JSON.parse(
  readFileSync(join(__dirname, "demo-data.json"), "utf-8")
);

// ── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const emulator = argv.includes("--emulator") || (!argv.includes("--instance") && !argv.includes("--iam-user"));
  const instance = get("--instance");
  const database = get("--database") ?? "asvtrackerdb";
  const iamUser = get("--iam-user");
  return { emulator, instance, database, iamUser };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const args = parseArgs(process.argv.slice(2));
  let client;

  if (args.emulator) {
    console.log("Connecting to local Data Connect emulator (127.0.0.1:5432)...");
    client = new Client({
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: "postgres",
    });
    await client.connect();
  } else {
    console.log(`Connecting to Cloud SQL: ${args.instance}/${args.database}...`);
    const account = getGlobalDefaultAccount();
    if (!account) throw new Error("Not logged in — run `firebase login` first.");
    await requireAuth({ user: account.user, tokens: account.tokens });
    const connector = new Connector({ auth: new FBToolsAuthClient() });
    const clientOpts = await connector.getOptions({
      instanceConnectionName: args.instance,
      ipType: IpAddressTypes.PUBLIC,
      authType: AuthTypes.IAM,
    });
    client = new Client({ ...clientOpts, user: args.iamUser, database: args.database });
    await client.connect();
  }

  try {
    // ── 1. Organization ────────────────────────────────────────────────────
    const { rows: existingOrg } = await client.query(`SELECT id, name FROM "organization"`);
    let orgId;
    if (existingOrg.length > 0) {
      orgId = existingOrg[0].id;
      console.log(`Using existing organization: "${existingOrg[0].name}" (${orgId})`);
    } else {
      const { rows: inserted } = await client.query(
        `INSERT INTO "organization" (name) VALUES ($1) RETURNING id`,
        [ORG_NAME]
      );
      orgId = inserted[0].id;
// ── 2. Organization features (all enabled) ────────────────────────────
    for (const key of FEATURE_KEYS) {
      await client.query(
        `INSERT INTO "organization_feature" ("organization_id", "feature_key", "enabled", "updated_at")
         VALUES ($1, $2, true, now())
         ON CONFLICT ("organization_id", "feature_key") DO UPDATE SET enabled = true`,
        [orgId, key]
      );
    }
    console.log(`Seeded ${FEATURE_KEYS.length} organization features (enabled=true).`);

    // ── 3. Members ─────────────────────────────────────────────────────────
    console.log(`\nSeeding ${MEMBERS.length} members...`);
    let memberCount = 0;
    for (const m of MEMBERS) {
      const { rows: existing } = await client.query(`SELECT id FROM "member" WHERE id = $1`, [m.id]);
      if (existing.length > 0) {
        console.log(`  Member ${m.id} (${m.displayName}) already exists — skipping.`);
        continue;
      }
      await client.query(
        `INSERT INTO "member" (id, "display_name", "investing_entity_name", email, role, "membership_type", status, "created_at")
         VALUES ($1, $2, $2, $3, $4, $5, 'ACTIVE', now())`,
        [m.id, m.displayName, m.email, m.role, m.membershipType]
      );
      console.log(`  Created member ${m.id}: ${m.displayName} (${m.role})`);
      memberCount++;
    }
    console.log(`Members: ${memberCount} new, ${MEMBERS.length - memberCount} existing.`);

    // ── 4. Organization member assignments (for admin/site_admin/dev_site_admin) ──
    const adminRoles = new Set(["ADMIN", "SITE_ADMIN", "DEV_SITE_ADMIN"]);
    const adminMembers = MEMBERS.filter((m) => adminRoles.has(m.role));
    let assigned = 0;
    for (const m of adminMembers) {
      const { rows: existing } = await client.query(
        `SELECT id FROM "organization_member" WHERE "member_id" = $1`,
        [m.id]
      );
      if (existing.length === 0) {
        const roleLabel = m.role === "SITE_ADMIN" ? "Site Admin" : m.role === "DEV_SITE_ADMIN" ? "Dev Site Admin" : "Member";
        await client.query(
          `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
           VALUES ($1, $2, $3, now())`,
          [orgId, m.id, roleLabel]
        );
        assigned++;
        console.log(`  Assigned ${m.displayName} (${m.id}) to organization as ${roleLabel}.`);
      } else {
        console.log(`  ${m.displayName} (${m.id}) already assigned — skipping.`);
      }
    }
    console.log(`Organization member assignments: ${assigned} new.`);
      console.log(`Created organization: "${ORG_NAME}" (${orgId})`);
    }
// ── 5. Companies ──────────────────────────────────────────────────────
    console.log(`\nSeeding ${COMPANIES.length} companies...`);
    for (const c of COMPANIES) {
      const { rows: existing } = await client.query(`SELECT id FROM "company" WHERE name = $1`, [c.name]);
      if (existing.length > 0) {
        console.log(`  Company "${c.name}" already exists — skipping.`);
        continue;
      }
      const { rows: inserted } = await client.query(
        `INSERT INTO "company" (name, "trade_name", sector, tagline, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
        [c.name, c.tradeName, c.sector, c.tagline]
      );
      console.log(`  Created company: ${c.name} (${c.sector})`);
    }
    console.log(`Companies: ${COMPANIES.length} total.`);

    console.log("\n✅ Demo data seeded successfully!");
    console.log(`   Organization: ${ORG_NAME}`);
    console.log(`   Members: ${MEMBERS.length}`);
    console.log(`   Companies: ${COMPANIES.length}`);
    console.log(`   Features: ${FEATURE_KEYS.length} enabled`);
    console.log(`   Org member assignments: ${adminMembers.length}`);

    if (args.emulator) {
      console.log("\n📝 Next steps:");
      console.log("  Run the Auth emulator scripts to create login accounts:");
      console.log("    node scripts/create-test-admin-emulator.js alice@demo.org Pass123!");
      console.log("    node scripts/create-test-member-emulator.js carol@demo.org Pass123! 00003");
      console.log("  Then sign in at http://localhost:3000");
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});