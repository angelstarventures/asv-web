/* eslint-disable @typescript-eslint/no-require-imports -- Standalone dev-database test runner. */
// End-to-end check of the internal-transfer write path against a REAL Postgres, never production.
//
//   cd functions && npm run build
//   $env:CLOUD_SQL_DATABASE = "asvtrackerdb_dev"
//   node scripts/internal-transfer-dev-e2e.js
//
// Safety: refuses to run unless the database name ends in "_dev" (or the instance name ends in
// "-dev"). Everything the test writes happens inside ONE transaction that is rolled back at the
// end, so the dev database is left exactly as it was (a failure also rolls back). Connection
// settings come from functions/.env.local (same as the emulator), with CLOUD_SQL_DATABASE
// taken from the environment so it can never silently fall back to production.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

// --- env + guard (must happen before requiring anything that reads process.env at load) -------
// .env.local wins over .env (same precedence as the Functions emulator); real env vars win over both.
for (const name of [".env.local", ".env"]) {
  const envFile = path.resolve(__dirname, "..", name);
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
process.env.CLOUD_SQL_AUTH_MODE = process.env.CLOUD_SQL_AUTH_MODE || "local";
const database = process.env.CLOUD_SQL_DATABASE;
const instance = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME || "";
if (!(database && database.endsWith("_dev")) && !instance.endsWith("-dev")) {
  console.error(
    `Refusing to run: CLOUD_SQL_DATABASE=${database ?? "(unset)"} on ${instance || "(unset)"} is not a dev target. ` +
      `Set CLOUD_SQL_DATABASE to a database ending in _dev.`
  );
  process.exit(2);
}

const { withTransaction } = require("../lib/src/lib/dataconnect-admin");
const { applyLedgerRecord } = require("../lib/src/lib/applyLedgerRecord");
const { deleteLedgerEntry } = require("../lib/src/lib/deleteLedgerRecord");
const { previewInternalTransfer, clientRunner, findNegativeHoldings } = require("../lib/src/lib/transferWrites");
const { TRANSFER_SETTING_KEYS } = require("../lib/src/lib/transferCalc");
const { loadMemberPositions, memberValuesAfterTransfers } = require("../lib/src/lib/memberPositions");

class Rollback extends Error {}
const near = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;
let step = 0;
const ok = (msg) => console.log(`  ok ${++step}. ${msg}`);

async function expectFailure(client, label, pattern, fn) {
  await client.query("SAVEPOINT expect_fail");
  let message = null;
  try {
    await fn();
  } catch (e) {
    message = e.message;
  }
  await client.query("ROLLBACK TO SAVEPOINT expect_fail");
  await client.query("RELEASE SAVEPOINT expect_fail");
  assert(message !== null, `${label}: expected a failure but it succeeded`);
  assert(pattern.test(message), `${label}: unexpected error "${message}"`);
  ok(`${label} -> rejected (${message.slice(0, 70)}...)`);
}

async function lotsByMember(client, companyId) {
  const { rows } = await client.query(
    `SELECT "member_id" AS m, SUM(shares)::float8 AS shares, SUM("cost_basis")::float8 AS basis
     FROM "share_lot" WHERE "company_id" = $1 GROUP BY "member_id"`,
    [companyId]
  );
  return Object.fromEntries(rows.map((r) => [r.m, { shares: r.shares, basis: r.basis }]));
}

async function main() {
  console.log(`Target: ${instance} / ${database}`);
  await withTransaction(async (client) => {
    const db = await client.query("SELECT current_database() AS db");
    assert.equal(db.rows[0].db, database, "connected to a different database than requested");
    const tables = await client.query(
      `SELECT to_regclass('public.share_lot') AS lot, to_regclass('public.transfer_party') AS party`
    );
    assert(tables.rows[0].lot && tables.rows[0].party, "Migration 009 is not applied to this database.");
    assert.equal(
      (await client.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'share_lot' AND column_name IN ('kind', 'shares')`)).rows[0].n,
      2,
      "share_lot has the wrong shape - run scripts/reset-internal-transfer-dev.cjs and re-apply the migration"
    );
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM "share_lot"`)).rows[0].n, 0, "dev share_lot should start empty (no backfill)");
    ok("migration 009 present in its current shape; no backfilled lots");

    // --- Fixtures (all rolled back) ---------------------------------------------------------
    const members = (await client.query(`SELECT id FROM "member" ORDER BY id LIMIT 7`)).rows.map((r) => r.id);
    assert(members.length === 7, "need at least 7 members in the dev database");
    const [ddLead, mgmt, sellerA, sellerB, buyerA, buyerB, newOwner] = members;
    const COMPANY = "ZZ Transfer Test Co";
    const base = { company: COMPANY, company_url: "https://example.com", sector: "Test", date: "2025-01-15" };
    const SCENARIOS = ["BALANCED", "OPTIMISTIC", "CONSERVATIVE"];

    const roundRecord = {
      ...base, type: "Participating_PricedRound", doc_link: "https://example.com/round", round_name: "Series A",
      asv_total: 8000, price_per_share: 0, post_money_valuation: 10000000, // price 0 on purpose: shares are never derived
      allocations: { [sellerA]: 5000, [sellerB]: 3000 },
    };
    for (const scenario of SCENARIOS) await applyLedgerRecord(client, roundRecord, { scenario, createdBy: ddLead });
    const companyId = (await client.query(`SELECT id FROM "company" WHERE name = $1`, [COMPANY])).rows[0].id;
    await client.query(`UPDATE "company" SET "dd_lead_id" = $2 WHERE id = $1`, [companyId, ddLead]);
    assert.deepEqual(await lotsByMember(client, companyId), {});
    ok("recording rounds (even a price-0 one) writes no share lots");

    const upsert = (key, value) =>
      client.query(
        `INSERT INTO "app_setting" (key, value, "updated_at", "updated_by_id") VALUES ($1, $2, now(), $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value, ddLead]
      );
    const holdingsBefore = { [sellerA]: { shares: 5 }, [sellerB]: { shares: 3 } }; // cost basis defaults to invested dollars
    const sale = {
      ...base, type: "Internal_Transfer", date: "2026-03-01", reference_round_name: "2026 round",
      round_price_per_share: 2000, transfer_price_per_share: 1800,
      sellers: { [sellerA]: 5, [sellerB]: 3 }, buyers: { [buyerA]: 10000, [buyerB]: 6000 },
      holdings_before: holdingsBefore,
    };
    const run = clientRunner(client);

    // --- B. Settings gate -------------------------------------------------------------------
    await client.query(`DELETE FROM "app_setting" WHERE key = $1`, [TRANSFER_SETTING_KEYS.managementCarryMemberId]);
    let preview = await previewInternalTransfer(run, sale);
    assert(preview.errors.some((e) => /management-carry/.test(e)), "expected missing-recipient error");
    ok("no management-carry recipient configured -> sale preview blocked");
    await upsert(TRANSFER_SETTING_KEYS.managementCarryMemberId, mgmt);
    await upsert(TRANSFER_SETTING_KEYS.ddLeadCarryPercent, "3");
    await upsert(TRANSFER_SETTING_KEYS.managementCarryPercent, "5");

    // --- C. Preview math, declared holdings, oversell ---------------------------------------
    preview = await previewInternalTransfer(run, sale);
    assert.deepEqual(preview.errors, [], preview.errors.join("; "));
    assert(near(preview.grossGain, 8000) && near(preview.totalFees, 1600) && near(preview.legalCosts, 960));
    assert.equal(preview.openingAdjustments.length, 2);
    assert(near(preview.openingAdjustments.find((o) => o.memberId === sellerA).costBasis, 5000), "basis should default to invested dollars");
    ok("sale preview with declared holdings: gain 8,000, DD 240 + mgmt 400 + derived legal 960; basis defaults to invested $");
    const noDecl = await previewInternalTransfer(run, { ...sale, holdings_before: undefined });
    assert(noDecl.errors.some((e) => /holds only 0/.test(e)));
    const oversell = await previewInternalTransfer(run, { ...sale, sellers: { [sellerA]: 6, [sellerB]: 3 } });
    assert(oversell.errors.some((e) => /holds only 5/.test(e)));
    ok("no declaration and no lots, or selling more than declared -> preview error");

    // --- D. Record the sale in three scenarios ----------------------------------------------
    const saleRecord = { ...sale, legal_costs: preview.legalCosts };
    const saleIds = {};
    for (const scenario of SCENARIOS) saleIds[scenario] = await applyLedgerRecord(client, saleRecord, { scenario, createdBy: ddLead });
    const count = async (table, id) => (await client.query(`SELECT count(*)::int AS n FROM "${table}" WHERE "ledger_entry_id" = $1`, [id])).rows[0].n;
    for (const id of Object.values(saleIds)) {
      assert.equal(await count("internal_transfer_detail", id), 1);
      assert.equal(await count("transfer_party", id), 4);
    }
    const feeTotals = async (id) =>
      Object.fromEntries((await client.query(`SELECT kind::text AS k, SUM(amount)::float8 AS a FROM "fee_line" WHERE "ledger_entry_id" = $1 GROUP BY kind`, [id])).rows.map((r) => [r.k, r.a]));
    const f = await feeTotals(saleIds.BALANCED);
    assert(near(f.DD_LEAD_CARRY, 240) && near(f.MANAGEMENT_CARRY, 400) && near(f.LEGAL_COSTS, 960), JSON.stringify(f));
    for (const sc of ["OPTIMISTIC", "CONSERVATIVE"]) assert.deepEqual(await feeTotals(saleIds[sc]), f);
    const held = (await client.query(`SELECT "shares_held_before"::float8 AS h FROM "transfer_party" WHERE "ledger_entry_id" = $1 AND "member_id" = $2 AND side = 'SELLER'`, [saleIds.BALANCED, sellerA])).rows[0].h;
    assert(near(held, 5, 1e-6));
    ok("sale: 3 rows each hold 1 detail + 4 parties; fee lines identical; seller held-before recorded");
    const lotKinds = await client.query(
      `SELECT kind::text AS k, count(*)::int AS n, bool_and("source_entry_id" = $2) AS own FROM "share_lot" WHERE "company_id" = $1 GROUP BY kind ORDER BY kind`,
      [companyId, saleIds.BALANCED]
    );
    assert.deepEqual(lotKinds.rows.map((r) => [r.k, r.n, r.own]), [["OPENING", 2, true], ["TRANSFER_IN", 2, true], ["TRANSFER_OUT", 2, true]]);
    let lots = await lotsByMember(client, companyId);
    assert(near(lots[sellerA].shares, 0, 1e-6) && near(lots[sellerB].shares, 0, 1e-6));
    assert(near(lots[buyerA].shares, 5, 1e-6) && near(lots[buyerB].shares, 3, 1e-6));
    assert(near(lots[buyerA].basis, 10000) && near(lots[buyerB].basis, 6000));
    assert.deepEqual(await findNegativeHoldings(client, companyId), []);
    ok("lots (BALANCED row only): opening x2, out x2, in x2; sellers 0 shares, buyers 5 + 3 at cost 10,000 + 6,000");
    assert.deepEqual((await previewInternalTransfer(run, saleRecord)).errors, []);
    ok("re-previewing a recorded transfer does not false-flag overselling");

    // --- E. Plain replacement: partial, buyer inherits basis, no fee lines ------------------
    const replacement = {
      ...base, type: "Internal_Transfer", transfer_kind: "Replacement", date: "2026-04-01",
      sellers: { [buyerA]: 2 }, buyers: { [newOwner]: 2 }, // no prices, no holdings_before: buyerA's lots are recorded
    };
    const replPreview = await previewInternalTransfer(run, replacement);
    assert.deepEqual(replPreview.errors, [], replPreview.errors.join("; "));
    assert(near(replPreview.buyers[0].costBasisPerShare, 2000));
    const replIds = {};
    for (const scenario of SCENARIOS) replIds[scenario] = await applyLedgerRecord(client, replacement, { scenario, createdBy: ddLead });
    for (const id of Object.values(replIds)) {
      assert.equal(await count("transfer_party", id), 2);
      assert.equal(await count("fee_line", id), 0);
      assert.equal((await client.query(`SELECT kind::text AS k FROM "internal_transfer_detail" WHERE "ledger_entry_id" = $1`, [id])).rows[0].k, "REPLACEMENT");
    }
    lots = await lotsByMember(client, companyId);
    assert(near(lots[buyerA].shares, 3, 1e-6) && near(lots[buyerA].basis, 6000));
    assert(near(lots[newOwner].shares, 2, 1e-6) && near(lots[newOwner].basis, 4000));
    ok("replacement: 2 of 5 shares move with proportional basis (4,000), no fee lines, same in all 3 scenarios");

    // --- E2. Member positions and value moved across transfers (Phase 3) --------------------
    const positions = Object.fromEntries((await loadMemberPositions(run, companyId)).map((p) => [p.memberId, p]));
    assert(near(positions[sellerA].basis, 0) && positions[sellerA].shares === 0, "sold-out seller");
    assert(near(positions[buyerA].basis, 6000) && near(positions[buyerA].shares, 3), "partial seller / buyer");
    assert(near(positions[newOwner].basis, 4000) && near(positions[newOwner].shares, 2), "replacement buyer");
    ok("member positions: sold-out seller 0, partial holder 3 sh / $6,000, replacement buyer 2 sh / $4,000");
    // A valuation dated BEFORE both transfers; its values must be carried across them.
    await applyLedgerRecord(client, {
      ...base, type: "Transaction_ValuationChange", date: "2026-02-01", driving_event_date: "2026-02-01",
      asv_total_fair_market_value: 16000, member_valuations: { [sellerA]: 10000, [sellerB]: 6000 },
    }, { scenario: "BALANCED", createdBy: ddLead });
    const moved = await memberValuesAfterTransfers(run, companyId, "BALANCED");
    assert.equal(moved.asOfDate, "2026-02-01");
    const v = moved.values;
    assert(near(v[sellerA], 0) && near(v[sellerB], 0), "sellers' value moved out");
    assert(near(v[buyerA], 6000) && near(v[buyerB], 6000) && near(v[newOwner], 4000), JSON.stringify(v));
    assert(near(Object.values(v).reduce((n, x) => n + x, 0), 16000), "value conserved");
    ok("recorded member value follows the shares across both transfers (16,000 conserved)");

    // --- E3. Carry on a full exit (Phase 7) -------------------------------------------------
    const exitRecord = {
      ...base, type: "Exit_Event", date: "2026-09-01", exit_type: "Acquisition", total_exit_value: 1000000, asv_total_payout: 18000,
      member_payouts: { [buyerA]: 9000, [buyerB]: 5000, [newOwner]: 4000 }, // gain 3000 / loss / break-even
    };
    const exitId = await applyLedgerRecord(client, exitRecord, { scenario: "BALANCED", createdBy: ddLead });
    const exitFees = (await client.query(`SELECT kind::text AS kind, "recipient_id" AS recipient, "charged_to_member_id" AS charged, amount FROM "fee_line" WHERE "ledger_entry_id" = $1 ORDER BY kind`, [exitId])).rows;
    assert.equal(exitFees.length, 2, JSON.stringify(exitFees));
    assert(exitFees.every((f) => f.charged === buyerA), "only the member with a gain is charged");
    assert(near(exitFees.find((f) => f.kind === "DD_LEAD_CARRY").amount, 90) && exitFees.find((f) => f.kind === "DD_LEAD_CARRY").recipient === ddLead);
    assert(near(exitFees.find((f) => f.kind === "MANAGEMENT_CARRY").amount, 150) && exitFees.find((f) => f.kind === "MANAGEMENT_CARRY").recipient === mgmt);
    assert.equal(
      Number((await client.query(`SELECT SUM(value) AS t FROM "member_valuation" WHERE "ledger_entry_id" = $1`, [exitId])).rows[0].t), 18000,
      "member payouts stay gross"
    );
    ok("full exit: carry 90 + 150 charged only to the member with a gain; payouts stay gross (18,000)");
    await deleteLedgerEntry(client, exitId);
    const optOut = await applyLedgerRecord(client, { ...exitRecord, date: "2026-09-02", apply_carry: false }, { scenario: "BALANCED", createdBy: ddLead });
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM "fee_line" WHERE "ledger_entry_id" = $1`, [optOut])).rows[0].n, 0);
    await deleteLedgerEntry(client, optOut);
    ok("apply_carry:false opts an exit out of carry");

    // --- F. Guards --------------------------------------------------------------------------
    await expectFailure(client, "repeating the sale (sellers now hold nothing)", /holds only/, () =>
      applyLedgerRecord(client, { ...saleRecord, date: "2026-05-01", holdings_before: undefined }, { scenario: "BALANCED", createdBy: ddLead })
    );
    await expectFailure(client, "deleting the sale the replacement relied on", /negative share holdings/, () =>
      deleteLedgerEntry(client, saleIds.BALANCED)
    );

    // --- G. Delete everything -> lots gone --------------------------------------------------
    for (const group of [replIds, saleIds]) {
      for (const sc of ["OPTIMISTIC", "CONSERVATIVE", "BALANCED"]) await deleteLedgerEntry(client, group[sc]);
    }
    assert.deepEqual(await lotsByMember(client, companyId), {});
    const allIds = [...Object.values(saleIds), ...Object.values(replIds)];
    for (const t of ["transfer_party", "fee_line", "internal_transfer_detail"]) {
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM "${t}" WHERE "ledger_entry_id" = ANY($1)`, [allIds])).rows[0].n, 0, `${t} rows left behind`);
    }
    ok("deleting the replacement then the sale removes all rows and lots");

    throw new Rollback(); // never commit: leave the dev database untouched
  }).catch((e) => {
    if (!(e instanceof Rollback)) throw e;
  });
  console.log(`\nAll ${step} checks passed. Transaction rolled back; dev database unchanged.`);
}

main()
  .catch((e) => {
    console.error("\nFAILED:", e.stack || e.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
