/* eslint-disable @typescript-eslint/no-require-imports -- Standalone deployment CLI. */
// Applies dataconnect/schema/{pre,post}_migrations/009_internal_transfers.sql and pre_migrations/010_transfer_source_round.sql to the brownfield
// database. Dry run by default (prints the statements); pass --apply after taking a snapshot.
// Additive only: one enum value, two enums, four new tables, constraints, and an idempotent
// share_lot backfill from existing priced/SAFE allocations. Mirrors apply-real-estate-migration.cjs.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const split = (s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((x) => x.trim()).filter(Boolean);
const NEW_TABLES = ['internal_transfer_detail', 'transfer_party', 'fee_line', 'share_lot'];

function loadStatements() {
  return [
    ...split(fs.readFileSync(path.join(root, 'dataconnect/schema/pre_migrations/009_internal_transfers.sql'), 'utf8')),
    ...split(fs.readFileSync(path.join(root, 'dataconnect/schema/post_migrations/009_internal_transfers.sql'), 'utf8')),
    ...split(fs.readFileSync(path.join(root, 'dataconnect/schema/pre_migrations/010_transfer_source_round.sql'), 'utf8')),
  ];
}

// Refuses anything that could touch existing data: no DROP/DELETE/TRUNCATE/UPDATE, and every
// statement must reference one of the new objects (or add the new enum value).
function assertAdditive(statements) {
  const bad = statements.find(
    (s) =>
      /^(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(s) ||
      !(NEW_TABLES.some((t) => s.includes(t)) || /transfer_side|fee_kind|transfer_kind|lot_kind|ADD VALUE 'INTERNAL_TRANSFER'|ADD VALUE 'TRANSFER_AGREEMENT'/.test(s))
  );
  if (bad) throw new Error('Refusing a statement outside the additive internal-transfer migration: ' + bad.slice(0, 80));
}

const PROD_DATABASE = 'asvtrackerdb';
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const statements = loadStatements();
  assertAdditive(statements);
  if (!process.argv.includes('--apply')) {
    console.log(statements.join(';\n') + ';');
    console.log('Dry run only. Pass --apply --instance <project:region:instance> --database <db> after reviewing and taking a verified Cloud SQL backup.');
    return;
  }
  // No defaults: the target must be named explicitly, and production needs a second opt-in.
  const instance = flag('--instance');
  const database = flag('--database');
  if (!instance || !database) throw new Error('--apply requires --instance <project:region:instance> and --database <db>.');
  if (database === PROD_DATABASE && !process.argv.includes('--production')) {
    throw new Error('Database "' + PROD_DATABASE + '" is production. Pass --production to confirm, or target a dev database.');
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
    console.log('Applying to ' + instance + ' / ' + rows[0].db);
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('internal-transfer-schema'))");
    let applied = 0;
    for (const sql of statements) {
      await client.query('SAVEPOINT s');
      try {
        await client.query(sql);
        applied++;
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT s');
        if (!['42710', '42P07', '42701'].includes(e.code)) throw e; // already applied
      }
      await client.query('RELEASE SAVEPOINT s');
    }
    for (const t of NEW_TABLES) {
      const table = 'public."' + t + '"';
      await client.query('ALTER TABLE ' + table + ' OWNER TO "firebaseowner_asvtrackerdb_public"');
      await client.query('GRANT SELECT ON ' + table + ' TO "firebasereader_asvtrackerdb_public"');
      await client.query('GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON ' + table + ' TO "firebasewriter_asvtrackerdb_public"');
    }
    await client.query('COMMIT');
    console.log('Applied ' + applied + ' statements. Existing objects untouched.');
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    throw e;
  } finally {
    if (client) await client.end();
    connector.close();
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
module.exports = { loadStatements, assertAdditive };
