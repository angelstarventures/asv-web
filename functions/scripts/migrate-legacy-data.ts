#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { withTransaction, query } from "../src/lib/dataconnect-admin";
import { validateLedgerRecord } from "../src/lib/schema-validate";
import { applyLedgerRecord } from "../src/lib/applyLedgerRecord";
import { diffRecords } from "../src/lib/importDiff";
import type { ScenarioEnum } from "../src/lib/enumMap";

// One tool, two runs — dev-seed now, production cutover later — same validation/build logic
// as the live write paths (shared via lib/ledgerWriteBuilders.ts / applyLedgerRecord.ts) so
// migrated rows are structurally identical to admin-UI-entered ones (plan §5).
//
// Usage:
//   node lib/scripts/migrate-legacy-data.js \
//     --members <path> \
//     --ledger-optimistic <path> --ledger-balanced <path> --ledger-conservative <path> \
//     [--company-aliases <path>] [--member-aliases <path>] \
//     [--dry-run (default true) | --commit]

const SYSTEM_MIGRATION_MEMBER_ID = "00000";
const SYSTEM_MIGRATION_MEMBER_NAME = "System Migration";

interface CliArgs {
  members: string;
  ledgerOptimistic: string;
  ledgerBalanced: string;
  ledgerConservative: string;
  companyAliases?: string;
  memberAliases?: string;
  commit: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };

  const members = get("--members");
  const ledgerOptimistic = get("--ledger-optimistic");
  const ledgerBalanced = get("--ledger-balanced");
  const ledgerConservative = get("--ledger-conservative");

  if (!members || !ledgerOptimistic || !ledgerBalanced || !ledgerConservative) {
    throw new Error(
      "Usage: migrate-legacy-data --members <path> --ledger-optimistic <path> --ledger-balanced <path> --ledger-conservative <path> [--company-aliases <path>] [--member-aliases <path>] [--dry-run|--commit]"
    );
  }

  // Production cutover run (plan §5): all three ledger flags point at the same merged file,
  // which has no `scenario` field. This is intentional, not a mistake — the script warns
  // rather than guessing, and needsReview=true is applied to divergence-prone types below.
  if (ledgerOptimistic === ledgerBalanced && ledgerBalanced === ledgerConservative) {
    console.warn(
      "WARNING: all three --ledger-* flags point to the same file. Valuation/health entries " +
        "will be seeded identically across scenarios (this contradicts the fact that they CAN " +
        "diverge). Every such row will be flagged needsReview=true for an admin to " +
        "differentiate by hand post-migration. Investment-round entries are unaffected — " +
        "they're supposed to be identical across scenarios anyway."
    );
  }

  return {
    members,
    ledgerOptimistic,
    ledgerBalanced,
    ledgerConservative,
    companyAliases: get("--company-aliases"),
    memberAliases: get("--member-aliases"),
    commit: argv.includes("--commit"),
  };
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// Types whose divergence across scenarios is expected and meaningful; when all three source
// files are literally the same file (production run), these get needsReview=true.
const DIVERGENCE_PRONE_TYPES = new Set([
  "Transaction_ValuationChange",
  "Internal_ValuationAssessment",
  "CompanyUpdate",
  "Compliance_FlagChange",
]);

const NON_DIVERGING_TYPES = new Set([
  "Participating_PricedRound",
  "Participating_SAFERound",
  "NonParticipating_Round",
  "Exit_Event",
]);

async function upsertMembers(memberList: Record<string, string>, memberAliases: Record<string, string>): Promise<void> {
  await withTransaction(async (client) => {
    // Synthetic member so the audit trail correctly shows these rows weren't hand-entered.
    await client.query(
      `INSERT INTO "member" (id, "display_name", email, role, status)
       VALUES ($1, $2, 'system-migration@asv.internal', 'ADMIN', 'ACTIVE')
       ON CONFLICT (id) DO NOTHING`,
      [SYSTEM_MIGRATION_MEMBER_ID, SYSTEM_MIGRATION_MEMBER_NAME]
    );

    for (const [id, rawName] of Object.entries(memberList)) {
      const name = memberAliases[rawName] ?? rawName;
      const email = `member-${id}@placeholder.asv.internal`; // real email set later via provisionMember
      await client.query(
        `INSERT INTO "member" (id, "display_name", email, role, status)
         VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE')
         ON CONFLICT (id) DO UPDATE SET "display_name" = $2`,
        [id, name, email]
      );
    }
  });
}

