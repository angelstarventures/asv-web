/* eslint-disable @typescript-eslint/no-require-imports -- Standalone deployment CLI. */
// This brownfield database cannot use Data Connect's generated destructive cleanup.
// Dry run by default. The reviewed pre/post files only affect new real-estate objects
// and add feature enum values. Existing startup schema and data are left untouched.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {Connector,IpAddressTypes,AuthTypes}=require('@google-cloud/cloud-sql-connector');
const {Client}=require('pg');const {FBToolsAuthClient}=require('firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');const {requireAuth}=require('firebase-tools/lib/requireAuth');
const root=path.resolve(__dirname,'..');
const split=s=>s.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n').split(';').map(s=>s.trim()).filter(Boolean);
async function main(){
 const statements=[...split(fs.readFileSync(path.join(root,'dataconnect/schema/pre_migrations/008_real_estate.sql'),'utf8')),...split(fs.readFileSync(path.join(root,'dataconnect/schema/post_migrations/008_real_estate.sql'),'utf8'))];
 if(statements.some(s=>/^(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(s)||!s.includes('real_estate')&&!/^ALTER TYPE .*ADD VALUE 'REAL_ESTATE/.test(s)))throw new Error('Refusing a statement outside the additive real-estate migration.');
 if(!process.argv.includes('--apply')){console.log(statements.join(';\n')+';');console.log('Dry run only. Pass --apply after reviewing and taking a verified snapshot.');return;}
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'.firebase/real-estate-before-manifest.json'),'utf8'));
 const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'.firebase/real-estate-before.sql'))).digest('hex');
 if(digest!==manifest.sha256||Date.now()-Date.parse(manifest.createdAt)>24*60*60*1000)throw new Error('A verified snapshot from the last 24 hours is required.');
 const account=getGlobalDefaultAccount();await requireAuth({user:account.user,tokens:account.tokens});
 const connector=new Connector({auth:new FBToolsAuthClient()});let client;
 try{const opts=await connector.getOptions({instanceConnectionName:'angelstar-investments:us-east1:asv-tracker-sql',ipType:IpAddressTypes.PUBLIC,authType:AuthTypes.IAM});client=new Client({...opts,user:account.user.email,database:'asvtrackerdb'});await client.connect();await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='10s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('real-estate-phase-1-schema'))");
  let applied=0;for(const sql of statements){await client.query('SAVEPOINT real_estate_statement');try{await client.query(sql);applied++;}catch(e){await client.query('ROLLBACK TO SAVEPOINT real_estate_statement');if(!['42710','42P07'].includes(e.code))throw e;}await client.query('RELEASE SAVEPOINT real_estate_statement');}
  const tables=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'real_estate_%'")).rows;
  if(tables.length!==11)throw new Error('Expected all eleven real-estate tables.');
  // Match the existing startup tables' ownership and reader/writer grants. Without this,
  // Data Connect's runtime cannot discover tables created by a developer's IAM login.
  for(const t of tables){
   const table='public."'+t.table_name.replaceAll('"','""')+'"';
   await client.query('ALTER TABLE '+table+' OWNER TO "firebaseowner_asvtrackerdb_public"');
   await client.query('GRANT SELECT ON '+table+' TO "firebasereader_asvtrackerdb_public"');
   await client.query('GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON '+table+' TO "firebasewriter_asvtrackerdb_public"');
  }
  await client.query('COMMIT');console.log('Applied '+applied+' statements; verified eleven real-estate tables. Existing startup objects preserved.');
 }catch(e){if(client)await client.query('ROLLBACK');throw e;}finally{if(client)await client.end();connector.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
