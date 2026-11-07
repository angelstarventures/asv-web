/* eslint-disable @typescript-eslint/no-require-imports -- Standalone dev-database CLI. */
// After `gcloud sql import` into a *_dev database, every object is owned by cloudsqlsuperuser,
// but production objects belong to firebaseowner_asvtrackerdb_public — so the IAM login (a member
// of that role, not a superuser) cannot ALTER TYPE/TABLE in dev. This reassigns ownership of the
// public-schema tables, sequences, views, enum types and functions to the Data Connect owner role.
//
// Connects with a TEMPORARY built-in user (create it, run this, delete it):
//   gcloud sql users create devfix --instance=asv-tracker-sql --password=<pw>
//   $env:DEVFIX_PASSWORD = "<pw>"
//   node scripts/fix-dev-db-ownership.cjs --instance <conn> --database asvtrackerdb_dev          # dry run
//   node scripts/fix-dev-db-ownership.cjs --instance <conn> --database asvtrackerdb_dev --apply
//   gcloud sql users delete devfix --instance=asv-tracker-sql
//
// Refuses any database whose name does not end in "_dev". Only ownership changes; no data or DDL.
const OWNER_ROLE = 'firebaseowner_asvtrackerdb_public';
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

async function main() {
  const instance = flag('--instance');
  const database = flag('--database');
  const user = flag('--user') || 'devfix';
  const password = process.env.DEVFIX_PASSWORD;
  if (!instance || !database) throw new Error('--instance <project:region:instance> and --database <db> are required.');
  if (!database.endsWith('_dev')) throw new Error('Refusing: database "' + database + '" does not end in _dev.');
  if (!password) throw new Error('Set DEVFIX_PASSWORD to the temporary user\'s password.');
  const apply = process.argv.includes('--apply');

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
    const opts = await connector.getOptions({ instanceConnectionName: instance, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.PASSWORD });
    client = new Client({ ...opts, user, password, database });
    await client.connect();
    const { rows: who } = await client.query('SELECT current_database() AS db, current_user AS u');
    if (who[0].db !== database) throw new Error('Connected to ' + who[0].db + ', expected ' + database);
    console.log('Connected to ' + instance + ' / ' + who[0].db + ' as ' + who[0].u);

    const stmts = [];
    const add = (rows, kind, name) => rows.forEach((r) => stmts.push('ALTER ' + kind + ' public.' + q(r[name]) + ' OWNER TO ' + q(OWNER_ROLE)));
    const owned = (extra) => `AND pg_get_userbyid(${extra}) = 'cloudsqlsuperuser'`;
    add((await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ${owned('c.relowner')} ORDER BY 1`)).rows, 'TABLE', 'relname');
    add((await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S' ${owned('c.relowner')} AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.deptype IN ('a','i')) ORDER BY 1`)).rows, 'SEQUENCE', 'relname');
    add((await client.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m') ${owned('c.relowner')} ORDER BY 1`)).rows, 'VIEW', 'relname');
    add((await client.query(`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' ${owned('t.typowner')} ORDER BY 1`)).rows, 'TYPE', 'typname');
    const fns = (await client.query(`SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ${owned('p.proowner')} ORDER BY 1`)).rows;
    fns.forEach((f) => stmts.push('ALTER FUNCTION public.' + q(f.proname) + '(' + f.args + ') OWNER TO ' + q(OWNER_ROLE)));

    const { rows: sch } = await client.query(
      `SELECT pg_get_userbyid(nspowner) AS owner, nspacl::text AS acl,
              has_schema_privilege($1, 'public', 'CREATE') AS owner_role_can_create
       FROM pg_namespace WHERE nspname = 'public'`,
      [OWNER_ROLE]
    );
    console.log('schema public: owner=' + sch[0].owner + ' acl=' + sch[0].acl + ' ' + OWNER_ROLE + ' can CREATE=' + sch[0].owner_role_can_create);
    console.log(stmts.join(';\n') + (stmts.length ? ';' : '(nothing owned by cloudsqlsuperuser — nothing to do)'));
    if (!apply) {
      console.log('\nDry run only (' + stmts.length + ' statements). Re-run with --apply.');
      return;
    }
    await client.query('BEGIN');
    // ALTER ... OWNER TO needs membership in the new owner role.
    await client.query('GRANT ' + q(OWNER_ROLE) + ' TO ' + q(user));
    // The new owner must be able to CREATE in the schema (PostgreSQL's rule for OWNER TO).
    await client.query('GRANT USAGE, CREATE ON SCHEMA public TO ' + q(OWNER_ROLE));
    for (const s of stmts) await client.query(s);
    await client.query('COMMIT');
    console.log('\nReassigned ' + stmts.length + ' objects to ' + OWNER_ROLE + '.');
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    if (client) await client.end();
    connector.close();
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
