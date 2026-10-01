// ─────────────────────────────────────────────────────────────────────────────
// sync-role-claims.ts
//
// The DB `role` column is already on the new 5-value scheme (migrated directly
// via SQL). Firebase Auth custom claims for already-provisioned members were
// never touched and still hold the OLD scheme's role string (e.g. "member"),
// which functions/src/lib/auth.ts's requireCaller now rejects as an unknown
// role — every existing member is currently locked out of every Cloud
// Function call until this runs. This replaces migrate-roles.ts, which (a)
// can't authenticate as the compute SA from a workstation and (b) skips the
// claims update entirely once the DB row already shows a new-scheme value,
// which is now true for every row.
//
// Syncs claims.role to the member's current DB role value, nothing else —
// mode toggles (siteAdminMode/devSiteAdminMode) stay self-service through the
// app's existing setSiteAdminMode/setDevSiteAdminMode callables.
//
// Usage:
//   npx ts-node scripts/sync-role-claims.ts --instance <project:region:instance> --database <db> --iam-user <email>              # dry-run (default)
//   npx ts-node scripts/sync-role-claims.ts --instance <project:region:instance> --database <db> --iam-user <email> --commit     # actually write changes
// ─────────────────────────────────────────────────────────────────────────────

const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";

interface MemberRow {
  id: string;
  email: string;
  authUid: string | null;
  role: string; // current DB value: DEVELOPER | DEV_SITE_ADMIN | SITE_ADMIN | ADMIN | USER
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  const instance = get("--instance");
  const database = get("--database");
  const iamUser = get("--iam-user");
  const isCommit = argv.includes("--commit");
  if (!instance || !database || !iamUser) {
    throw new Error("Usage: sync-role-claims --instance <project:region:instance> --database <db> --iam-user <email> [--commit]");
  }
  return { instance, database, iamUser, isCommit };
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

async function run() {
  const { instance, database, iamUser, isCommit } = parseArgs(process.argv.slice(2));

  if (!isCommit) {
    console.log(`${YELLOW}⚠ DRY-RUN mode — no changes will be written.${RESET}`);
    console.log(`  Pass ${CYAN}--commit${RESET} to actually execute the migration.\n`);
  } else {
    console.log(`${RED}⚠ COMMIT mode — changes WILL be written to Firebase Auth.${RESET}\n`);
  }

  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in — run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });
  
  const fbToolsAuthClient = new FBToolsAuthClient();
  
  initializeApp({
    projectId: "angelstar-investments",
    credential: {
  	getAccessToken: async () => {
  	  const { token } = await fbToolsAuthClient.getAccessToken();
  	  return { access_token: token as string, expires_in: 3600 };
  	},
    },
  });
  
  const connector = new Connector({ auth: fbToolsAuthClient });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: instance,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });
  const client = new Client({ ...clientOpts, user: iamUser, database });
  await client.connect();

  let members: MemberRow[];
  try {
    const { rows } = await client.query(`SELECT id, email, "auth_uid" AS "authUid", role FROM "member"`);
    members = rows;
  } finally {
    await client.end();
    connector.close();
  }
  console.log(`Found ${members.length} members.\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const member of members) {
    if (!member.authUid) {
      console.log(`  ${YELLOW}[SKIP]${RESET} ${member.email} — no auth account`);
      skipped++;
      continue;
    }

    const targetRole = member.role.toLowerCase();

    try {
      const user = await getAuth().getUser(member.authUid);
      const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;

      if (existingClaims.role === targetRole) {
        console.log(`  ${YELLOW}[SKIP]${RESET} ${member.email.padEnd(30)} already "${targetRole}"`);
        skipped++;
        continue;
      }

      console.log(
        `  ${GREEN}[SYNC]${RESET} ${member.email.padEnd(30)} ${String(existingClaims.role ?? "(none)").padEnd(12)} -> ${targetRole}`
      );

      if (!isCommit) {
        updated++;
        continue;
      }

      await getAuth().setCustomUserClaims(member.authUid, { ...existingClaims, role: targetRole });
      await getAuth().revokeRefreshTokens(member.authUid);
      updated++;
    } catch (err) {
      console.error(`  ${RED}[ERR]${RESET} ${member.email}:`, err);
      errors++;
    }
  }

  const mode = isCommit ? "COMMIT" : "DRY-RUN";
  console.log(`\n${mode} complete. ${updated} ${isCommit ? "updated" : "would-be-updated"}, ${errors} errors, ${skipped} skipped.`);
  process.exitCode = errors > 0 ? 1 : 0;
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
