#!/usr/bin/env node
// Run by hand after every `firebase dataconnect:sql:migrate` (plan §2) — applies the CHECK
// constraints and jsonb column conversions Data Connect's SDL can't express (see
// dataconnect/schema/post_migrations/*.sql). Reuses the Firebase CLI's own authenticated
// session (via firebase-tools' internal FBToolsAuthClient) rather than requiring separate
// Application Default Credentials setup, matching how `firebase dataconnect:sql:shell` itself
// connects. Idempotent: re-running just skips statements whose effect already exists.
//
// Usage: node scripts/apply-post-migrations.js --instance <project:region:instance> --database <db> --iam-user <email>

const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

const POST_MIGRATIONS_DIR = join(__dirname, "..", "dataconnect", "schema", "post_migrations");
const IGNORABLE_ERROR_CODES = new Set([
  "42710", // duplicate_object (constraint/index already exists)
  "42701", // duplicate_column
  "42P07", // duplicate_table
  "42P06", // duplicate_schema
]);

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const instance = get("--instance");
  const database = get("--database");
  const iamUser = get("--iam-user");
  if (!instance || !database || !iamUser) {
    throw new Error(
      "Usage: apply-post-migrations --instance <project:region:instance> --database <db> --iam-user <email>"
    );
  }
  return { instance, database, iamUser };
}

function splitStatements(sql) {
  // Strip full-line `--` comments BEFORE splitting on `;` — splitting first and then
  // dropping any chunk that merely *starts* with "--" silently discards the first real
  // statement in every file here, since each file opens with a multi-line comment header
  // immediately followed by that statement (caught by inspecting the DB after a run: the
  // first ALTER/ADD CONSTRAINT in each file never applied while the rest did).
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function run() {
  const { instance, database, iamUser } = parseArgs(process.argv.slice(2));

  // Bootstraps firebase-tools' internal auth state from the `firebase login` session on this
  // machine, the same way the CLI's own command lifecycle does before every command runs.
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
    const files = readdirSync(POST_MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      console.log(`Applying ${file}...`);
      const sql = readFileSync(join(POST_MIGRATIONS_DIR, file), "utf-8");
      for (const statement of splitStatements(sql)) {
        try {
          await client.query(statement);
        } catch (err) {
          if (err.code && IGNORABLE_ERROR_CODES.has(err.code)) {
            console.log(`  (skipped, already applied: ${err.message})`);
            continue;
          }
          throw err;
        }
      }
    }
    console.log("Post-migrations applied.");
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
