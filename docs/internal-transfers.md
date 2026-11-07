# Internal (member-to-member) transfers and carry

Members can transfer shares of a portfolio company to each other. Two kinds exist:

- **Replacement** (the common case): a plain change of owner for all or part of a holding. No price, no carry, no costs. The buyer inherits the seller's cost basis. `buyers` maps member ID to **shares** received.
- **Sale** (rare): buyers pay the round price, sellers are paid a lower transfer price, and the spread funds carry and legal costs. `buyers` maps member ID to **dollars** paid.

The same carry also applies to a full exit (see below).

## Rules

- **Fund-level MOIC and IRR ignore transfers.** Member-level views include them.
- **Carry is per seller, on gain at the round price, never on a loss, never netted** between sellers. Gain = `max(0, shares x (round price - cost basis per share))`.
- The **DD-lead carry (default 3%)** and **management carry (default 5%)** are fixed fund-wide percents. **Legal costs** vary per transaction: enter them, or leave blank and the system derives them as `spread - carry` and allocates them to sellers pro rata to gain.
- The seller realizes `amount - shares x cost basis`. The spread (`(round - transfer) x shares`) pays the fee lines.
- Every company needs a **DD lead** (a Sale or an exit with carry fails without one). There is one fund-wide **management-carry recipient**.
- Share counts are never derived from rounds. Holdings are **declared on the transfer** (see below).

Worked example (House of Biryan): 2024 round at $1,111.11/share ($5,000 for 4.5 shares), 2026 round at $2,300/share, sellers paid $2,100. Buyers pay $2,300; the $200/share spread funds 3% + 5% of each seller's gain plus legal costs (about 8.82% of gain in that case).

## One-time setup (admin)

1. **Settings > Transfer carry**: confirm the two percents and **choose the management-carry recipient**. Until a recipient is chosen, Sales cannot be recorded and exits are charged no carry.
2. Make sure each company has a **DD lead** (existing company admin action).

## Recording a transfer

Admin > Ledger > **Record a Transfer** (`/admin/ledger/transfer`).

1. Pick the company and date, and the kind.
2. Add sellers (shares moved) and buyers (shares for a Replacement, dollars for a Sale). "Move entire position" and "Assign remaining" shortcuts help.
3. **Holdings.** The form shows each seller's recorded holding. If none is recorded, enter the seller's **whole holding** (shares, and optionally total cost basis; cost basis defaults to the dollars the member invested in that company). Tick "Correct this holding" to replace a recorded one. After a new round, the next transfer re-declares holdings: the earlier declaration does not include later investments.
4. For a Sale also enter round price, transfer price, optional legal costs and the reference round.
5. The reconciliation panel runs the same calculator that records. **Record** is enabled only when it reports no errors. Read the warnings and the opening-holdings list before recording.

A transfer is written as three identical scenario rows (Optimistic, Balanced, Conservative). Share lots belong to the Balanced row. **A recorded transfer cannot be edited**: delete its three rows in Manage Ledger and record it again. A delete that would leave anyone with negative holdings is refused.

Transfers can also arrive through mass import and through AI drafting from a transfer agreement (upload with document type "Transfer agreement"; admin-only because it names other members). The AI never invents holdings; drafted transfers are dry-run and problems appear as review warnings.

## Full exit

When an `Exit_Event` is written and a management-carry recipient is configured, carry is charged on each member's gain, where gain = `payout - position cost basis`, floored at 0. Fee lines are stored on the exit entry.

- `member_payouts` and ASV's total payout stay **gross**. Member views show the payout net of that member's carry.
- Opt out for a record with `"apply_carry": false`.
- No recipient configured: exits behave exactly as before. A missing DD lead is an error only when carry would be charged.
- Editing or re-importing an old exit after a recipient is configured will charge carry on it unless it carries `apply_carry: false`. The export does not preserve that flag.

## What members see

- **Dashboard (mine scope):** a buyer's invested amount grows by what they paid (Sale) or the basis they inherit (Replacement). A seller's proceeds are realized (Sale: the amount paid; Replacement: at cost, so MOIC is neutral). Until the next valuation record, a seller's latest recorded value moves to the buyers in proportion to shares moved / shares held before, split by shares received. Carry paid and carry earned appear as tiles when non-zero.
- **Full-ledger export:** includes the member's own transfer legs only, with no counterparties and no other members' amounts.
- **Not adjusted:** the Reports tab's invested-by-year charts still use the original rounds.

## Data model (migration 009)

`internal_transfer_detail` (kind, prices, totals), `transfer_party` (one row per seller or buyer: shares, cost basis, amount, gain, fees, `shares_held_before`), `fee_line` (carry and legal lines on transfers and exits), `share_lot` (append-only: `OPENING` declared holding, `TRANSFER_IN`, `TRANSFER_OUT`; a member with no lots has no recorded holding). Also `INTERNAL_TRANSFER` in `ledger_entry_type` and `TRANSFER_AGREEMENT` in `document_type`. The migration is additive and has no backfill.

Calculators are pure and import-free: `functions/src/lib/transferCalc.ts` (transfers, fee lines, exit carry), `positionCalc.ts` (positions, value move), and `lib/transferAdjust.ts` (member view). The member list query excludes `INTERNAL_TRANSFER` rows so members never see other members' transfers; member views read transfers through three admin-role-only connector queries.

## Deploying to production

Not yet done. In order:

1. Take a verified Cloud SQL backup.
2. Dry run: `node scripts/apply-internal-transfer-migration.cjs` and read the statements.
3. Apply: `node scripts/apply-internal-transfer-migration.cjs --apply --instance angelstar-investments:us-east1:asv-tracker-sql --database asvtrackerdb --production`.
4. `firebase deploy --only dataconnect --force` (the new enum values need acknowledgement).
5. `firebase deploy --only functions`, then hosting (functions before hosting).
6. Configure the settings above.

If an admin ever saved a custom document-analysis or portfolio-chat prompt in Settings, it overrides the built-in text; re-save or clear it to pick up the transfer guidance.

## Backfilling House of Biryan

There is no data script. The historical transfers are recorded by hand through the same form, so they go through the same validation:

1. Record each real transfer on its real date as a Replacement or a Sale, declaring each seller's holding on the first one.
2. For the 2026 buy-out: Sale, round price 2,300, transfer price 2,100, reference round the 2026 non-participating round, buyers' dollars per the agreement (new investors $36,225 = 15.75 shares). Leave legal costs blank to derive them, and compare the derived total profit ($18,725), DD carry, management carry and legal figure with the agreement before recording.
3. After recording, check Manage Ledger shows three "Member Transfer" rows and the seller and buyer dashboards.

## Tests

- `scripts/transfer-calc.test.cjs`, `exit-carry.test.cjs`, `internal-transfer-record.test.cjs`, `member-position.test.cjs`, `transfer-adjust.test.cjs`: pure unit tests.
- `functions/scripts/internal-transfer-dev-e2e.js`: runs everything in one rolled-back transaction against a `*_dev` database only (set `CLOUD_SQL_DATABASE=asvtrackerdb_dev` explicitly; `functions/.env.local` defaults to production). Build first with `npm run build` in `functions/`.

Not covered by automated tests: the admin form and dashboard in a browser, the callables with a real admin login, the connector changes against a deployed Data Connect service, and mass-import and export round trips of transfers.
