# Real estate phase 1 release

The code includes the investment-property write paths and UI, plus the full phase-two
rental schema. Rental creation and ledger writes remain disabled until phase 2.

All summary monetary values now display in USD across the member tiles, investment tables
and admin investment list. Source-currency schedule/entry fields remain labeled for data
entry. Typography uses the shared Manrope body font and Playfair headings, matching the
existing Portfolio/Deals page sizes and weights.

The public view retains project/location/unit labels from the user's
`ASV Real estate investments.pdf` (pages 2–4). At the user's subsequent request, its covers
now use visually reviewed community imagery from the supplied project websites: the
Bora Bora and Maui page hero images from Islands Living, and the Hills 2 aerial image from
DAMAC's current community CDN. The original PDF images and previous references are retained
privately. The public view includes concise community descriptions, highlights, source
attribution and links to the supplied pages; no advertised prices or handover dates were
imported into the financial records. Images fill their frames using proportional cover
cropping. Arrows appear over the image on hover with 35% opaque backgrounds, and remain
accessible for keyboard focus and touch screens. Dots appear immediately below the image;
the numeric position counter was removed at the user's request.
It advances after seven seconds, resets the delay after manual navigation, places
previous/next arrows over the image, and retains clickable position dots below. There is
no Play/Pause control. Reduced-motion preferences disable automatic advancement.

MOIC is shown separately from percentage ROI/IRR. Cost valuation corresponds to about 1x
MOIC and 0% ROI/IRR before fees. No appreciation has been invented; the member page explains
when cost is used because no updated market valuation exists.

## Production rollout — 2026-10-24

The eleven new tables and deployed connector preserve the existing startup schema and
shared Member identities. The renewed OAuth token is in Secret Manager, Sheets API is
enabled, and dedicated investment Drive folders are configured.

| Investment | Imported transactions | Share units | Closing hub cash (USD) | Schedule rows |
| --- | ---: | ---: | ---: | ---: |
| Hills 2 / Violet 3 | 47 | 4 | 2,954.41 | 28 |
| Islands / Bora Bora | 48 | 8.5 | 2,806.00 | 41 |
| Islands 2 / Maui | 27 | 9 | 6,474.00 | 49 |

All 122 rows reconcile against actual unformatted member balances and preview UNCHANGED
after import. Constant Transaction IDs already existed, so source sheets were not edited.
Five spelling differences and equal Hills 2 shares were explicitly confirmed by the admin.
Member-scoped connector counts match only each member's own records (checked for 00021,
00013 and unrelated member 00002). The public query exposes no financial fields.

Private captures, manifests, backups and logs remain under Git-ignored `.firebase`.
A private logical SQL snapshot contains 37 pre-existing tables / 6,756 rows and a SHA-256
manifest. Cloud SQL's free-trial tier rejected managed backups. Existing startup table
counts and SQL protections were verified after migration and publication.

Hills 2 uses the supplied schedule image `1JSQ6hJSvGRrNUi8LTSHu8EQOMYDkkWP8`: 28 listed
amounts totaling AED 2,055,080. Preserve its AED 474,280 deposit (AED 40 above nominal 24%)
and leave unprovided dates blank. Planned schedule totals use listed amount due plus VAT;
future unbilled rows are not zero obligations. Its private schedule image is not a public
brochure. The supplied public-reference PDF provides the separate Hills 2 property picture.

Bora Bora's agreement confirms AED 3,609,000, 39 dated installments and 25% on completion;
I006/I012/I018/I024 are 5%, others 1%. Maui's agreement confirms AED 3,520,000, 47 dated
installments and 25% on completion; I006/I012/I018/I024 are 3%, others 1%. Both deposits
include 20% purchase price plus 4% registration. Expected completion months use month-end
dates (December 2028 and June 2030); completion-payment due dates remain unset.

The eight initial import findings were explicitly acknowledged. Later attachment of the
Hills schedule exposes the AED 1,055 difference on its first installment. Previews and the
admin table derive schedule review flags without changing historical money. Month/year
labels such as Aug-26 are not interpreted as ordinal installment I026.

Fractional cents from sheet formulas are preserved. Bora Bora's raw checksum is USD
2,806.00 although individually rounded member balances sum to USD 2,806.02. Compare closing
balances, not sums of rounded movements. No amount is corrected to remove display rounding.

