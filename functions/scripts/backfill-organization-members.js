#!/usr/bin/env node
// Backfills organization_member rows for every existing admin-role member. Dry-run by default;
// pass --commit to write. Idempotent: skips members that already have a row.
//
// Usage:
//   node functions/scripts/backfill-organization-members.js \
//     --instance <project:region:instance> --database <db> --iam-user <email> \
//     [--dry-run | --commit]
//
// The instance/database/iam-user flags mirror apply-post-migrations.js since both connect
// to Cloud SQL via the same Cloud SQL Connector + firebase-tools auth pattern.

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

// ── Constants ────────────────────────────────────────────────────────────────

// Members whose role is exactly one of these get a backfill row.
const TARGET_ROLES_UPPER = ["ADMIN", "SITE_ADMIN", "DEV_SITE_ADMIN", "USER"];

// System Migration (00000) is a placeholder account with no login — skip by default and
// recommend confirming with the user before including it.
const SKIP_MEMBER_IDS = ["00000"];
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
  const dryRun = argv.includes("--dry-run") || !commit; // --dry-run or no flag = dry run

  if (!instance || !database || !iamUser) {
    throw new Error(
      "Usage: backfill-organization-members " +
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

  // Bootstrap firebase-tools auth from the local `firebase login` session
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
    // ── Step 1: Confirm exactly one Organization row ──────────────────────
    const { rows: orgRows } = await client.query(`SELECT id, name FROM "organization"`);
    if (orgRows.length === 0) {
      console.error("FATAL: No Organization row found. Has schema migration 005 been applied?");
      process.exitCode = 1;
      return;
    }
    if (orgRows.length > 1) {
      console.error(
        `FATAL: Expected exactly one Organization (single-tenant deployment), found ${orgRows.length}. ` +
        "Cannot safely backfill without knowing which org each admin belongs to. " +
        "Resolve org ambiguity before re-running."
      );
      process.exitCode = 1;
      return;
    }
    const org = orgRows[0];
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log("");

    // ── Step 2: Find target members ───────────────────────────────────────
    const placeholders = TARGET_ROLES_UPPER.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: memberRows } = await client.query(
      `SELECT id, "display_name" AS "displayName", role, email FROM "member" WHERE role IN (${placeholders}) ORDER BY id`,
      TARGET_ROLES_UPPER
    );
    console.log(`Found ${memberRows.length} member(s) with role in [${TARGET_ROLES_UPPER.join(", ")}]:`);
    for (const m of memberRows) {
      const skipNote = SKIP_MEMBER_IDS.includes(m.id) ? " [SKIPPED — placeholder/system account]" : "";
      console.log(`  ${m.id}  ${m.displayName ?? "(no name)"}  <${m.email ?? "no email"}>${skipNote}`);
    }
    console.log("");

    // ── Step 3: Check which already have a row ────────────────────────────
    const memberIds = memberRows.map((m) => m.id);
    const existing = new Set();
    if (memberIds.length > 0) {
      const idPlaceholders = memberIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rows: existingRows } = await client.query(
        `SELECT "member_id" FROM "organization_member" WHERE "member_id" IN (${idPlaceholders})`,
        memberIds
      );
      for (const r of existingRows) {
        existing.add(r.member_id);
      }
    }

    const toInsert = memberRows.filter((m) => !existing.has(m.id) && !SKIP_MEMBER_IDS.includes(m.id));

    console.log(`Already have organization_member row: ${existing.size}`);
    console.log(`Skipped (system/placeholder): ${memberRows.filter((m) => SKIP_MEMBER_IDS.includes(m.id)).length}`);
    console.log(`To insert: ${toInsert.length}`);
    console.log("");

    if (toInsert.length === 0) {
      console.log("Nothing to do — all eligible members already have an organization_member row.");
      return;
    }

    if (dryRun) {
      console.log("DRY RUN — rows that WOULD be inserted:");
      for (const m of toInsert) {
        console.log(`  INSERT org="${org.id}" member="${m.id}" (${m.displayName ?? "(no name)"})`);
      }
      console.log("");
      console.log("Pass --commit to write these rows.");
      return;
    }

    // ── Step 4: Insert rows (one at a time for auditability) ──────────────
    console.log(`Inserting ${toInsert.length} organization_member row(s)...`);
    let inserted = 0;
    for (const m of toInsert) {
      await client.query(
        `INSERT INTO "organization_member" ("organization_id", "member_id", "role_in_organization", "created_at")
         VALUES ($1, $2, NULL, now())`,
        [org.id, m.id]
      );
      inserted++;
      console.log(`  Inserted: member="${m.id}" (${m.displayName ?? "(no name)"})`);
    }

    console.log("");
    console.log(`Done. ${inserted} row(s) inserted.`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});