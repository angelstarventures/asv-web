#!/usr/bin/env node
// Seeds organization_feature rows for all known feature keys with enabled=true for the sole
// Organization. Idempotent: uses ON CONFLICT DO NOTHING so re-running is safe.
// Dry-run by default; pass --commit to write.
//
// Usage:
//   node functions/scripts/seed-organization-features.js \
//     --instance <project:region:instance> --database <db> --iam-user <email> \
//     [--dry-run | --commit]

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

// Matches the OrganizationFeatureKey type in lib/auth/permissions.ts and
// functions/src/lib/organizationFeatureCheck.ts — MUST be kept in sync.
const FEATURE_KEYS = [
  "DEALS",
  "AI_DEAL_MATCHING",
  "AI_CHAT",
  "AI_DOCUMENT_ANALYSIS",
  "MULTIPLE_LEDGERS",
  "AI_MODEL_PROMPT_CONFIG",
  "AI_MODEL_SELECTION",
  "MEMBERSHIP_DUES",
  "COSTS",
];

// ── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const instance = get("--instance");
  const database = get("--database");
  const iamUser = get("--iam-user");
  const commit = argv.includes("--commit");
  const dryRun = argv.includes("--dry-run") || !commit;

  if (!instance || !database || !iamUser) {
    throw new Error(
      "Usage: seed-organization-features " +
      "--instance <project:region:instance> --database <db> --iam-user <email> [--dry-run|--commit]"
    );
  }
  return { instance, database, iamUser, commit, dryRun };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const { instance, database, iamUser, commit, dryRun } = parseArgs(process.argv.slice(2));

  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "COMMIT (will write)"}`);
  console.log(`Instance: ${instance}, DB: ${database}, IAM: ${iamUser}`);
  console.log("");

  const account = getGlobalDefaultAccount();
  if (!account) {
    throw new Error("Not logged in — run `firebase login` first.");
  }
  await requireAuth({ user: account.user, tokens: account.tokens });

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: instance,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });

  const client = new Client({ ...clientOpts, user: iamUser, database });
  await client.connect();

  try {
    // ── Step 1: Find the sole Organization ─────────────────────────────────
    const { rows: orgRows } = await client.query(`SELECT id, name FROM "organization"`);
    if (orgRows.length === 0) {
      console.error("FATAL: No Organization row found. Has schema migration 005 been applied?");
      process.exitCode = 1;
      return;
    }
    if (orgRows.length > 1) {
      console.error(
        `FATAL: Expected exactly one Organization (single-tenant deployment), found ${orgRows.length}.`
      );
      process.exitCode = 1;
      return;
    }
    const org = orgRows[0];
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log("");

    // ── Step 2: Check which features already have a row ────────────────────
    const { rows: existingRows } = await client.query(
      `SELECT "feature_key" FROM "organization_feature" WHERE "organization_id" = $1`,
      [org.id]
    );
    const existingKeys = new Set(existingRows.map((r) => r.feature_key));
    const toInsert = FEATURE_KEYS.filter((k) => !existingKeys.has(k));

    console.log(`Total feature keys: ${FEATURE_KEYS.length}`);
    console.log(`Already seeded: ${existingKeys.size}`);
    console.log(`To insert: ${toInsert.length}`);
    if (toInsert.length > 0) {
      console.log(`Keys: ${toInsert.join(", ")}`);
    }
    console.log("");

    if (toInsert.length === 0) {
      console.log("Nothing to do — all features already seeded.");
      return;
    }

    if (dryRun) {
      console.log("DRY RUN — features that WOULD be inserted with enabled=true:");
      for (const key of toInsert) {
        console.log(`  ${org.name} → ${key} = true`);
      }
      console.log("");
      console.log("Pass --commit to write these rows.");
      return;
    }

    // ── Step 3: Find a member to use as updated_by ─────────────────────────
    // The organization_feature table has a NOT NULL updated_by_id FK to member.id.
    // Use any existing admin/site_admin/dev_site_admin member, or failing that any member.
    const { rows: updaterRows } = await client.query(
      `SELECT id FROM "member"
       WHERE role IN ('ADMIN', 'SITE_ADMIN', 'DEV_SITE_ADMIN', 'USER')
       ORDER BY role ASC, id ASC LIMIT 1`
    );
    let updatedById;
    if (updaterRows.length > 0) {
      updatedById = updaterRows[0].id;
      console.log(`Using member ${updatedById} as updated_by.`);
    } else {
      // Bootstrap scenario: no members exist yet. Temporarily use a placeholder
      // and note this for post-seed member creation.
      updatedById = "00000";
      console.warn("WARNING: No member found — using '00000' as updated_by. Create a member and re-run if this fails.");
    }

    // ── Step 4: Insert rows ────────────────────────────────────────────────
    console.log(`Inserting ${toInsert.length} feature row(s)...`);
    let inserted = 0;
    for (const key of toInsert) {
      await client.query(
        `INSERT INTO "organization_feature" ("organization_id", "feature_key", "enabled", "updated_by_id", "updated_at")
         VALUES ($1, $2, true, $3, now())
         ON CONFLICT ("organization_id", "feature_key") DO NOTHING`,
        [org.id, key, updatedById]
      );
      inserted++;
      console.log(`  Inserted: ${key} = true`);
    }

    console.log("");
    console.log(`Done. ${inserted} feature row(s) inserted with enabled=true.`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});