The visual check caught a mislabeled source image: `damac islands.jpeg` was a payment
schedule. It was briefly selected for the public slide, then immediately unpublished and
replaced with a visually inspected marketing cover, subsequently superseded by the exact
picture from the user's public-reference PDF.
The private copy was renamed to identify it as a schedule. Showcase image URLs include the
current brochure file ID so replacements use a fresh cache key. Previously delivered client
caches cannot be revoked; the route's configured cache lifetime is 24 hours.

## Configuration and deployment

1. Set `REAL_ESTATE_DRIVE_ROOT_FOLDER_ID` in the Functions deployment environment to a Drive
   folder writable by the existing OAuth identity. Newly created investment folders grant
   the runtime service account viewer access for the brochure proxy.
2. Re-consent with `node scripts/get-drive-oauth-token.js`, which now requests
   `spreadsheets.readonly` together with existing Drive/Gmail scopes. Update
   `DRIVE_OAUTH_REFRESH_TOKEN` in Secret Manager. Never paste tokens into source control.
3. Validate and generate with `npx firebase dataconnect:sdk:generate`.
4. Back up the production database and review the generated SQL. This brownfield database
   requires the reviewed additive migration and preservation wrapper:

   ```powershell
   node scripts/apply-real-estate-migration.cjs
   node scripts/apply-real-estate-migration.cjs --apply
   node scripts/deploy-dataconnect-preserving-sql.cjs --apply
   npx.cmd firebase dataconnect:sdk:generate
   ```

   The additive helper uses pre/post `008_real_estate.sql` and matches existing Data Connect
   ownership/grants. Compatibility mode preserves extra columns, including password-reset
   fields. Data Connect still requires temporary CHECK/index/default/JSONB normalization;
   the wrapper saves exact definitions and restores them in a finally block even if deploy
   fails. This production-wide temporary normalization was explicitly approved. Recovery
   after process interruption: run the wrapper with `--restore` using its private manifest.
   Do not run a blanket destructive migration against this database.
5. Deploy Functions before Hosting. Set the REAL_ESTATE organization feature and
   REAL_ESTATE_VIEW / REAL_ESTATE_MANAGEMENT member features as appropriate. Existing rollout
   conventions default missing feature rows to enabled.
   Set `FUNCTIONS_DISCOVERY_TIMEOUT=60` on this workstation; the default 10 seconds is too
   short for the existing function bundle. Redeploy OAuth-bound functions after token renewal.

JSONB sheet configuration is read through the authenticated investment callable, not a
Data Connect String selection. Empty update fields perform an authorized configuration
read without changing data or recomputing rollups.

## Local checks

```powershell
node scripts/real-estate-sheet-parse.test.cjs
node scripts/real-estate-sync.test.cjs
node scripts/real-estate-live-check.cjs
node scripts/real-estate-summary.test.cjs
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd run build --prefix functions
```

The first two assertion scripts use synthetic examples. The live check uses private captures
and confirmed mappings from `.firebase`, never committed financial fixtures. Changed sources
pass lint. Full lint now excludes generated artifacts and completes, but reports existing
errors in unrelated hooks and legacy CommonJS scripts.

## Live acceptance gate

Use copies of the actual sheets. Add constant Txn IDs before the first import. Create the
properties through the admin form, using the source document URLs and verified property
amounts, unit identifiers, brochure and dates from the original documents. Import the
developer schedule from the PDF after converting it to the documented CSV headers.

`node scripts/real-estate-sheet-ids.cjs --spreadsheet <copy-id>` prints a dry run of the
first-tab ID backfill. It reads OAuth credentials from environment variables named
`DRIVE_OAUTH_CLIENT_ID`, `DRIVE_OAUTH_CLIENT_SECRET`, and `DRIVE_OAUTH_REFRESH_TOKEN`.
Review the proposed cells before running with `--apply`; existing IDs are preserved,
and formulas/duplicates are rejected before any write. Actual sheet edits are pending.

Start with DAMAC Hills 2 / Violet 3:

- Sheet `1x-YtCCDFDM3IJk-Uj2ybb-4gZwqSd3urr9Rb4LoxGyw`.
- Hub aliases QH and Qaizar Hassonjee. Four members; manually verified shares are required.
- The 305,200 AED / 83,200 USD direct payment must deploy 20,800 USD per equal shareholder
  and leave hub balances unchanged.
- Expected closing USD balances: 2,761.75 / 66.16 / 64.75 / 61.75; checksum 2,954.41.

Then DAMAC Islands / Bora Bora and DAMAC Islands 2 / Maui:

- Islands sheet `1Z02ICB2SOEGGrqN5q7kHEweJ4dVdY3EF-fyplntoSRE`, hub ASV,
  shares checksum 8.50, closing cash checksum 2,806.02 USD.
