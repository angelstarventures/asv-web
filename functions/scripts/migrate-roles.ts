// ─────────────────────────────────────────────────────────────────────────────
// migrate-roles.ts
//
// Migrates existing DB roles and Firebase Auth custom claims from the old 3-role
// system (ADMIN, MEMBER, SITE_ADMIN) to the new 5-role system
// (DEVELOPER, DEV_SITE_ADMIN, SITE_ADMIN, ADMIN, USER).
//
// Special override: adiljagmag@gmail.com → dev_site_admin (to cover all three hats).
//
// Usage:
//   npx ts-node functions/scripts/migrate-roles.ts              # dry-run (default)
//   npx ts-node functions/scripts/migrate-roles.ts --commit     # actually write changes
// ─────────────────────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import { query, withTransaction } from "../src/lib/dataconnect-admin";

initializeApp();

interface MemberRow {
  id: string;
  email: string;
  authUid: string | null;
  role: string;
}

const OVERRIDE_EMAIL = "adiljagmag@gmail.com";
const OVERRIDE_ROLE = "dev_site_admin";

// ── Colour helpers ──────────────────────────────────────────────────────────

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

// ── Entry point ─────────────────────────────────────────────────────────────

async function migrate() {
  const isCommit = process.argv.includes("--commit");

  if (!isCommit) {
    console.log(`${YELLOW}⚠ DRY-RUN mode — no changes will be written.${RESET}`);
    console.log(`  Pass ${CYAN}--commit${RESET} to actually execute the migration.\n`);
  } else {
    console.log(`${RED}⚠ COMMIT mode — changes WILL be written to the database and Firebase Auth.${RESET}\n`);
  }

  // 1. Read all members from the DB
  const members = await query<MemberRow>(
    `SELECT id, email, "auth_uid" AS "authUid", role FROM "member"`
  );
  console.log(`Found ${members.length} members.\n`);

  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const member of members) {
    let newRole: string;
    let isOverride = false;

    if (member.email.toLowerCase() === OVERRIDE_EMAIL) {
      newRole = OVERRIDE_ROLE;
      isOverride = true;
    } else {
      switch (member.role) {
        case "ADMIN":
          newRole = "admin";
          break;
        case "MEMBER":
          newRole = "user";
          break;
        case "SITE_ADMIN":
          newRole = "site_admin";
          break;
        default:
          if (["DEVELOPER", "DEV_SITE_ADMIN", "USER"].includes(member.role)) {
            console.log(`  ${YELLOW}[SKIP]${RESET} ${member.email} — already on new role "${member.role}"`);
            skipped++;
          } else {
            console.log(`  ${RED}[SKIP]${RESET} ${member.email} — unknown role "${member.role}"`);
            errors++;
          }
          continue;
      }
    }

    // Check if already mapped
    const currentRole = member.role.toLowerCase();
    if (currentRole === newRole.replace(/_/g, "") && !isOverride) {
      // Already matches (e.g. "admin" → "admin") — skip
      console.log(`  ${YELLOW}[SKIP]${RESET} ${member.email} — already "${newRole}"`);
      skipped++;
      continue;
    }

    const label = isOverride ? `${CYAN}[OVERRIDE]${RESET}` : `${GREEN}[MAP]${RESET}`;
    console.log(
      `  ${label} ${member.email.padEnd(30)} ${member.role.padEnd(12)} → ${newRole}` +
        (member.authUid ? "" : " (no auth account)")
    );

    if (!isCommit) {
      updated++; // count in dry-run
      continue;
    }

    try {
      // 2. Update the DB row
      await withTransaction(async (client) => {
        await client.query(`UPDATE "member" SET role = $1 WHERE id = $2`, [
          newRole.toUpperCase(),
          member.id,
        ]);
      });

      // 3. Update Firebase Auth custom claims (if provisioned)
      if (member.authUid) {
        const user = await getAuth().getUser(member.authUid);
        const existingClaims = (user.customClaims ?? {}) as Record<string, unknown>;

        const newClaims: Record<string, unknown> = {
          ...existingClaims,
          role: newRole,
        };

        if (newRole === "dev_site_admin") {
          newClaims.devSiteAdminMode = true;
          newClaims.siteAdminMode = true;
        }

        await getAuth().setCustomUserClaims(member.authUid, newClaims);
        await getAuth().revokeRefreshTokens(member.authUid);
      }

      updated++;
    } catch (err) {
      console.error(`  ${RED}[ERR]${RESET} ${member.email}:`, err);
      errors++;
    }
  }

  const mode = isCommit ? "COMMIT" : "DRY-RUN";
  console.log(
    `\n${mode} complete. ${updated} would-be-updated` +
      (isCommit ? "" : " (dry)") +
      `, ${errors} errors, ${skipped} skipped.`
  );
  process.exit(errors > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});