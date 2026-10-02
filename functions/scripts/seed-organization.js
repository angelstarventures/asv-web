#!/usr/bin/env node
// Seeds the Organization row for a new tenant. Idempotent: uses ON CONFLICT DO NOTHING.
// Dry-run by default; pass --commit to write.
//
// Usage:
//   node functions/scripts/seed-organization.js \
//     --instance <project:region:instance> --database <db> --iam-user <email> \
//     --name "My Angel Group" \
//     [--dry-run | --commit]
//
// The --name flag is REQUIRED for a new tenant; defaults to "AngelStar Ventures" so a bare
// invocation with ASV's instance/database/iam-user is sufficient for the initial tenant.

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

// ── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const instance = get("--instance");
  const database = get("--database");
  const iamUser = get("--iam-user");
  const name = get("--name") ?? "AngelStar Ventures";
  const commit = argv.includes("--commit");
  const dryRun = argv.includes("--dry-run") || !commit;

  if (!instance || !database || !iamUser) {
    throw new Error(
      "Usage: seed-organization " +
      "--instance <project:region:instance> --database <db> --iam-user <email> " +
      "--name \"Org Name\" [--dry-run|--commit]"
    );
  }
  return { instance, database, iamUser, name, commit, dryRun };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const { instance, database, iamUser, name, commit, dryRun } = parseArgs(process.argv.slice(2));

  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "COMMIT (will write)"}`);
  console.log(`Organization name: ${name}`);
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
    // Check if an org already exists
    const { rows: existing } = await client.query(`SELECT id, name FROM "organization"`);
    if (existing.length > 0) {
      console.log(`Organization already exists: "${existing[0].name}" (${existing[0].id})`);
      if (existing.length > 1) {
        console.warn(`WARNING: ${existing.length} organizations found — expected exactly one.`);
      }
      console.log("Nothing to do.");
      return;
    }

    if (dryRun) {
      console.log(`DRY RUN — would INSERT organization with name="${name}"`);
      console.log("Pass --commit to write.");
      return;
    }

    const { rows: inserted } = await client.query(
      `INSERT INTO "organization" (name) VALUES ($1) RETURNING id`,
      [name]
    );
    console.log(`Created organization: "${name}" (${inserted[0].id})`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});