- Islands 2 sheet `1pFI4Ieb_c_lJyqac4QE0fAO_zbUKOYuPpbanfn2dtNE`, hub ASV,
  shares checksum 9.00, closing cash checksum 6,474.00 USD.

Resolve mappings, dates and findings, then sync. A second preview must be entirely UNCHANGED.
Editing one transaction must produce exactly one CHANGED row; syncing must append a reversal
and correction. Removing a row must report ORPHANED without deleting ledger history.

Sign in as participating members and check source links, ownership, commitments, deployed
capital, cash and USD summaries. Verify that a second member cannot request another member's
allocations through the connector. Signed out, inspect the public response for showcase
fields only. Unpublished investments must return 404 from the brochure route; published
images may remain in client caches for the specified 24-hour cache lifetime.

The admin member-portfolio review now renders startup and real-estate portfolios together.
Real-estate queries use the selected roster member's verified linked auth UID, including
when the startup scope is set to ASV; missing or unlinked selections never query member
real-estate data. Amounts reuse the member view's USD conversions and calculations.
`node scripts/admin-member-portfolio.test.cjs` verifies switching selected members,
organization-wide startup scope, and missing/invalid/unlinked selections. The deployed
connector check also passed for two participating members and one unrelated member.

The signed-in header now separates navigation into its own desktop row and moves Feedback
into the menu on phones, preventing overlap with the BETA badge. The public pitch page has
a prominent beta notice requesting a simultaneous application through ASV's verified Gust
profile. The pitch confirmation repeats the reminder. The destination can be overridden
with `NEXT_PUBLIC_TENANT_PITCH_APPLICATION_URL` for another tenant.

Top-level navigation places Real Estate immediately after Portfolio. Admin navigation is
grouped into Member Management (Members, Portfolios, Tax Documents), Portfolio Management
(Deals, Add Startup Investment, Add Startup Updates, Real Estate, Companies), and Site
Management (Ledger, Costs, plus root-only Features
and Settings). Group selection follows the current route, including nested pages and direct
links. Existing page URLs and feature/role visibility are preserved; empty groups are hidden.
Browser checks cover group switching, nested routes, disabled features, root-only links and
layout widths from 320px through desktop.

Admin navigation uses a connected file-tab shape: a wide, warm sand/orange rectangle behind
the sub-tabs joins a raised extension behind the selected management tab. The child row is
left-aligned at a fixed position, independent of the selected parent, and the lower panel
is at least as wide as all parent tabs. Other management tabs remain outside the warm shape
on white pills; inactive child tabs also use white backgrounds. Selected pills use dark
backgrounds with white text, and inactive labels use lighter gray text. Compact group labels
below the medium breakpoint keep all management tabs on one row, with full accessible names.
Browser geometry checks confirm the seamless join and fixed sub-tab positions for each
group at 320px, 390px, 768px and 1440px. Blue/group-specific accents and connector lines were
removed after user review.

Document uploads has been split into Add Startup Investment (`/admin/documents/investment`)
and Add Startup Updates (`/admin/documents/updates`) under Portfolio Management. The former
uses the existing new-company analysis path; the latter selects an existing startup. The
new-company checkbox was removed, while file/pasted-text analysis, draft review, regeneration,
validation, commit and Drive sync continue through the shared existing flow. The old
`/admin/documents` URL redirects to the existing-company updates page. Tax Documents now has
its own `/admin/tax-documents` page under Member Management, preserving the upload form and
member-grouped table. Member-facing document tabs are unchanged. Mocked browser checks
verified both analysis payloads and draft handoffs without live AI calls or writes.

Real-estate admin list, create and detail pages now use the other admin pages' layout
spacing and heading styles. Property names use semantic headings with the global heading
font; form controls, buttons, section borders and text sizes follow existing admin forms.
TypeScript and scoped ESLint checks pass. The public browser check verifies all three
supplied PDF pictures, matching public heading fonts, seven-second advancement, manual
arrows, bottom dots, mobile sizing and reduced-motion behavior.

Before Hosting deployment on this Windows workstation, explicitly run
`npx.cmd next build --webpack` and require exit code zero. The Firebase framework adapter
can package the existing `.next` directory without completing a fresh build. For this
release, the packaged admin portfolio server-page hash was verified against the successful
local build before deployment completed.

The production imports and member-scoping checks above have passed. Keep this acceptance
procedure for future changes and use copies for edit/reversal tests.
