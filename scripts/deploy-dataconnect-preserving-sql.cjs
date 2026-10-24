/* eslint-disable @typescript-eslint/no-require-imports -- Deployment CLI. */
// Data Connect also reconciles CHECKs/JSONB in COMPATIBLE mode. Save exact SQL objects,
// normalize only reviewed differences, deploy, and restore the objects even on failure.
// Recovery after process interruption: node scripts/deploy-dataconnect-preserving-sql.cjs --restore
const fs=require('node:fs');const path=require('node:path');const cp=require('node:child_process');
const {Connector,IpAddressTypes,AuthTypes}=require('@google-cloud/cloud-sql-connector');const {Client}=require('pg');const {FBToolsAuthClient}=require('firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient');const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');const {requireAuth}=require('firebase-tools/lib/requireAuth');
const root=path.resolve(__dirname,'..'),saved=path.join(root,'.firebase/real-estate-sql-restore.json');const q=s=>'"'+s.replaceAll('"','""')+'"';
async function main(){
 const diff=JSON.parse(fs.readFileSync(path.join(root,'.firebase/real-estate-after-diff.json'),'utf8').replace(/^\uFEFF/,''));
 const statements=diff.result.diffs.map(d=>d.sql);
 if(statements.some(s=>!/^(ALTER TABLE .* (DROP CONSTRAINT|ALTER COLUMN)|DROP INDEX |CREATE INDEX )/.test(s)||/DROP (COLUMN|TABLE)|\b(DELETE FROM|TRUNCATE)\b/.test(s)))throw new Error('Unreviewed schema changes; refusing deployment.');
 if(!process.argv.includes('--apply')&&!process.argv.includes('--restore')){console.log('Dry run: '+statements.length+' reviewed normalization statements; exact objects restored after deploy.');return;}
 const account=getGlobalDefaultAccount();await requireAuth({user:account.user,tokens:account.tokens});const connector=new Connector({auth:new FBToolsAuthClient()});let c;
 try{const opts=await connector.getOptions({instanceConnectionName:'angelstar-investments:us-east1:asv-tracker-sql',ipType:IpAddressTypes.PUBLIC,authType:AuthTypes.IAM});c=new Client({...opts,user:account.user.email,database:'asvtrackerdb'});await c.connect();let original;
  if(process.argv.includes('--restore'))original=JSON.parse(fs.readFileSync(saved,'utf8'));
  else{
   const constraints=(await c.query("SELECT cl.relname AS table,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND con.contype='c'")).rows;
   const indexes=(await c.query("SELECT tablename AS table,indexname,indexdef FROM pg_indexes WHERE schemaname='public'")).rows;
   const columns=(await c.query("SELECT table_name AS table,column_name AS column,data_type,column_default FROM information_schema.columns WHERE table_schema='public' AND (data_type='jsonb' OR column_default IS NOT NULL)")).rows;
   original={constraints,indexes,columns};fs.writeFileSync(saved,JSON.stringify(original,null,2));
   await c.query('BEGIN');try{
    // GIN indexes cannot survive the generated jsonb-to-text conversion.
    for(const i of indexes.filter(i=>/USING gin/i.test(i.indexdef)))await c.query('DROP INDEX public.'+q(i.indexname));
    for(const s of statements)await c.query(s);
    await c.query('COMMIT');console.log('Prepared schema for Data Connect; exact SQL restore definitions saved.');
   }catch(e){await c.query('ROLLBACK');throw e;}
  }
  let deploy;
  try{if(!process.argv.includes('--restore')){deploy=cp.spawnSync(process.execPath,[path.join(root,'node_modules/firebase-tools/lib/bin/firebase.js'),'deploy','--only','dataconnect','--project','angelstar-investments','--non-interactive','--json'],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:5_000_000});fs.writeFileSync(path.join(root,'.firebase/real-estate-dataconnect-publish.json'),deploy.stdout??'');console.log('Data Connect deployment exit: '+deploy.status);}}
  finally{
   await c.query('BEGIN');try{
    for(const col of original.columns){const table='public.'+q(col.table);if(col.data_type==='jsonb')await c.query('ALTER TABLE '+table+' ALTER COLUMN '+q(col.column)+' TYPE jsonb USING '+q(col.column)+'::jsonb');if(col.column_default!=null)await c.query('ALTER TABLE '+table+' ALTER COLUMN '+q(col.column)+' SET DEFAULT '+col.column_default);}
    for(const con of original.constraints){if(!(await c.query('SELECT 1 FROM pg_constraint WHERE conrelid=$1::regclass AND conname=$2',['public.'+q(con.table),con.conname])).rowCount)await c.query('ALTER TABLE public.'+q(con.table)+' ADD CONSTRAINT '+q(con.conname)+' '+con.definition);}
    for(const i of original.indexes)if(!(await c.query('SELECT to_regclass($1) AS index',['public.'+q(i.indexname)])).rows[0].index)await c.query(i.indexdef);
    await c.query('COMMIT');console.log('Restored all original CHECKs, indexes, defaults and JSONB columns.');
   }catch(e){await c.query('ROLLBACK');throw e;}
  }
  if(deploy?.status!==undefined&&deploy.status!==0)throw new Error('Data Connect deployment failed; SQL protections have been restored. Inspect the private publish log.');
 }finally{if(c)await c.end();connector.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
