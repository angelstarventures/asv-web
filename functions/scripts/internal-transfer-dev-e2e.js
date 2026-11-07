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
const { loadMemberPositions, loadRoundBook, memberValuesAfterTransfers } = require("../lib/src/lib/memberPositions");

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

async function main() {
  console.log(`Target: ${instance} / ${database}`);
  await withTransaction(async (client) => {
    const db = await client.query("SELECT current_database() AS db");
    assert.equal(db.rows[0].db, database, "connected to a different database than requested");
    const cols = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.columns
       WHERE (table_name = 'internal_transfer_detail' AND column_name IN ('source_round_name', 'source_round_date'))
          OR (table_name = 'transfer_party' AND column_name IN ('cost_basis_before', 'shares_held_before'))`
    );
    assert.equal(cols.rows[0].n, 4, "Migration 009 + 010 are not both applied to this database (run scripts/apply-internal-transfer-migration.cjs against it).");
    ok("migrations 009 and 010 present in their current shape");

    // --- Fixtures (all rolled back) ---------------------------------------------------------
    const members = (await client.query(`SELECT id FROM "member" ORDER BY id LIMIT 7`)).rows.map((r) => r.id);
    assert(members.length === 7, "need at least 7 members in the dev database");
    const [ddLead, mgmt, sellerA, sellerB, buyerA, buyerB, newOwner] = members;
    const COMPANY = "ZZ Transfer Test Co";
    const base = { company: COMPANY, company_url: "https://example.com", sector: "Test", date: "2025-01-15" };
    const SCENARIOS = ["BALANCED", "OPTIMISTIC", "CONSERVATIVE"];

    // Series A at 1,000/share: sellerA 5 shares, sellerB 3. Series B at 2,000/share: sellerA 2 more shares.
    const seriesA = {
      ...base, type: "Participating_PricedRound", doc_link: "https://example.com/round", round_name: "Series A",
      asv_total: 8000, price_per_share: 1000, post_money_valuation: 10000000,
      allocations: { [sellerA]: 5000, [sellerB]: 3000 },
    };
    const seriesB = {
      ...seriesA, date: "2025-06-01", round_name: "Series B", asv_total: 4000, price_per_share: 2000,
      allocations: { [sellerA]: 4000 },
    };
    for (const scenario of SCENARIOS) {
      await applyLedgerRecord(client, seriesA, { scenario, createdBy: ddLead });
      await applyLedgerRecord(client, seriesB, { scenario, createdBy: ddLead });
    }
    const companyId = (await client.query(`SELECT id FROM "company" WHERE name = $1`, [COMPANY])).rows[0].id;
    await client.query(`UPDATE "company" SET "dd_lead_id" = $2 WHERE id = $1`, [companyId, ddLead]);
    const run = clientRunner(client);
    const roundPos = async (roundName) => {
      const book = await loadRoundBook(run, companyId);
      return book.rounds.find((r) => r.name === roundName).positions;
    };
    let posA = await roundPos("Series A");
    assert(near(posA[sellerA].shares, 5) && near(posA[sellerA].basis, 5000) && near(posA[sellerB].shares, 3));
    assert(near((await roundPos("Series B"))[sellerA].shares, 2));
    ok("positions come from round allocations: Series A 5 + 3 shares, Series B 2 shares (dollars / the round's price)");

    const upsert = (key, value) =>
      client.query(
        `INSERT INTO "app_setting" (key, value, "updated_at", "updated_by_id") VALUES ($1, $2, now(), $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value, ddLead]
      );
    // Amounts are ORIGINAL COST (shares x the source round's price): sellerA moves all 5 Series A shares.
    const sale = {
      ...base, type: "Internal_Transfer", date: "2026-03-01", reference_round_name: "2026 round",
      source_round_name: "Series A", source_round_date: "2025-01-15",
      round_price_per_share: 2000, transfer_price_per_share: 1800,
      sellers: { [sellerA]: 5000, [sellerB]: 3000 }, buyers: { [buyerA]: 10000, [buyerB]: 6000 },
    };

    // --- B. Settings gate -------------------------------------------------------------------
    await client.query(`DELETE FROM "app_setting" WHERE key = $1`, [TRANSFER_SETTING_KEYS.managementCarryMemberId]);
    let preview = await previewInternalTransfer(run, sale);
    assert(preview.errors.some((e) => /management-carry/.test(e)), "expected missing-recipient error");
    ok("no management-carry recipient configured -> sale preview blocked");
    await upsert(TRANSFER_SETTING_KEYS.managementCarryMemberId, mgmt);
    await upsert(TRANSFER_SETTING_KEYS.ddLeadCarryPercent, "3");
    await upsert(TRANSFER_SETTING_KEYS.managementCarryPercent, "5");

    // --- C. Preview math and the oversell guard ---------------------------------------------
    preview = await previewInternalTransfer(run, sale);
    assert.deepEqual(preview.errors, [], preview.errors.join("; "));
    assert(near(preview.grossGain, 8000) && near(preview.totalFees, 1600) && near(preview.legalCosts, 960));
    const pa = preview.sellers.find((x) => x.memberId === sellerA);
    assert(near(pa.shares, 5) && near(pa.costBasisPerShare, 1000) && near(pa.costBasisBefore, 9000), JSON.stringify(pa));
    ok("sale preview: gain 8,000, DD 240 + mgmt 400 + derived legal 960; basis from the round; seller's company basis before 9,000");
    const oversell = await previewInternalTransfer(run, { ...sale, sellers: { [sellerA]: 5001, [sellerB]: 3000 }, buyers: { [buyerA]: 10002, [buyerB]: 6000 } });
    assert(oversell.errors.some((e) => /moving 5001 of "Series A" but has only 5000/.test(e)), oversell.errors.join("; "));
    const noRound = await previewInternalTransfer(run, { ...sale, source_round_name: "Series Z" });
    assert(noRound.errors.some((e) => /not a round of this company/.test(e)));
    const wrongRound = await previewInternalTransfer(run, { ...sale, source_round_name: "Series B", source_round_date: "2025-06-01" });
    assert(wrongRound.errors.some((e) => /has only 0 of it/.test(e)), "sellerB holds nothing of Series B");
    ok("selling more than held of the round, an unknown round, or a round the member is not in -> preview error");

    // --- D. Record the sale in three scenarios ----------------------------------------------
    const saleRecord = { ...sale, legal_costs: preview.legalCosts };
    const saleIds = {};
    for (const scenario of SCENARIOS) saleIds[scenario] = await applyLedgerRecord(client, saleRecord, { scenario, createdBy: ddLead });
    const count = async (table, id) => (await client.query(`SELECT count(*)::int AS n FROM "${table}" WHERE "ledger_entry_id" = $1`, [id])).rows[0].n;
    for (const id of Object.values(saleIds)) {
      assert.equal(await count("internal_transfer_detail", id), 1);
      assert.equal(await count("transfer_party", id), 4);
      const d = (await client.query(`SELECT "source_round_name" AS n, "source_round_date"::text AS d FROM "internal_transfer_detail" WHERE "ledger_entry_id" = $1`, [id])).rows[0];
      assert.deepEqual(d, { n: "Series A", d: "2025-01-15" });
    }
    const feeTotals = async (id) =>
      Object.fromEntries((await client.query(`SELECT kind::text AS k, SUM(amount)::float8 AS a FROM "fee_line" WHERE "ledger_entry_id" = $1 GROUP BY kind`, [id])).rows.map((r) => [r.k, r.a]));
    const f = await feeTotals(saleIds.BALANCED);
    assert(near(f.DD_LEAD_CARRY, 240) && near(f.MANAGEMENT_CARRY, 400) && near(f.LEGAL_COSTS, 960), JSON.stringify(f));
    for (const sc of ["OPTIMISTIC", "CONSERVATIVE"]) assert.deepEqual(await feeTotals(saleIds[sc]), f);
    const sellerRow = (await client.query(`SELECT "shares_held_before"::float8 AS h, "cost_basis_before"::float8 AS b FROM "transfer_party" WHERE "ledger_entry_id" = $1 AND "member_id" = $2 AND side = 'SELLER'`, [saleIds.OPTIMISTIC, sellerA])).rows[0];
    assert(near(sellerRow.h, 5, 1e-6) && near(sellerRow.b, 9000));
    ok("sale: 3 rows each hold 1 detail (with the source round) + 4 parties; fee lines identical; seller before-figures recorded");
    posA = await roundPos("Series A");
    assert.equal(posA[sellerA], undefined, "sellerA sold their whole Series A position");
    assert.equal(posA[sellerB], undefined);
    assert(near(posA[buyerA].shares, 5, 1e-6) && near(posA[buyerA].basis, 10000));
    assert(near(posA[buyerB].shares, 3, 1e-6) && near(posA[buyerB].basis, 6000));
    assert(near((await roundPos("Series B"))[sellerA].shares, 2), "the other round is untouched");
    assert.deepEqual(await findNegativeHoldings(client, companyId), []);
    ok("positions after the sale: Series A moved to buyers at what they paid (10,000 + 6,000); Series B untouched");
    assert.deepEqual((await previewInternalTransfer(run, saleRecord)).errors, []);
    ok("re-previewing a recorded transfer does not false-flag overselling");

    // --- E. Plain replacement: partial, buyer inherits basis, no fee lines ------------------
    const replacement = {
      ...base, type: "Internal_Transfer", transfer_kind: "Replacement", date: "2026-04-01",
      source_round_name: "Series A", source_round_date: "2025-01-15",
      sellers: { [buyerA]: 2000 }, buyers: { [newOwner]: 2000 }, // 2 of buyerA's 5 shares (original cost 2 x 1,000)
    };
    const replPreview = await previewInternalTransfer(run, replacement);
    assert.deepEqual(replPreview.errors, [], replPreview.errors.join("; "));
    assert(near(replPreview.buyers[0].costBasisPerShare, 2000), "the buyer inherits what buyerA paid (2,000/share), not the round's original price");
    const replIds = {};
    for (const scenario of SCENARIOS) replIds[scenario] = await applyLedgerRecord(client, replacement, { scenario, createdBy: ddLead });
    for (const id of Object.values(replIds)) {
      assert.equal(await count("transfer_party", id), 2);
      assert.equal(await count("fee_line", id), 0);
      assert.equal((await client.query(`SELECT kind::text AS k FROM "internal_transfer_detail" WHERE "ledger_entry_id" = $1`, [id])).rows[0].k, "REPLACEMENT");
    }
    posA = await roundPos("Series A");
    assert(near(posA[buyerA].shares, 3, 1e-6) && near(posA[buyerA].basis, 6000));
    assert(near(posA[newOwner].shares, 2, 1e-6) && near(posA[newOwner].basis, 4000));
    ok("replacement: 2 of 5 shares move with proportional basis (4,000), no fee lines, same in all 3 scenarios");

    // --- E2. Member positions and value moved across transfers ------------------------------
    const positions = Object.fromEntries((await loadMemberPositions(run, companyId)).map((p) => [p.memberId, p]));
    assert(near(positions[sellerA].basis, 4000) && near(positions[sellerA].invested, 9000), "sellerA keeps Series B");
    assert(near(positions[sellerB].basis, 0));
    assert(near(positions[buyerA].basis, 6000) && near(positions[buyerA].invested, 0));
    assert(near(positions[newOwner].basis, 4000) && near(positions[buyerB].basis, 6000));
    ok("company cost basis: sellerA 4,000 (Series B left), sellerB 0, buyerA 6,000, replacement buyer 4,000, buyerB 6,000");
    // A valuation dated BEFORE both transfers; its values are carried across them.
    await applyLedgerRecord(client, {
      ...base, type: "Transaction_ValuationChange", date: "2026-02-01", driving_event_date: "2026-02-01",
      asv_total_fair_market_value: 16000, member_valuations: { [sellerA]: 10000, [sellerB]: 6000 },
    }, { scenario: "BALANCED", createdBy: ddLead });
    const moved = await memberValuesAfterTransfers(run, companyId, "BALANCED");
    assert.equal(moved.asOfDate, "2026-02-01");
    const v = moved.values;
    assert(near(v[sellerA], 10000 * (1 - 5000 / 9000)), "sellerA falls by the share of basis that moved (5,000 of 9,000)");
    assert(near(v[sellerB], 0), "sellerB moved all their basis");
    assert(near(v[buyerB], 6000), "a buyer is valued at what they paid");
    assert(near(v[buyerA], 10000 * (1 - 4000 / 10000)), "buyerA paid 10,000, then moved 4,000 of basis out");
    assert(near(v[newOwner], 4000), "the replacement buyer is valued at the inherited basis");
    ok("recorded member value: sellers fall by basis moved, buyers are valued at cost");

    // --- E2b. A transfer of a different round (single-round rule) ----------------------------
    const roundB = {
      ...base, type: "Internal_Transfer", transfer_kind: "Replacement", date: "2026-06-01",
      source_round_name: "Series B", source_round_date: "2025-06-01",
      sellers: { [sellerA]: 4000 }, buyers: { [sellerB]: 4000 }, // all of sellerA's Series B (2 shares x 2,000)
    };
    const roundBPreview = await previewInternalTransfer(run, roundB);
    assert.deepEqual(roundBPreview.errors, [], JSON.stringify(roundBPreview.errors));
    assert(near(roundBPreview.buyers[0].costBasisPerShare, 2000));
    const roundBId = await applyLedgerRecord(client, roundB, { scenario: "BALANCED", createdBy: ddLead });
    assert.equal((await roundPos("Series B"))[sellerA], undefined);
    assert(near((await roundPos("Series B"))[sellerB].basis, 4000));
    assert(near((await roundPos("Series A"))[buyerA].shares, 3), "Series A is unaffected by a Series B transfer");
    await expectFailure(client, "moving more of Series B than sellerA still holds", /has only 0 of it/, () =>
      applyLedgerRecord(client, { ...roundB, date: "2026-06-02" }, { scenario: "BALANCED", createdBy: ddLead })
    );
    await deleteLedgerEntry(client, roundBId);
    ok("a Series B transfer moves only Series B; a repeat is rejected once the position is gone");

    // --- E3. Carry on a full exit -----------------------------------------------------------
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
    await expectFailure(client, "repeating the sale (sellers now hold nothing of Series A)", /has only 0 of it/, () =>
      applyLedgerRecord(client, { ...saleRecord, date: "2026-05-01" }, { scenario: "BALANCED", createdBy: ddLead })
    );
    await expectFailure(client, "deleting the sale the replacement relied on", /more shares of a round than they hold/, () =>
      deleteLedgerEntry(client, saleIds.BALANCED)
    );

    // --- G. Delete everything -> rows gone --------------------------------------------------
    for (const group of [replIds, saleIds]) {
      for (const sc of ["OPTIMISTIC", "CONSERVATIVE", "BALANCED"]) await deleteLedgerEntry(client, group[sc]);
    }
    const allIds = [...Object.values(saleIds), ...Object.values(replIds)];
    for (const t of ["transfer_party", "fee_line", "internal_transfer_detail"]) {
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM "${t}" WHERE "ledger_entry_id" = ANY($1)`, [allIds])).rows[0].n, 0, `${t} rows left behind`);
    }
    posA = await roundPos("Series A");
    assert(near(posA[sellerA].shares, 5) && near(posA[sellerB].shares, 3), "positions return to the round allocations");
    ok("deleting the replacement then the sale removes all rows; positions return to the allocations");

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
