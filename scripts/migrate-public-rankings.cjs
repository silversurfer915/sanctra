// Copies verified totals into the public projection; never modifies private clocks.
// Dry-run by default. Each write checks that the clock did not change during migration.
const fs=require('node:fs'),path=require('node:path');
const bin=process.env.PATH.split(path.delimiter).map(d=>path.join(d,'firebase')).find(f=>fs.existsSync(f));
if(!bin)throw Error('Firebase CLI is required.');
const root=path.resolve(path.dirname(fs.realpathSync(bin)),'..');
const {Client}=require(path.join(root,'apiv2.js')),{getGlobalDefaultAccount}=require(path.join(root,'auth.js')),{requireAuth}=require(path.join(root,'requireAuth.js'));
const keys=['uid','registered','dayStart','weekStart','monthStart','daySeconds','weekSeconds','monthSeconds','integrityStatus'];
(async()=>{
 const project='studyapp-4137d';await requireAuth({project,...getGlobalDefaultAccount()});
 const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base=`projects/${project}/databases/(default)/documents`;
 const clocks=[];let pageToken;do{const r=(await client.get('/'+base+'/study_integrity',{queryParams:{pageSize:300,...(pageToken?{pageToken}:{})}})).body;clocks.push(...r.documents||[]);pageToken=r.nextPageToken;}while(pageToken);
 let migrated=0;const apply=process.argv.includes('--apply');
 for(let clock of clocks){if(clock.fields?.registered?.booleanValue!==true)continue;
  for(let attempt=0;attempt<4;attempt++){
   const uid=clock.name.split('/').at(-1);if(keys.some(k=>!clock.fields[k])||clock.fields.uid.stringValue!==uid)throw Error('Malformed clock; migration stopped.');
   const fields=Object.fromEntries(keys.map(k=>[k,clock.fields[k]]));
   if(!apply){migrated++;break;}
   try{await client.post('/'+base+':commit',{writes:[{verify:clock.name,currentDocument:{updateTime:clock.updateTime}},{update:{name:base+'/study_rankings/'+uid,fields}}]});
    const saved=(await client.get('/'+base+'/study_rankings/'+uid)).body;
    // Another online checkpoint may legitimately advance the public projection after commit.
    if(keys.some(k=>!saved.fields[k])||Object.keys(saved.fields).length!==keys.length)throw Error('Projection verification failed.');
    migrated++;break;
   }catch(e){if(attempt===3||![400,409,412].includes(e.status))throw e;clock=(await client.get('/'+clock.name)).body;}
  }
 }
 const indexes=(await client.get(`/projects/${project}/databases/(default)/collectionGroups/study_rankings/indexes`)).body.indexes||[];
 console.log(JSON.stringify({mode:apply?'applied':'dry-run',registeredClocks:migrated,privateClocksUnchanged:true,indexStates:indexes.map(i=>i.state)}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
