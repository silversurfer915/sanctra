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
  void store;
  return async (request:Request,env:PersonalEnv):Promise<Response> => {
    void request;
    const headers:Record<string,string>={'content-type':'application/json','cache-control':'no-store','vary':'Origin','access-control-allow-origin':env.ALLOWED_ORIGIN};
    return new Response(JSON.stringify({message:'The personal integration has been removed.'}),{status:410,headers});
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
