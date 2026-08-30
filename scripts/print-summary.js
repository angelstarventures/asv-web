// Prints a human-readable summary of the migrated dev-seed data.
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: "angelstar-investments:us-east1:asv-tracker-sql",
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });
  const client = new Client({ ...clientOpts, user: "adiljagmag@gmail.com", database: "asvtrackerdb" });
  await client.connect();

  console.log("=".repeat(70));
  console.log("MEMBERS");
  console.log("=".repeat(70));
  const members = await client.query(
    `SELECT id, display_name, role, status FROM member ORDER BY id`
  );
  for (const m of members.rows) {
    console.log(`  ${m.id}  ${m.display_name.padEnd(20)} ${m.role.padEnd(7)} ${m.status}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("COMPANIES");
  console.log("=".repeat(70));
  const companies = await client.query(
    `SELECT id, name, sector, current_health, current_trajectory, status FROM company ORDER BY name`
  );
  for (const c of companies.rows) {
    console.log(
      `  ${c.name.padEnd(22)} ${(c.sector ?? "-").padEnd(16)} health=${c.current_health ?? "-"} traj=${c.current_trajectory ?? "-"} status=${c.status}`
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("LEDGER ENTRIES (grouped by company)");
  console.log("=".repeat(70));
  const entries = await client.query(`
    SELECT le.event_date::text AS event_date, c.name AS company, le.scenario, le.type
    FROM ledger_entry le
    JOIN company c ON c.id = le.company_id
    ORDER BY c.name, le.event_date, le.scenario
  `);

  let lastCompany = null;
  for (const e of entries.rows) {
    if (e.company !== lastCompany) {
      console.log(`\n  ${e.company}`);
      lastCompany = e.company;
    }
    console.log(`    ${e.event_date}  ${e.scenario.padEnd(12)} ${e.type}`);
  }

  console.log("\n" + "=".repeat(70));
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM member) AS members,
      (SELECT COUNT(*) FROM company) AS companies,
      (SELECT COUNT(*) FROM ledger_entry) AS entries
  `);
  const c = counts.rows[0];
  console.log(`TOTALS: ${c.members} members, ${c.companies} companies, ${c.entries} ledger entries`);
  console.log("=".repeat(70));

  await client.end();
  connector.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
