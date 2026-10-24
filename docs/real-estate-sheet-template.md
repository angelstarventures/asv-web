# Real estate transaction sheets

The sync reads **only tab index 0**, using unformatted numeric values and serial dates.
Additional tabs are ignored. A preview never writes ledger rows. Confirm the column map,
resolve errors and acknowledge every data-quality finding before syncing.

| Date | Transaction Description | From/To | AED | USD | Investor display name | … | Txn ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | Shares==> | 4 | | | 1 | … | |
| | TOTAL==> | 0 | | | 0 | … | |
| 2026-01-15 | Deposit | From Investors to ASV | 3672.50 | 1000 | 1000 | … | 1 |

Use the native ISO currency code in place of `AED`. A USD property needs one USD column
and a default native-units-per-USD rate of 1. Investor columns contain **signed USD cash
movements**, not native currency. The shares row is optional; configure shares and their
effective date in the admin page when absent. Set an effective date preceding the first
payment that needs an inferred allocation.

`TOTAL==>` investor cells are closing hub cash balances. Column C is their checksum.
The shares row's column C is the total share units. Both checksums are validated.
Contributions may exceed the money-column obligation: this is prepaid cash, not an error.

`Txn ID` is a positive integer **constant**, unique within the workbook. Never use `ROW()`
or another formula and never renumber existing IDs. Append the next unused number even
when inserting a transaction in the middle. Legacy sheets without this column use physical
row numbers; do not insert/reorder rows in that mode. Add IDs **before the first import**.
Changing identity mode after import produces NEW and ORPHANED rows and needs manual review.
The live sheets' existing `Transaction ID` spelling is also recognized automatically.

Configuration keys:

```json
{
  "hubAliases": ["ASV"],
  "developerAliases": ["DAMAC"],
  "investorColumnMap": { "Investor display name": "00001" },
  "columnOverrides": { "Transaction Description": "Description" },
  "typeRules": [{ "contains": "special expense destination", "type": "ACQUISITION_COST" }]
}
```

Use `["QH", "Qaizar Hassonjee"]` for the Hills 2 hub. Exact normalized matches on display
name, investing entity and email produce **suggestions only**. Confirm all mappings explicitly.
New investor columns always require confirmation. Multiple columns cannot map to one member.

Mappings use the existing startup investment schema's `Member.id`: a zero-padded five-digit
string such as `00001`. Real estate shares, allocations, transfer parties and audit authors
all reference that same Member table. Members keep their existing accounts and identities;
the property ledger and share balances are separate records attached to those members.

Default classification: investor → hub is contribution; hub → investor is distribution;
any sender → developer is developer payment; hub → other destination is acquisition cost;
blank counterparty is a fee or fee refund according to sign. Unknown counterparties produce
a warning. Matching uses contained text, preserving the raw counterparty.

A direct investor → developer payment has `fundedOutsideHub=true`. Its allocated USD amount
increases deployed capital without affecting hub cash. Missing payment splits use share units
effective on the transaction date, with a warning and cent-preserving attribution.

Preview identifies NEW, UNCHANGED, CHANGED and ORPHANED rows. CHANGED appends a reversal
and replacement, retaining the original. ORPHANED is reported and never deleted.
Preview fingerprints bind the reviewed sheet, configuration and ledger state to sync;
changes require a fresh preview. Sync serializes writes by investment and records findings
and orphaned rows in the sync-run audit.

Missing dates inherit the preceding transaction date. Year corrections require that the
unchanged month/day fit between adjacent dates; ordinary out-of-order rows stay unchanged.
Amounts are never auto-corrected. Unknown amounts, identities, share checksums and cash
reconciliation mismatches block sync.

Exchange rates are stored as **native units per USD**, following the existing sheet's
native/USD ratio. To convert native to USD, divide by the rate. This naming convention
applies to `fxRateToUsd` and `defaultFxRateToUsd`; no live rates are fetched.

Sale and share-transfer detail amounts are consistently USD. Their ledger entries retain
the native amount and exchange rate, and the property retains its native gross sale price.
Manual money movements must be dated on or after the current share generation; share
generations and actual manual ledger movements cannot take effect in the future.

All member and investment summary amounts display in USD, including property cost,
commitment, deployed capital, cash, sale price and realized profit. Native contract values
use the investment's configured recorded rate; selling price uses the sale transaction
rate when available. Existing ledger USD amounts are used directly without a second
conversion. Schedule and ledger entry screens retain clearly labeled source-currency data.
