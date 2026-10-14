// Run through: pnpm --package=firebase-tools dlx -c 'node scripts/provision-rooms.cjs'
// Creates missing official presets; never overwrites existing room data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bin = process.env.PATH.split(path.delimiter).map(dir => path.join(dir,'firebase')).find(file=>fs.existsSync(file));
if (!bin) throw new Error('Run this script through the Firebase CLI package environment.');
const root = path.join(path.dirname(fs.realpathSync(path.join(path.dirname(bin),'..','firebase-tools','package.json'))),'lib');
const { getGlobalDefaultAccount } = require(path.join(root,'auth.js'));
const { requireAuth } = require(path.join(root,'requireAuth.js'));
const { Client } = require(path.join(root,'apiv2.js'));
const source=fs.readFileSync('src/utils/groupsService.ts','utf8');
const expression=source.match(/export const OFFICIAL_STUDY_GROUPS: StudyGroup\[\] = (\[[\s\S]*?\n\]);/)[1];
const rooms=vm.runInNewContext(expression,{}, {timeout:1000});
const value=v=>typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}: {integerValue:String(v)};
const fields=data=>Object.fromEntries(Object.entries(data).filter(([,v])=>v!==undefined).map(([k,v])=>[k,value(v)]));
(async()=>{
  const options={project:'studyapp-4137d',...getGlobalDefaultAccount()}; await requireAuth(options);
  const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
  const base='/projects/studyapp-4137d/databases/(default)/documents';
  for(const room of rooms) {
    let exists=true;
    try { await client.get(`${base}/study_groups/${room.id}`); }
    catch(error) { if (error.status===404||/404|NOT_FOUND|not found/i.test(error.message)) exists=false; else throw error; }
    if(exists){console.log(`Preserved ${room.id}`);continue;}
    await client.post(`${base}/study_groups`,{fields:fields(room)},{queryParams:{documentId:room.id}});
    console.log(`Created ${room.id}`);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
