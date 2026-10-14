import{createRequire}from'node:module';import{readFile,writeFile}from'node:fs/promises';import{recordedFocus}from'../src/utils/competitiveRankings.ts';import{integrityPeriods,advanceIntegrity}from'../src/utils/studyIntegrity.ts';
const require=createRequire(import.meta.url),root=process.env.HOME+'/.nvm/versions/node/v24.21.0/lib/node_modules/firebase-tools/lib/',{Client}=require(root+'apiv2.js'),{getGlobalDefaultAccount}=require(root+'auth.js'),{requireAuth}=require(root+'requireAuth.js');
const env=await readFile('.env.local','utf8'),project=env.match(/^VITE_FIREBASE_PROJECT_ID=['"]?([^'"\n]+)/m)?.[1];if(!project)throw Error('Missing project');await requireAuth({project,...getGlobalDefaultAccount()});const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base=`projects/${project}/databases/(default)/documents`;
const decode=v=>'mapValue'in v?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):'arrayValue'in v?(v.arrayValue.values||[]).map(decode):'integerValue'in v?Number(v.integerValue):'doubleValue'in v?v.doubleValue:'booleanValue'in v?v.booleanValue:'timestampValue'in v?{toMillis:()=>+new Date(v.timestampValue),iso:v.timestampValue}:v.stringValue??null;
const encode=v=>typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{stringValue:String(v)};
const list=async name=>{const docs=[];let pageToken;do{const r=await client.get('/'+base+'/'+name,{queryParams:{pageSize:300,...(pageToken?{pageToken}:{})}});docs.push(...r.body.documents||[]);pageToken=r.body.nextPageToken;}while(pageToken);return docs;};
const [profiles,users,clocks,migrations]=await Promise.all(['global_profiles','users','study_integrity','ranking_migrations'].map(list));
const byId=docs=>new Map(docs.map(d=>[d.name.split('/').at(-1),{raw:d,data:decode({mapValue:{fields:d.fields}})}]));
const records=byId(users),existing=byId(clocks),done=byId(migrations);const now=Date.now(),cutoff=Date.parse('2026-10-03T09:24:50.857Z'),periods=integrityPeriods(now);let eligible=0,restored=0,seconds=0;
const backup=[];
for(const profile of profiles){const uid=profile.name.split('/').at(-1);if(done.has(uid))continue;const sessions=(records.get(uid)?.data.sessions||[]).filter(s=>Number.isFinite(s.endTime)&&s.endTime<=cutoff);const totals=Object.fromEntries(['day','week','month'].map(p=>[`${p}Seconds`,recordedFocus(sessions,new Date(now),p)]));if(!Object.values(totals).some(v=>v>0))continue;eligible++;seconds+=totals.daySeconds;
 if(!process.argv.includes('--apply'))continue;
 const prior=existing.get(uid),clock=prior?.data;const next=clock||{uid,registered:true,...advanceIntegrity(null,now,'historical-migration',false,0,'historical-migration')};
 const fields=Object.fromEntries(Object.entries(next).filter(([k])=>k!=='lastTick').map(([k,v])=>[k,encode(v)]));
 for(const p of ['day','week','month']){fields[`${p}Start`]=encode(periods[`${p}Start`]);fields[`${p}Seconds`]=encode((clock?.[`${p}Start`]===periods[`${p}Start`]?clock[`${p}Seconds`]:0)+totals[`${p}Seconds`]);}
 if(clock)fields.lastTick={timestampValue:clock.lastTick.iso};else fields.lastTick={timestampValue:new Date(now).toISOString()};
 backup.push({uid,clock:prior?.raw||null});await writeFile('/tmp/sanctra-ranking-history-backup.json',JSON.stringify(backup),{mode:0o600});
 const audit={uid,cutoff:new Date(cutoff).toISOString(),source:'Saved sessions before verified ranking launch; historical credit is not attention verification',...periods,...totals};
 const writes=[{update:{name:base+'/study_integrity/'+uid,fields},currentDocument:clock?{updateTime:prior.raw.updateTime}:{exists:false}},{update:{name:base+'/ranking_migrations/'+uid,fields:Object.fromEntries(Object.entries(audit).map(([k,v])=>[k,encode(v)]))},currentDocument:{exists:false}}];
 await client.post('/'+base+':commit',{writes});restored++;
}
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'applied':'preview',registeredProfiles:profiles.length,eligible,restored,historicalDaySeconds:seconds,cutoff:new Date(cutoff).toISOString()}));
