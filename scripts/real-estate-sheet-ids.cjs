/* eslint-disable @typescript-eslint/no-require-imports -- Standalone maintenance CLI. */
// Dry-run by default. Use --apply only after reviewing the proposed writes, on a sheet copy first.
const {google}=require('googleapis');
const spreadsheetId=process.argv[process.argv.indexOf('--spreadsheet')+1];
if(!process.argv.includes('--spreadsheet')||!spreadsheetId||!/^[\w-]+$/.test(spreadsheetId))throw new Error('Usage: node scripts/real-estate-sheet-ids.cjs --spreadsheet <id> [--apply]');
const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
async function main(){
  for(const key of ['DRIVE_OAUTH_CLIENT_ID','DRIVE_OAUTH_CLIENT_SECRET','DRIVE_OAUTH_REFRESH_TOKEN'])if(!process.env[key])throw new Error(`Set ${key} in the process environment.`);
  const auth=new google.auth.OAuth2(process.env.DRIVE_OAUTH_CLIENT_ID,process.env.DRIVE_OAUTH_CLIENT_SECRET);
  auth.setCredentials({refresh_token:process.env.DRIVE_OAUTH_REFRESH_TOKEN});
  const sheets=google.sheets({version:'v4',auth});
  const metadata=await sheets.spreadsheets.get({spreadsheetId,fields:'sheets.properties.title'});
  const title=metadata.data.sheets?.[0]?.properties?.title;if(!title)throw new Error('No first tab.');
  const tab=`'${title.replaceAll("'","''")}'`;
  const {data}=await sheets.spreadsheets.values.get({spreadsheetId,range:`${tab}!A1:ZZ`,valueRenderOption:'FORMULA'});
  const rows=data.values??[];
  const header=rows.findIndex(r=>r.some(v=>normalize(v)==='date')&&r.some(v=>normalize(v)==='transaction description'));
  if(header<0)throw new Error('Canonical headers not found.');
  const description=rows[header].findIndex(v=>normalize(v)==='transaction description');
  const total=rows.findIndex((r,i)=>i>header&&/^total\s*=*>?$/i.test(String(r[description]??'').trim()));
  if(total<0)throw new Error('TOTAL row not found.');
  const existingColumn=rows[header].findIndex(v=>normalize(v)==='txn id');
  const index=existingColumn<0?rows[header].length:existingColumn;
  const seen=new Set();let next=1;
  for(let i=total+1;i<rows.length;i++){
    const id=rows[i][index];if(id==null||id==='')continue;
    if(!/^\d+$/.test(String(id))||!Number.isSafeInteger(Number(id))||Number(id)<1||seen.has(Number(id)))throw new Error(`Invalid, formula-based or duplicate ID at row ${i+1}. No writes made.`);
    seen.add(Number(id));next=Math.max(next,Number(id)+1);
  }
  const updates=[];
  if(existingColumn<0)updates.push({range:`${tab}!${column(index)}${header+1}`,values:[['Txn ID']]});
  for(let i=total+1;i<rows.length;i++)if(rows[i].some(v=>v!=null&&String(v).trim()!=='')&&(rows[i][index]==null||rows[i][index]===''))updates.push({range:`${tab}!${column(index)}${i+1}`,values:[[next++]]});
  console.log(JSON.stringify({spreadsheetId,firstTab:title,mode:process.argv.includes('--apply')?'APPLY':'DRY RUN',updates},null,2));
  if(process.argv.includes('--apply')&&updates.length)await sheets.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:'RAW',data:updates}});
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