interface ScenarioFile {
  scenario: ScenarioEnum;
  path: string;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  initializeApp(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? { credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) }
      : {}
  );

  const memberList = loadJson<Record<string, string>>(args.members);
  const companyAliases = args.companyAliases ? loadJson<Record<string, string>>(args.companyAliases) : {};
  const memberAliases = args.memberAliases ? loadJson<Record<string, string>>(args.memberAliases) : {};

  const scenarioFiles: ScenarioFile[] = [
    { scenario: "OPTIMISTIC", path: args.ledgerOptimistic },
    { scenario: "BALANCED", path: args.ledgerBalanced },
    { scenario: "CONSERVATIVE", path: args.ledgerConservative },
  ];
  const isSingleFileRun = args.ledgerOptimistic === args.ledgerBalanced && args.ledgerBalanced === args.ledgerConservative;

  console.log(`Loading and validating ledger records (dry-run=${!args.commit})...`);

  const allErrors: string[] = [];
  const perScenarioRecords: { scenario: ScenarioEnum; records: Record<string, unknown>[] }[] = [];

  for (const { scenario, path } of scenarioFiles) {
    const records = loadJson<Record<string, unknown>[]>(path);
    for (const record of records) {
      const result = validateLedgerRecord(record);
      if (!result.valid) {
        allErrors.push(`[${scenario}] ${record.company} / ${record.date}: ${result.errors.join("; ")}`);
      }
    }
    perScenarioRecords.push({ scenario, records });
  }

  // Investment-round entries must agree across all three (in this run, possibly identical)
  // source files — the script defensively errors out if they don't (plan §5).
  if (isSingleFileRun === false) {
    checkInvestmentRoundAgreement(perScenarioRecords, allErrors);
  }

  if (allErrors.length > 0) {
    console.error(`\n${allErrors.length} validation error(s) found:`);
    for (const err of allErrors) console.error(` - ${err}`);
    if (!args.commit) {
      console.error("\nDry run: fix the above before passing --commit.");
      process.exitCode = 1;
      return;
    }
    throw new Error("Refusing to commit with validation errors present.");
  }

  console.log("All records passed validation.");

  if (!args.commit) {
    console.log("Dry run complete — no data written. Pass --commit to write.");
    logNearDuplicateReport(perScenarioRecords, companyAliases);
    return;
  }

  console.log("Upserting members...");
  await upsertMembers(memberList, memberAliases);

  console.log("Inserting ledger records (idempotent via content-hash duplicate detection)...");
  let inserted = 0;
  let skipped = 0;
  const touchedCompanies = new Set<string>();

  for (const { scenario, records } of perScenarioRecords) {
    const diff = await diffRecords(records, scenario.toLowerCase());
    await withTransaction(async (client) => {
      for (const { record, classification } of diff) {
        if (classification === "UNCHANGED") {
          skipped++;
          continue;
        }
        const needsReview = isSingleFileRun && DIVERGENCE_PRONE_TYPES.has(String(record.type));
        await applyLedgerRecord(client, record, {
          scenario,
          createdBy: SYSTEM_MIGRATION_MEMBER_ID,
          needsReview,
          companyAliasMap: companyAliases,
        });
        touchedCompanies.add(String(record.company));
        inserted++;
      }
    });
  }

  console.log(`Migration complete. Inserted ${inserted} record(s), skipped ${skipped} already-migrated record(s).`);
  console.log(`Companies touched: ${Array.from(touchedCompanies).join(", ")}`);
}

function checkInvestmentRoundAgreement(
  perScenarioRecords: { scenario: ScenarioEnum; records: Record<string, unknown>[] }[],
  allErrors: string[]
): void {
  const byNaturalKey = new Map<string, Record<string, unknown>[]>();
  for (const { records } of perScenarioRecords) {
    for (const record of records) {
      if (!NON_DIVERGING_TYPES.has(String(record.type))) continue;
      const key = `${record.date}::${record.company}::${record.type}`;
      if (!byNaturalKey.has(key)) byNaturalKey.set(key, []);
      byNaturalKey.get(key)!.push(record);
    }
  }
  for (const [key, records] of byNaturalKey) {
    if (records.length < 2) continue;
    const first = JSON.stringify(records[0]);
    const allMatch = records.every((r) => JSON.stringify(r) === first);
    if (!allMatch) {
      allErrors.push(`Investment-round entry "${key}" disagrees across scenario source files (terms must be identical).`);
    }
  }
}

function logNearDuplicateReport(
  perScenarioRecords: { scenario: ScenarioEnum; records: Record<string, unknown>[] }[],
  companyAliases: Record<string, string>
): void {
  const names = new Set<string>();
  for (const { records } of perScenarioRecords) {
    for (const record of records) names.add(String(record.company));
  }
  const sorted = Array.from(names).sort();
  console.log("\nCompany names seen (review for near-duplicates before --commit):");
  for (const name of sorted) {
    const alias = companyAliases[name];
    console.log(alias ? ` - ${name}  ->  ${alias}` : ` - ${name}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
