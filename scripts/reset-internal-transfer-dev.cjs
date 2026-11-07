/* eslint-disable @typescript-eslint/no-require-imports -- Standalone dev-database CLI. */
// Drops the objects migration 009 created (4 tables + 4 enum types) from a *_dev database so the
// migration can be re-applied in its current shape. Used when 009 changed after it was applied to
// dev (it has never been applied to production). Dry run by default; --apply to execute.
//
//   node scripts/reset-internal-transfer-dev.cjs --instance <conn> --database asvtrackerdb_dev
//   node scripts/reset-internal-transfer-dev.cjs --instance <conn> --database asvtrackerdb_dev --apply
//
// The ledger_entry_type value INTERNAL_TRANSFER stays (Postgres cannot drop an enum value);
// re-applying 009 tolerates it already existing. Refuses any database not ending in "_dev".
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

// Child tables first.
const STATEMENTS = [
  'DROP TABLE IF EXISTS public."share_lot"',
  'DROP TABLE IF EXISTS public."fee_line"',
  'DROP TABLE IF EXISTS public."transfer_party"',
  'DROP TABLE IF EXISTS public."internal_transfer_detail"',
  'DROP TYPE IF EXISTS public."lot_kind"',
  'DROP TYPE IF EXISTS public."transfer_kind"',
  'DROP TYPE IF EXISTS public."fee_kind"',
  'DROP TYPE IF EXISTS public."transfer_side"',
];

async function main() {
  const instance = flag('--instance');
  const database = flag('--database');
  if (!instance || !database) throw new Error('--instance <project:region:instance> and --database <db> are required.');
  if (!database.endsWith('_dev')) throw new Error('Refusing: database "' + database + '" does not end in _dev.');
  if (!process.argv.includes('--apply')) {
    console.log(STATEMENTS.join(';\n') + ';\nDry run only. Re-run with --apply.');
    return;
  }

  const { Connector, IpAddressTypes, AuthTypes } = require('@google-cloud/cloud-sql-connector');
  const { Client } = require('pg');
  const { FBToolsAuthClient } = require('firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient');
  const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
  const { requireAuth } = require('firebase-tools/lib/requireAuth');
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });
  const connector = new Connector({ auth: new FBToolsAuthClient() });
  let client;
  try {
    const opts = await connector.getOptions({ instanceConnectionName: instance, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
    client = new Client({ ...opts, user: account.user.email, database });
    await client.connect();
    const { rows } = await client.query('SELECT current_database() AS db');
    if (rows[0].db !== database) throw new Error('Connected to ' + rows[0].db + ', expected ' + database);
    console.log('Resetting ' + instance + ' / ' + rows[0].db);
    await client.query('BEGIN');
    for (const sql of STATEMENTS) await client.query(sql);
    await client.query('COMMIT');
    console.log('Dropped the internal-transfer tables and types. Re-apply migration 009 next.');
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    if (client) await client.end();
    connector.close();
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
