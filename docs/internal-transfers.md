# Internal (member-to-member) transfers and carry

Members can transfer shares of a portfolio company to each other. **Every transfer moves shares of exactly one round** (the source round). To move shares from several rounds, record one transfer per round. Two kinds exist:

- **Replacement** (the common case): a plain change of owner for all or part of a member's position in the round. No price, no carry, no costs. The buyer inherits the seller's cost basis.
- **Sale** (rare): buyers pay the round price, sellers are paid a lower transfer price, and the spread funds carry and legal costs. A Sale cannot come from a round with no price per share (for example a SAFE); record a Replacement instead.

The same carry also applies to a full exit (see below).

## How positions work (no share counts)

There are no declared holdings and no member share counts. A member's position is tracked **per round**:

- Their starting position is their allocation in that round: **shares = dollars / the round's price per share**, **basis = the dollars allocated**. A round with no price (a SAFE) uses 1, so its "shares" are just dollars.
- A transfer takes shares and basis out of each seller (at the seller's average cost in that round) and gives the buyer shares at what they paid (Sale) or at the basis they inherit (Replacement).
- A member's company-level cost basis is their allocations plus basis received minus basis moved out, across all rounds. Invested stays the original capital.

**The round price comes from the ledger.** The source round's price per share is read from the round's own record, and every share count is derived from it. If it is slightly off (for example 1,111.11 against an exact 5,000 / 4.5), correct the round in Manage Ledger **before** recording transfers of that round. Positions then follow the corrected price everywhere. A transfer already recorded keeps the share counts it was recorded with, so if transfers of that round already exist, delete and re-record them after the correction.

Amounts on a transfer are entered as **original cost**: the dollars at the source round's own price (shares x that price). A seller who put $5,000 into a round moves "$5,000" to move all of it, whatever the shares are worth now. The form's "Move entire position" button fills this in.

## Rules

- **Fund-level MOIC and IRR ignore transfers.** Member-level views include them.
- **Carry is per seller, on gain at the round price, never on a loss, never netted** between sellers. Gain = `max(0, shares x (round price - cost basis per share))`.
- The **DD-lead carry (default 3%)** and **management carry (default 5%)** are fixed fund-wide percents. **Legal costs** vary per transaction: enter them, or leave blank and the system derives them as `spread - carry` and allocates them to sellers pro rata to gain.
- The seller realizes `amount - shares x cost basis`. The spread (`(round - transfer) x shares`) pays the fee lines.
- Every company needs a **DD lead** (a Sale or an exit with carry fails without one). There is one fund-wide **management-carry recipient**.
- **Oversell guard:** a seller cannot move more than they hold of the source round (allocation, plus received in transfers of that round, minus moved out). A buyer can later sell what they received, as the same round.

Worked example (House of Biryan): 2024 round at $1,111.11/share ($5,000 for 4.5 shares), 2026 round at $2,300/share, sellers paid $2,100. Source round: the 2024 round. A seller moves $5,000 (all 4.5 shares); buyers pay $2,300/share in total; the $200/share spread funds 3% + 5% of each seller's gain plus legal costs (about 8.82% of gain in that case).

## One-time setup (admin)

1. **Settings > Transfer carry**: confirm the two percents and **choose the management-carry recipient**. Until a recipient is chosen, Sales cannot be recorded and exits are charged no carry.
2. Make sure each company has a **DD lead** (existing company admin action).

## Recording a transfer

Admin > Portfolio Management > **Record Transfer** (`/admin/transfers`).

1. Pick the company, the transfer date and the kind.
2. Pick the **source round**. Only rounds with member allocations are listed; a round with no price per share is marked, and a Sale is blocked for it.
3. Add sellers: pick the member and the **original cost** moving. The form shows what they hold of that round and their cost basis. Add buyers: original cost received (Replacement) or dollars paid (Sale). "Assign remaining" fills the balancing amount.
4. For a Sale also enter round price, transfer price, optional legal costs and a reference round label. For a Sale, buyers' total should equal `(original cost moved / source round price) x round price`; the form shows the target.
5. The reconciliation panel runs the same calculator that records. **Record** is enabled only when it reports no errors. Read the warnings first.

A transfer is written as three identical scenario rows (Optimistic, Balanced, Conservative). **A recorded transfer cannot be edited**: delete its three rows in Manage Ledger and record it again. A delete that would leave anyone having moved more of a round than they hold is refused.

Transfers can also arrive through mass import and through AI drafting from a transfer agreement (upload with document type "Transfer agreement"; admin-only because it names other members). The AI is given each member's recorded position per round, names the one source round, and states sellers' original cost; it never supplies share counts, basis or fees. Drafted transfers are dry-run and problems appear as review warnings.

## Full exit

Record an exit from Admin > Portfolio Management > **Record Exit** (`/admin/exits`): company, date, exit type, total exit value, ASV total payout and each member's gross payout (they must add up to the ASV total within $50; a split-by-cost-basis button gives a starting point). The live panel shows each member's gain, carry and net payout from the same server code that records. An exit can't be edited; delete its three rows in Manage Ledger and re-record it. Exits can still arrive through AI drafting or JSON.

When an `Exit_Event` is written and a management-carry recipient is configured, carry is charged on each member's gain, where gain = `payout - position cost basis` (their company cost basis after transfers), floored at 0. Fee lines are stored on the exit entry.

- `member_payouts` and ASV's total payout stay **gross**. Member views show the payout net of that member's carry.
- Opt out for a record with `"apply_carry": false`.
- No recipient configured: exits behave exactly as before. A missing DD lead is an error only when carry would be charged.
- Editing or re-importing an old exit after a recipient is configured will charge carry on it unless it carries `apply_carry: false`. The export does not preserve that flag.

## What members see

- **Dashboard (mine scope):** a buyer's invested amount grows by what they paid (Sale) or the basis they inherit (Replacement). A seller's proceeds are realized (Sale: the amount paid; Replacement: at cost, so MOIC is neutral). Until the next valuation record, **a seller's latest recorded value falls by the share of their company cost basis that moved** (moved basis / their basis before the transfer), and **a buyer's value is what the shares cost them** (paid, or inherited). Value is therefore not conserved across a transfer until the next valuation resets it. Carry paid and carry earned appear as tiles when non-zero.
- **Full-ledger export:** includes the member's own transfer legs only, with no counterparties and no other members' amounts. Amounts there are the member's own cost basis moved.
- **Not adjusted:** the Reports tab's invested-by-year charts still use the original rounds.

## Data model (migrations 009 and 010)

`internal_transfer_detail` (kind, prices, totals, **source round name and date**), `transfer_party` (one row per seller or buyer: shares, cost basis per share, amount, gain, fees, `shares_held_before` = the seller's shares in the source round, **`cost_basis_before`** = the seller's total company basis), `fee_line` (carry and legal lines on transfers and exits). Also `INTERNAL_TRANSFER` in `ledger_entry_type` and `TRANSFER_AGREEMENT` in `document_type`. The migrations are additive and have no backfill. `share_lot` (from migration 009) is legacy and no longer written or read; the round is identified by name and date, so it is the same in all three scenarios.

Positions are derived on demand (`loadRoundBook` in `functions/src/lib/memberPositions.ts`) from BALANCED round allocations plus BALANCED transfer parties. Calculators are pure and import-free: `functions/src/lib/transferCalc.ts` (transfers, fee lines, exit carry), `positionCalc.ts` (round book, value move), and `lib/transferAdjust.ts` (member view). The member list query excludes `INTERNAL_TRANSFER` rows so members never see other members' transfers; member views read transfers through three admin-role-only connector queries.

## Deploying to production

In order. Migration 009 is already applied to production; **migration 010 is not**.

1. Take a verified Cloud SQL backup.
2. Dry run: `node scripts/apply-internal-transfer-migration.cjs` and read the statements (it includes 009, which is skipped harmlessly when applied, and 010).
3. Apply: `node scripts/apply-internal-transfer-migration.cjs --apply --instance angelstar-investments:us-east1:asv-tracker-sql --database asvtrackerdb --production`. It adds three nullable columns.
4. Deploy Data Connect with the preserving wrapper. **Do not run a plain `firebase deploy --only dataconnect --force`.** This is a brownfield database: Data Connect offers to drop the hand-written CHECK constraints and partial indexes as "destructive", then refuses to run SQL on a protected database ("Brownfield database are protected"), failing before it changes anything. The wrapper temporarily normalizes only those reviewed differences, deploys, and restores every constraint, index, default and JSONB column even if the deploy fails (the same procedure as the real-estate release):

   ```powershell
   firebase dataconnect:sql:diff --json | Out-File -Encoding utf8 .firebase/internal-transfer-diff.json
   node scripts/deploy-dataconnect-preserving-sql.cjs --diff .firebase/internal-transfer-diff.json
   node scripts/deploy-dataconnect-preserving-sql.cjs --diff .firebase/internal-transfer-diff.json --apply --force
   ```

   The first wrapper command is a dry run; it refuses any statement outside CHECK/index/default/JSONB normalization. `--force` acknowledges the breaking-change notice. Always generate a fresh diff, because the wrapper's default diff file is the old real-estate one. If the process is interrupted, run it again with `--restore`. After migration 010 the diff should show no new columns to add.
5. `firebase deploy --only functions`, then hosting (functions before hosting). On this Windows workstation the Firebase framework adapter can package a stale `.next` directory without rebuilding, so run `npx.cmd next build --webpack` first, require exit code 0, then `firebase deploy --only hosting`. Symptom of a stale package: new pages or cards (Record a Transfer, the Transfer carry settings card) are missing after deploy. Hard-refresh the browser too. A bulk functions deploy can hit the per-minute mutation quota; redeploy only the functions that failed.
6. Configure the settings above.

If an admin ever saved a custom document-analysis or portfolio-chat prompt in Settings, it overrides the built-in text; re-save or clear it to pick up the transfer guidance.

## Backfilling House of Biryan

There is no data script. The historical transfers are recorded by hand through the same form, so they go through the same validation:

1. Record each real transfer on its real date as a Replacement or a Sale, naming the source round and moving original cost from that round only.
2. For the 2026 buy-out: Sale, source round the 2024 round, round price 2,300, transfer price 2,100, reference round the 2026 non-participating round, sellers' original cost per the agreement (shares x $1,111.11), buyers' dollars per the agreement (new investors $36,225 = 15.75 shares). Leave legal costs blank to derive them, and compare the derived total profit ($18,725), DD carry, management carry and legal figure with the agreement before recording.
3. After recording, check Manage Ledger shows three "Member Transfer" rows and the seller and buyer dashboards.

## Tests

- `scripts/transfer-calc.test.cjs`, `exit-carry.test.cjs`, `internal-transfer-record.test.cjs`, `member-position.test.cjs`, `transfer-adjust.test.cjs`: pure unit tests.
- `functions/scripts/internal-transfer-dev-e2e.js`: runs everything in one rolled-back transaction against a `*_dev` database only (set `CLOUD_SQL_DATABASE=asvtrackerdb_dev` explicitly; `functions/.env.local` defaults to production). Build first with `npm run build` in `functions/`. The dev database needs migrations 009 and 010 (`scripts/apply-internal-transfer-migration.cjs --apply --database asvtrackerdb_dev`).

Not covered by automated tests: the admin form and dashboard in a browser, the callables with a real admin login, the connector changes against a deployed Data Connect service, and mass-import and export round trips of transfers.
