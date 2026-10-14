import {issuePersonalToken,matchesPersonalToken,verifyOwnerIdentity} from './personal-auth.ts';
import type {PersonalTokenRecord,OwnerIdentity} from './personal-auth.ts';
import {createCanonicalSession,mutateCanonicalSession,createCanonicalPlan,getSyncState} from './personal-sessions.ts';
import {serverAccess} from './manual-validation.ts';
import {streakProjection} from '../src/utils/studyStreak.ts';
export interface PersonalEnv {FIREBASE_PROJECT_ID:string;ALLOWED_ORIGIN:string;PERSONAL_OWNER_UID?:string;FIREBASE_SERVICE_ACCOUNT?:string;PERSONAL_RATE_LIMIT?:{limit(input:{key:string}):Promise<{success:boolean}>}}
export interface PersonalStore {
 transact?<T>(work:(store:PersonalStore)=>Promise<T>):Promise<T>;
 read(path:string):Promise<{data:Record<string,unknown>|null;version:string}>;
 write(path:string,data:Record<string,unknown>):Promise<void>;
 verifyOwner(token:string,project:string,owner:string):Promise<OwnerIdentity>;
}
const array=(value:unknown):Array<Record<string,any>>=>Array.isArray(value)?value.filter(v=>v&&typeof v==='object'):[];
export function createPersonalApi(store:PersonalStore) {
 return async(request:Request,env:PersonalEnv):Promise<Response>=>{
  const origin=request.headers.get('origin')||'';
  const headers:Record<string,string>={'content-type':'application/json','cache-control':'no-store','vary':'Origin','access-control-allow-origin':env.ALLOWED_ORIGIN};
  const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&origin!==env.ALLOWED_ORIGIN)return reply(403,{message:'Unavailable.'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'Authorization,Content-Type,If-None-Match'}});
  const owner=env.PERSONAL_OWNER_UID;
  if(!owner||!/^[A-Za-z0-9_-]{1,128}$/.test(owner))return reply(503,{message:'Personal integration is not configured.'});
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer ')||authorization.length>8300)return reply(401,{message:'Reconnect your personal integration.'});
  const token=authorization.slice(7),url=new URL(request.url),route=url.pathname.replace(/^\/v1\/personal\/?/,'');
  try {
   if(env.PERSONAL_RATE_LIMIT&&!((await env.PERSONAL_RATE_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||owner})).success))return reply(429,{message:'Wait a moment before retrying.'});
   if(route==='token'||route==='syllabus') {
    const identity=await store.verifyOwner(token,env.FIREBASE_PROJECT_ID,owner);
    if(identity.uid!==owner)return reply(403,{message:'This integration is personal.'});
    if(route==='syllabus') {
     if(request.method!=='POST')return reply(405,{message:'Use POST.'});
     const raw=await request.text();if(raw.length>800000)return reply(413,{message:'Share a smaller syllabus.'});
     let body:any;try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid syllabus.'});}
     const topics=body.topics;
     const validId=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
     if(!Array.isArray(topics)||topics.length>5000||topics.some(t=>!t||!validId(t.id)||!validId(t.courseId)||!validId(t.subjectId)||!validId(t.unitId)||typeof t.title!=='string'||!t.title.trim()||t.title.length>300||typeof t.completed!=='boolean'||!Number.isInteger(t.revisionCount)||t.revisionCount<0||t.revisionCount>100000||t.notes!==undefined&&(typeof t.notes!=='string'||t.notes.length>2000)))return reply(400,{message:'Invalid syllabus.'});
     const clean=topics.map(t=>({id:t.id,title:t.title,courseId:t.courseId,subjectId:t.subjectId,unitId:t.unitId,completed:t.completed,revisionCount:t.revisionCount,...(t.notes?{notes:t.notes}:{}),...(typeof t.subjectTitle==='string'?{subjectTitle:t.subjectTitle.slice(0,300)}:{}),...(typeof t.unitTitle==='string'?{unitTitle:t.unitTitle.slice(0,300)}:{})}));
     await store.write(`users/${owner}/personal_data/syllabus`,{topics:clean,sharedAt:new Date().toISOString()});
     return reply(200,{sharedTopics:clean.length});
    }
    if(request.method==='GET') {
     const {data}=await store.read(`personal_integrations/${owner}`);
     return reply(200,{configured:!!data&&!data.revoked,createdAt:data?.createdAt||null});
    }
    if(!['POST','DELETE'].includes(request.method))return reply(405,{message:'Use GET, POST or DELETE.'});
    if(Date.now()/1000-identity.authTime>300)return reply(401,{message:'Sign in again to manage your personal token.'});
    if(request.method==='DELETE') {await store.write(`personal_integrations/${owner}`,{revoked:true,createdAt:new Date().toISOString(),hash:''});return reply(200,{revoked:true});}
    const issued=await issuePersonalToken();await store.write(`personal_integrations/${owner}`,{...issued.record});
    return reply(201,{token:issued.token,createdAt:issued.record.createdAt});
   }
   if(!/^sanctra_personal_[A-Za-z0-9_-]{43}$/.test(token))return reply(401,{message:'Reconnect your personal integration.'});
   const credential=await store.read(`personal_integrations/${owner}`);
   if(!await matchesPersonalToken(token,credential.data as unknown as PersonalTokenRecord|null))return reply(401,{message:'Reconnect your personal integration.'});
   if(route==='sessions'&&request.method==='POST'){
    const raw=await request.text();let body:any;
    try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid session payload.'});}
    const res=await createCanonicalSession(store,owner,body);return reply(res.status,res.body);
   }
   if(route.startsWith('sessions/')&&request.method==='PATCH'){
    const sessionId=route.slice(9),raw=await request.text();let body:any;
    try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid session payload.'});}
    const res=await mutateCanonicalSession(store,owner,sessionId,body);return reply(res.status,res.body);
   }
   if(route==='plans'&&request.method==='POST'){
    const raw=await request.text();let body:any;
    try{body=JSON.parse(raw);}catch{return reply(400,{message:'Invalid plan payload.'});}
    const res=await createCanonicalPlan(store,owner,body);return reply(res.status,res.body);
   }
   if(request.method!=='GET')return reply(405,{message:'This endpoint is read-only.'});
   const {data,version}=await store.read(`users/${owner}`);
   if(!data)return reply(404,{message:'Save your study account before connecting.'});
   const subjects=array(data.subjects),sessions=array(data.sessions),tasks=array(data.tasks),calendar=array(data.calendarEvents),settings=(data.settings||{}) as Record<string,unknown>;
   const account={uid:owner,displayName:data.displayName||data.name||'',timezone:settings.timezone||'Asia/Kolkata'};
   const goals={dailyGoalHours:settings.dailyGoalHours??null,weeklyTargetHours:settings.weeklyTargetHours??null};
   const sorted=[...sessions].sort((a,b)=>Number(b.startTime||0)-Number(a.startTime||0)||String(a.id).localeCompare(String(b.id)));
   const offset=330; // Current owner uses India; preserve saved projection offset when available.
   const streaks=streakProjection(sessions.map(s=>({date:String(s.date||''),durationSeconds:Number(s.durationSeconds||0)})),new Date(),Number.isInteger(data.streakUtcOffset)?Number(data.streakUtcOffset):offset);
   const notes=sessions.filter(s=>s.notes).map(s=>({sessionId:s.id,subjectId:s.subjectId,date:s.date,reference:`session:${s.id}`,preview:String(s.notes).slice(0,240)}));
   const syllabus=await store.read(`users/${owner}/personal_data/syllabus`);
   const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||50));
   const cursor=url.searchParams.get('cursor');const index=cursor?sorted.findIndex(s=>s.id===cursor)+1:0;
   if(cursor&&index===0)return reply(409,{message:'History changed. Refresh the first page.'});
   const page=sorted.slice(index,index+limit);
   const metadata={revision:version,account,streaks};
   let result:unknown;
   switch(route) {
    case 'account':result={account};break;
    case 'subjects':result={subjects};break;
    case 'topics':result={topics:syllabus.data?.topics||[],availability:syllabus.data?'shared':'browser-only'};break;
    case 'goals':result={goals};break;
    case 'notes':result={notes:notes.slice(0,limit)};break;
    case 'sessions':result={sessions:page,nextCursor:index+limit<sorted.length?page.at(-1)?.id:null};break;
    case 'tasks':case 'plans':result={tasks:tasks.slice(0,limit),calendarEvents:calendar.slice(0,limit)};break;
    case 'calendar':result={calendarEvents:calendar.slice(0,limit)};break;
    case 'context':result={...metadata,subjects,goals,recentSessions:sorted.slice(0,20),tasks:tasks.filter(t=>!t.completed).slice(0,100),calendarEvents:calendar.slice(0,100),topics:syllabus.data?.topics||[],syllabusAvailability:syllabus.data?'shared':'browser-only',notes:notes.slice(0,20)};break;
    case 'sync':{const clientRev=url.searchParams.get('revision')||request.headers.get('if-none-match')?.replace(/"/g,'');const s=await getSyncState(store,owner,clientRev);if(s.unchanged)return new Response(null,{status:304,headers:{...headers,etag:`"${s.revision}"`}});return new Response(JSON.stringify({...metadata,revision:s.revision,serverTime:s.serverTime,activeSession:s.activeSession}),{status:200,headers:{...headers,etag:`"${s.revision}"`}});}break;
    default:return reply(404,{message:'Unknown personal endpoint.'});
   }
   const raw=JSON.stringify(result);if(raw.length>1024*1024)return reply(413,{message:'Request a smaller page.'});
   return reply(200,result);
  } catch {return reply(route==='token'?401:503,{message:route==='token'?'Sign in again to manage your personal token.':'Personal study data is temporarily unavailable.'});}
 };
}
function decode(value:any):any {
 if(value===null||typeof value!=='object')return null;
 if(value.stringValue!==undefined)return value.stringValue;if(value.integerValue!==undefined)return Number(value.integerValue);if(value.doubleValue!==undefined)return value.doubleValue;if(value.booleanValue!==undefined)return value.booleanValue;if(value.timestampValue!==undefined)return value.timestampValue;
 if(value.arrayValue)return (value.arrayValue.values||[]).map(decode);if(value.mapValue)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,v])=>[key,decode(v)]));return null;
}
function encode(value:unknown):any {
 if(value===null||value===undefined)return {nullValue:null};if(typeof value==='string')return {stringValue:value};if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='number')return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value};if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};return {mapValue:{fields:Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,v])=>[key,encode(v)]))}};
}
export async function handlePersonalApi(request:Request,env:PersonalEnv):Promise<Response> {
 if(!env.FIREBASE_SERVICE_ACCOUNT)return new Response(JSON.stringify({message:'Personal integration is not configured.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':env.ALLOWED_ORIGIN}});
 try {
 const token=await serverAccess(env.FIREBASE_SERVICE_ACCOUNT);
 const base=`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
 return await createPersonalApi(createFirestorePersonalStore(base,token))(request,env);
 } catch {
  return new Response(JSON.stringify({message:'Personal integration is temporarily unavailable. Retry shortly.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':env.ALLOWED_ORIGIN}});
 }
}
export function createFirestorePersonalStore(base:string,token:string):PersonalStore {
 const headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
 const store:PersonalStore={
  verifyOwner:verifyOwnerIdentity,
  read:async(path)=>{const r=await fetch(`${base}/${path}`,{headers,signal:AbortSignal.timeout(10000)});if(r.status===404)return {data:null,version:''};if(!r.ok)throw Error();const doc=await r.json() as any;return {data:Object.fromEntries(Object.entries(doc.fields||{}).map(([key,value])=>[key,decode(value)])),version:doc.updateTime||''};},
  write:async(path,data)=>{const r=await fetch(`${base}/${path}`,{method:'PATCH',headers,body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,encode(value)]))}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();}
 };
 store.transact=async work=>{
  for(let attempt=0;attempt<4;attempt++) {
   const begin=await fetch(`${base}:beginTransaction`,{method:'POST',headers,body:JSON.stringify({options:{readWrite:{}}}),signal:AbortSignal.timeout(10000)});
   if(!begin.ok)throw Error('Transaction unavailable');
   const {transaction}=await begin.json() as {transaction:string};
   const staged=new Map<string,Record<string,unknown>>();
   const versions=new Map<string,string>();
   const txStore:PersonalStore={verifyOwner:store.verifyOwner,
    read:async path=>{
     if(staged.has(path))return {data:staged.get(path)!,version:versions.get(path)||''};
     const r=await fetch(`${base}:batchGet`,{method:'POST',headers,body:JSON.stringify({documents:[`${base.split('/v1/')[1]}/${path}`],transaction}),signal:AbortSignal.timeout(10000)});
     if(!r.ok)throw Error('Transaction read failed');
     const replies=await r.json() as any;
     const entry=(Array.isArray(replies)?replies:[replies])[0];
     if(entry?.missing){versions.set(path,'');return {data:null,version:''};}
     const doc=entry?.found;if(!doc)throw Error('Missing transaction read result');versions.set(path,doc.updateTime||'');
     return {data:Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,decode(v)])),version:doc.updateTime||''};
    },write:async(path,data)=>{staged.set(path,data);}};
   try {
    const result=await work(txStore);
    const writes=[...staged].map(([path,data])=>({update:{name:`${base.split('/v1/')[1]}/${path}`,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))},...(versions.has(path)?{currentDocument:versions.get(path)?{updateTime:versions.get(path)}:{exists:false}}:{})}));
    const commit=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes,transaction}),signal:AbortSignal.timeout(10000)});
    if(commit.ok)return result;
    if(![409,412].includes(commit.status))throw Error('Transaction commit failed');
   } catch(error) {
    await fetch(`${base}:rollback`,{method:'POST',headers,body:JSON.stringify({transaction}),signal:AbortSignal.timeout(10000)}).catch(()=>{});
    throw error;
   }
   await fetch(`${base}:rollback`,{method:'POST',headers,body:JSON.stringify({transaction}),signal:AbortSignal.timeout(10000)}).catch(()=>{});
  }
  throw Error('Concurrent changes; retry later');
 };
 return store;
}
