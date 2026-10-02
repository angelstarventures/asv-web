# New-Tenant Bootstrap Runbook

Spin up a fresh deployment of this codebase for a new angel investment group. Each tenant
gets its **own Firebase project, Cloud SQL instance, Data Connect service, and Drive/Gmail
identity** — full data isolation. ASV (AngelStar Ventures) is the first and reference tenant;
this runbook describes what you'd do for tenant #2 onward.

> **⚠️ Before sharing this with anyone**, rotate/delete the plaintext secrets in
> `c:\Users\adilj\dev\website` — that sibling workspace (not code, not a git repo) contains
> `openrouter/*.txt` (live OpenRouter API keys) and `screenshots/` (a Google OAuth client-secret
> JSON file). Both must be rotated/deleted before handing this to someone outside the current team.

---

## Prerequisites

- Node 20+, `npm`
- `firebase-tools` CLI installed and logged in (`firebase login`)
- A Google Cloud / Firebase billing account with the necessary quotas (Cloud SQL, Data Connect,
  Cloud Functions, Hosting, etc.)
- Access to the Google Cloud Console for creating OAuth credentials

---

## Step-by-step
### 1. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
   Give it a short, kebab-case name (e.g. `my-angel-group`).
2. Note the **Project ID** (e.g. `my-angel-group`) — you'll use it everywhere.
3. Upgrade to the **Blaze** (pay-as-you-go) plan if not already set.

### 2. Create the Cloud SQL instance

1. In the Firebase Console, navigate to **Build > Data Connect** for the new project.
2. Follow the guided setup to create a Cloud SQL PostgreSQL instance.
   - Note the **instance ID** (e.g. `my-group-sql`) and **region** (e.g. `us-east1`).
   - The database name chosen during setup (e.g. `mygroupdb`).
