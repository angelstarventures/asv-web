// ─────────────────────────────────────────────────────────────────────────────
// migrate-schema.ts — direct SQL schema migration (run after migrate-roles.ts)
// Usage: npx ts-node scripts/migrate-schema.ts              # dry-run
//        npx ts-node scripts/migrate-schema.ts --commit     # execute
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp } from "firebase-admin/app";
import { withTransaction, query } from "../src/lib/dataconnect-admin";
initializeApp();

const YELLOW = "\x1b[33m", GREEN = "\x1b[32m", RED = "\x1b[31m", RESET = "\x1b[0m";

const SQL_STEPS: string[] = [
  // 1 — New enum types
  `CREATE TYPE "public"."company_feature_key" AS ENUM('DEALS','AI_DEAL_MATCHING','AI_CHAT','AI_DOCUMENT_ANALYSIS','MULTIPLE_LEDGERS','AI_MODEL_PROMPT_CONFIG','AI_MODEL_SELECTION','MEMBERSHIP_DUES','COSTS')`,
  `CREATE TYPE "public"."member_company_feature_key" AS ENUM('DEALS_SCREENING','DEAL_VIEW','COMPANY_MANAGEMENT','AI_DEAL_MATCHING','AI_CHAT','AI_DOCUMENT_ANALYSIS','MULTIPLE_LEDGERS','MEMBER_MANAGEMENT','MEMBER_PORTFOLIO_VIEW','AI_MODEL_PROMPT_CONFIG','AI_MODEL_SELECTION','MEMBERSHIP_DUES','COSTS')`,
  // 2 — Replace role enum (create new, migrate column, drop old, rename)
  `CREATE TYPE "public"."role_new" AS ENUM('DEVELOPER','DEV_SITE_ADMIN','SITE_ADMIN','ADMIN','USER')`,
  `ALTER TABLE "member" ALTER COLUMN "role" TYPE "public"."role_new" USING "role"::text::"public"."role_new"`,
  `DROP TYPE "public"."role"`,
  `ALTER TYPE "public"."role_new" RENAME TO "role"`,
  `ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'USER'::"public"."role"`,
];
// 3 — New tables & indexes (appended to SQL_STEPS)
// These ARE added to the array at runtime via the function below.
// Actually, let's define them in a second array for readability:

const TABLE_STEPS: string[] = [
  `CREATE TABLE "public"."company_member" ("id" uuid DEFAULT uuid_generate_v4() NOT NULL,"company_id" uuid NOT NULL,"member_id" varchar(5) NOT NULL,"role_in_company" text,"created_at" timestamptz DEFAULT now() NOT NULL,PRIMARY KEY("id"),FOREIGN KEY("company_id") REFERENCES "company"("id") ON DELETE CASCADE,FOREIGN KEY("member_id") REFERENCES "member"("id") ON DELETE CASCADE)`,
  `CREATE INDEX "company_member_company_id_idx" ON "public"."company_member"("company_id")`,
  `CREATE INDEX "company_member_member_id_idx" ON "public"."company_member"("member_id")`,
  `CREATE TABLE "public"."company_feature" ("id" uuid DEFAULT uuid_generate_v4() NOT NULL,"company_id" uuid NOT NULL,"feature_key" "public"."company_feature_key" NOT NULL,"enabled" boolean DEFAULT false NOT NULL,"updated_at" timestamptz DEFAULT now() NOT NULL,"updated_by_id" varchar(5) NOT NULL,PRIMARY KEY("id"),FOREIGN KEY("company_id") REFERENCES "company"("id") ON DELETE CASCADE,FOREIGN KEY("updated_by_id") REFERENCES "member"("id") ON DELETE CASCADE)`,
  `CREATE INDEX "company_feature_company_id_idx" ON "public"."company_feature"("company_id")`,
  `CREATE INDEX "company_feature_updated_by_id_idx" ON "public"."company_feature"("updated_by_id")`,
  `CREATE TABLE "public"."member_company_feature" ("id" uuid DEFAULT uuid_generate_v4() NOT NULL,"company_id" uuid NOT NULL,"member_id" varchar(5) NOT NULL,"feature_key" "public"."member_company_feature_key" NOT NULL,"enabled" boolean DEFAULT false NOT NULL,"updated_at" timestamptz DEFAULT now() NOT NULL,"updated_by_id" varchar(5) NOT NULL,PRIMARY KEY("id"),FOREIGN KEY("company_id") REFERENCES "company"("id") ON DELETE CASCADE,FOREIGN KEY("member_id") REFERENCES "member"("id") ON DELETE CASCADE,FOREIGN KEY("updated_by_id") REFERENCES "member"("id") ON DELETE CASCADE)`,
  `CREATE INDEX "member_company_feature_company_id_idx" ON "public"."member_company_feature"("company_id")`,
  `CREATE INDEX "member_company_feature_member_id_idx" ON "public"."member_company_feature"("member_id")`,
  `CREATE INDEX "member_company_feature_updated_by_id_idx" ON "public"."member_company_feature"("updated_by_id")`,
];
async function main() {
  const commit = process.argv.includes("--commit");
  console.log(commit ? `${RED}COMMIT mode${RESET}` : `${YELLOW}DRY-RUN${RESET}`);

  // Verify role data compatibility
  const roles = await query<{ role: string }>(`SELECT DISTINCT role FROM "member"`);
  const bad = roles.map(r => r.role).filter(v => !["DEVELOPER","DEV_SITE_ADMIN","SITE_ADMIN","ADMIN","USER"].includes(v));
  if (bad.length) { console.error(`${RED}✗ Incompatible roles:${RESET} ${bad.join(",")}\n  Run migrate-roles.ts --commit first`); process.exit(1); }
  console.log(`${GREEN}✓ Role data compatible${RESET}\n`);

  const allSteps = [...SQL_STEPS, ...TABLE_STEPS];
  let ok = 0, skip = 0, err = 0;
  for (const sql of allSteps) {
    const label = sql.substring(0, 110).replace(/\s+/g, " ");
    // Check if table/type already exists
    const tbl = sql.match(/CREATE TABLE "public"."(\w+)"/)?.[1];
    if (tbl) {
      const [{ exists }] = await query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`, [tbl]);
      if (exists) { console.log(`  ${YELLOW}[SKIP]${RESET} ${tbl} exists`); skip++; continue; }
    }
    const typ = sql.match(/CREATE TYPE "public"."(\w+)"/)?.[1];
    if (typ && typ !== "role_new") {
      const [{ exists }] = await query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname=$1)`, [typ]);
      if (exists) { console.log(`  ${YELLOW}[SKIP]${RESET} Type ${typ} exists`); skip++; continue; }
    }
    if (typ === "role_new") {
      const [{ exists }] = await query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='role_new')`);
      if (exists) { console.log(`  ${YELLOW}[SKIP]${RESET} role_new already exists`); skip++; continue; }
    }
    if (!commit) { console.log(`  ${YELLOW}[DRY]${RESET} ${label}`); ok++; continue; }
    try {
      await withTransaction(async (c) => { await c.query(sql); });
      console.log(`  ${GREEN}[OK]${RESET} ${label}`); ok++;
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("already exists")) { console.log(`  ${YELLOW}[SKIP]${RESET} ${m}`); skip++; }
      else { console.error(`  ${RED}[ERR]${RESET} ${label}\n    ${m}`); err++; }
    }
  }
  console.log(`\nDone. ${ok} executed${commit?"":" (dry)"}, ${skip} skipped, ${err} errors.`);
  process.exit(err ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