3. Note your IAM user email (the one you're logged into Firebase CLI with).

### 3. Deploy the Data Connect schema (first-time, empty-schema)

The first deploy needs to create all the tables. Since this is a brownfield-friendly codebase
that also runs on an existing DB for ASV, the sequence is:

```bash
# 3a. Render the Data Connect config for this tenant
node scripts/render-dataconnect-config.js \
  --service-id my-tracker \
  --location us-east1 \
  --database mygroupdb \
  --instance-id my-group-sql

# 3b. Deploy the schema via Data Connect
firebase deploy --only dataconnect --force

# 3c. Apply post-migrations (CHECK constraints, jsonb conversions, indexes)
node scripts/apply-post-migrations.js \
  --instance "my-angel-group:us-east1:my-group-sql" \
  --database mygroupdb \
  --iam-user "your-email@gmail.com"

# 3d. Regenerate the committed client SDK
firebase dataconnect:sdk:generate
```

> **Important:** The first-time `firebase deploy --only dataconnect --force` will create every
> table defined in `dataconnect/schema/schema.gql`. This works because there's no existing
> schema to conflict with. For an already-seeded DB, use `dataconnect:sql:diff` instead and
> never pass `--force`.

### 4. Seed the Organization row

```bash
node functions/scripts/seed-organization.js \
  --instance "my-angel-group:us-east1:my-group-sql" \
  --database mygroupdb \
  --iam-user "your-email@gmail.com" \
  --name "My Angel Group" \
  --commit
```

### 5. Seed all Organization features (enabled=true)

```bash
node functions/scripts/seed-organization-features.js \
  --instance "my-angel-group:us-east1:my-group-sql" \
  --database mygroupdb \
  --iam-user "your-email@gmail.com" \
  --commit
```

### 6. Create the first admin (dev_site_admin) account

**6a. Create the Firebase Auth user manually via the Firebase Console:**
1. Go to **Authentication > Users** in the Firebase Console.
2. Click **Add user** and enter the first admin's email + temporary password.
3. Note the Auth UID generated.

**6b. Insert the Member row:**

Connect via `firebase dataconnect:sql:shell` or the Cloud SQL Studio and run:

```sql
INSERT INTO "member" (id, "display_name", "investing_entity_name", email, role, status, "created_at")
VALUES ('00001', 'First Admin', 'First Admin', 'admin@mygroup.org', 'DEV_SITE_ADMIN', 'ACTIVE', now());
```

> Use the next available 5-digit zero-padded ID. `00001` is safe for a fresh deployment.

**6c. Set custom claims via the Firebase Admin SDK:**

Use a throwaway script or the Firebase Console to set custom claims on the Auth user:
```json
{ "role": "dev_site_admin", "status": "active", "memberId": "00001" }
```

After this, sign in as that user — you should reach the member dashboard and be able to
navigate to `/developer/features` and `/admin/features`.

### 7. Create Drive/Gmail identity for this tenant

This tenant needs its own Google identity for:
- Storing pitch decks, company documents, and tax documents on Google Drive
- Sending invitation/password-reset/feedback emails via Gmail

**7a. Create a new Google Cloud OAuth 2.0 client ID:**
1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 client ID of type **Desktop** (the `scripts/get-drive-oauth-token.js`
   script uses the local redirect URI pattern).
3. Note the **Client ID** and **Client Secret**.

**7b. Run the OAuth consent flow:**

```bash
node scripts/get-drive-oauth-token.js \
  --client-id <YOUR_CLIENT_ID> \
  --client-secret <YOUR_CLIENT_SECRET>
```

This requests the `drive.file` and `gmail.send` scopes together (one refresh token).
Follow the browser-based consent flow.

**7c. Store the refresh token as a Firebase Secret:**

```bash
firebase functions:secrets:set DRIVE_OAUTH_REFRESH_TOKEN "<the_token>"
firebase functions:secrets:set DRIVE_OAUTH_CLIENT_SECRET "<the_secret>"
```

**7d. Create root folders on Drive:**

Using the newly-authorized Drive account, create:
1. A folder for pitch decks (store the folder ID)
2. A folder for company-update document sharing (store the folder ID)
3. A folder for tax documents (store the folder ID)

These folder IDs go into the tenant's environment variables (see Step 8).
### 8. Populate tenant environment / config

**8a. Create `functions/.env`:**

```bash
# Required for Functions runtime:
TENANT_ORG_ABBREVIATION=MYG
TENANT_ORG_DISPLAY_NAME="My Angel Group"
TENANT_APP_DOMAIN=https://my-angel-group.firebaseapp.com
TENANT_GMAIL_FROM_ADDRESS=mygroup@gmail.com
TENANT_DRIVE_SERVICE_ACCOUNT_EMAIL=123456789-compute@developer.gserviceaccount.com
TENANT_FEEDBACK_RECIPIENT=admin@mygroup.org
TENANT_FUNCTIONS_REGION=us-east1

# Drive folder IDs (from Step 7d):
DEALS_DRIVE_ROOT_FOLDER_ID=<deal-folder-id>
COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID=<company-updates-folder-id>
TAX_DOCUMENTS_DRIVE_ROOT_FOLDER_ID=<tax-docs-folder-id>
```

> The service-account compute email (`TENANT_DRIVE_SERVICE_ACCOUNT_EMAIL`) is the default
> Cloud Functions runtime identity. Find it by deploying a test function (any callable) and
> running:
> ```bash
> node scripts/check-function-sa.js --project my-angel-group --region us-east1 --function provisionMember
> ```

**8b. Create `.env.local` for the Next.js frontend:**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase project settings>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-angel-group.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-angel-group
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-angel-group.firebasestorage.app
NEXT_PUBLIC_FIREBASE_APP_ID=<from Firebase project settings>

NEXT_PUBLIC_TENANT_ORG_NAME="My Angel Group"
NEXT_PUBLIC_TENANT_ORG_SHORT_NAME="MyAngel"
NEXT_PUBLIC_TENANT_ORG_ABBREVIATION=MYG
NEXT_PUBLIC_TENANT_LOGO_PATH=/my-group-logo.png
NEXT_PUBLIC_TENANT_LOGO_ALT="My Angel Group"
NEXT_PUBLIC_TENANT_THEME_COLOR=#2c2520
NEXT_PUBLIC_TENANT_BACKGROUND_COLOR=#fdfbf7
NEXT_PUBLIC_TENANT_PWA_DESCRIPTION="My Angel Group member portal"
NEXT_PUBLIC_TENANT_SUPPORT_EMAIL=admin@mygroup.org
NEXT_PUBLIC_TENANT_BILLING_PROJECT_ID=my-angel-group
NEXT_PUBLIC_TENANT_DUES_REMINDER_TEMPLATE="Hi {name}, this is a reminder that your ${amount} annual MYG membership dues for {year} are due. Thank you!"
NEXT_PUBLIC_TENANT_COMPLIANCE_SCREENING_ENABLED=false
NEXT_PUBLIC_TENANT_HALAL_TAG_LABEL=Halal
```

### 9. Create the Cloud SQL IAM user for Functions

```bash
node scripts/create-function-db-user.js \
  --project my-angel-group \
  --instance my-group-sql \
  --db-user "<compute-sa-email>"
```

Then grant the writer role:

```bash
node scripts/grant-function-db-role.js \
  --project my-angel-group \
  --instance my-group-sql \
  --db-user "<compute-sa-email>"
```

### 10. Deploy order

```bash
# 1. Data Connect (schema + connector):
firebase deploy --only dataconnect

# 2. Cloud Functions (all at once now that there are no stale functions):
firebase deploy --only functions

# 3. Hosting (Next.js frontend):
firebase deploy --only hosting
```
### 11. Smoke tests

After deploying, verify the new tenant boots correctly:

```bash
# 401 probe — unauthenticated access is rejected
curl -s -o /dev/null -w "%{http_code}" https://my-angel-group.firebaseapp.com/admin/members
# Should return 302 (redirect to login)
```

Sign in as the first admin, then verify:
- Home page loads with correct branding
- `/developer/features` shows all 9 feature toggles (default: enabled)
- `/admin/features` is accessible with siteAdminMode on
- Creating a test member, provisioning a login, and viewing the member dashboard all work
- Feedback form sends to the configured recipient

---

## Scripts reference

| Script | Purpose | Key flags |
|---|---|---|
| `scripts/render-dataconnect-config.js` | Renders `dataconnect.yaml` from template | `--service-id`, `--location`, `--database`, `--instance-id` |
| `scripts/apply-post-migrations.js` | Applies CHECK/jsonb post-migration SQL | `--instance`, `--database`, `--iam-user` |
| `scripts/drop-gin-index.js` | Drops GIN index before schema migration | `--instance`, `--database`, `--iam-user` |
| `scripts/create-function-db-user.js` | Creates Cloud SQL IAM user for Functions | `--project`, `--instance`, `--db-user` |
| `scripts/grant-function-db-role.js` | Grants writer role to Functions DB user | `--project`, `--instance`, `--db-user`, `--database` |
| `scripts/check-instance-ip.js` | Inspects Cloud SQL instance IP config | `--project`, `--instance` |
| `scripts/check-function-sa.js` | Finds a deployed function's service account | `--project`, `--region`, `--function` |
| `functions/scripts/seed-organization.js` | Seeds the Organization row | `--instance`, `--database`, `--iam-user`, `--name` |
| `functions/scripts/seed-organization-features.js` | Seeds all feature toggles enabled=true | `--instance`, `--database`, `--iam-user` |
| `functions/scripts/backfill-organization-members.js` | Backfills admin membership rows | `--instance`, `--database`, `--iam-user` |

---

## Verification checklist

Before declaring a new tenant live, confirm:

- [ ] Rendered `dataconnect/dataconnect.yaml` is byte-identical to what the `.template`
      produces with the tenant's values
- [ ] `organization` table has exactly one row with the tenant's name
- [ ] `organization_feature` has all 9 rows with `enabled=true`
- [ ] At least one `dev_site_admin` member exists with a provisioned login
- [ ] `organization_member` has the admin(s) assigned
- [ ] Drive root folders exist and the Functions service account has access
- [ ] Gmail send scope was granted during OAuth consent (send a test email via feedback)
- [ ] `npm run build` (frontend) and `cd functions; npm run build` pass
- [ ] `firebase deploy --only hosting` succeeds and the site loads with the tenant's branding
- [ ] `firebase deploy --only functions` succeeds
- [ ] Full function deploy does NOT abort due to stale functions (delete any first if needed)

---

## Security reminders

- **Rotate or delete** the `c:\Users\adilj\dev\website` plaintext secrets (`openrouter/*.txt`,
  OAuth client-secret JSON in `screenshots/`) before sharing this runbook externally.
- Each tenant gets its own OAuth consent + Drive root folders — never reuse another tenant's
  refresh token.
- `NEXT_PUBLIC_FIREBASE_API_KEY` is genuinely public by Firebase's design (CORS-restricted,
  not a secret). The real boundary is App Check + Data Connect security rules.
- Functions secrets (`DRIVE_OAUTH_CLIENT_SECRET`, `DRIVE_OAUTH_REFRESH_TOKEN`) live in
  Firebase Secret Manager, never in `.env` files. The `.secret.local` file is for emulator
  testing only and should never reach production.

---

## Dry-run instructions

Before running through this against a real tenant, do a full dry-run against a **disposable
test Firebase project** (never ASV). The test project should:

- Have its own Cloud SQL instance (smallest tier)
- Have its own Data Connect service
- Use a throwaway Google account for the Drive/Gmail OAuth flow

The dry run confirms:

- Every script accepts the new tenant's flags and completes without error
- The rendered `dataconnect.yaml` correctly references the test instance
- The site boots with the test branding and its own isolated Drive/Gmail identity
- Feature toggles can be flipped on/off via `/developer/features`
- Per-member overrides work via `/admin/features`

After the dry run, delete the test Firebase project and its Cloud SQL instance.