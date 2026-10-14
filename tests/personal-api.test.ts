import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersonalApi} from '../worker/personal-api.ts';
import {issuePersonalToken} from '../worker/personal-auth.ts';
test('native reads are owner-scoped and regenerated credentials reject old token',async()=>{
 const issued=await issuePersonalToken();
 const docs=new Map<string,Record<string,unknown>>([['personal_integrations/owner',{...issued.record}],['users/owner',{subjects:[{id:'physics',name:'Physics'}],sessions:[],tasks:[]}]]);
 const paths:string[]=[];
 const api=createPersonalApi({read:async(path:string)=>{paths.push(path);return {data:docs.get(path)||null,version:'1'};},write:async(path:string,data:Record<string,unknown>)=>{docs.set(path,data);},verifyOwner:async()=>({uid:'owner',authTime:Math.floor(Date.now()/1000)})});
 const env={FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',PERSONAL_OWNER_UID:'owner'};
 const read=()=>new Request('https://api.sanctrastudy.live/v1/personal/subjects',{headers:{authorization:'Bearer '+issued.token}});
 const result=await api(read(),env);
 assert.equal(result.status,200);assert.deepEqual((await result.json()).subjects,[{id:'physics',name:'Physics'}]);
 assert.ok(paths.every(path=>path==='personal_integrations/owner'||path.startsWith('users/owner')));
 const rotate=await api(new Request('https://api.sanctrastudy.live/v1/personal/token',{method:'POST',headers:{authorization:'Bearer firebase'}}),env);
 assert.equal(rotate.status,201);const fresh=await rotate.json();assert.ok(fresh.token);assert.ok(!JSON.stringify(docs.get('personal_integrations/owner')).includes(fresh.token));
 assert.equal((await api(read(),env)).status,401);
 assert.equal((await api(new Request('https://api.sanctrastudy.live/v1/personal/subjects',{headers:{authorization:'Bearer '+fresh.token}}),env)).status,200);
});
test('API rejects missing auth, other origins, stale management identity and unavailable owner config',async()=>{
 const api=createPersonalApi({read:async()=>({data:null,version:''}),write:async()=>{},verifyOwner:async()=>({uid:'owner',authTime:0})});
 const env={FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',PERSONAL_OWNER_UID:'owner'};
 const request=(headers:Record<string,string>={})=>new Request('https://api.sanctrastudy.live/v1/personal/context',{headers});
 assert.equal((await api(request(),env)).status,401);
 assert.equal((await api(request({origin:'https://evil.example',authorization:'Bearer secret'}),env)).status,403);
 assert.equal((await api(request(),{...env,PERSONAL_OWNER_UID:''})).status,503);
 assert.equal((await api(new Request('https://api.sanctrastudy.live/v1/personal/token',{method:'POST',headers:{authorization:'Bearer firebase'}}),env)).status,401);
});
test('syllabus sharing requires verified owner sign-in and stores only validated topic records',async()=>{
 const docs=new Map<string,Record<string,unknown>>();
 const api=createPersonalApi({read:async(path)=>({data:docs.get(path)||null,version:'1'}),write:async(path,data)=>{docs.set(path,data);},verifyOwner:async()=>({uid:'owner',authTime:Math.floor(Date.now()/1000)})});
 const env={FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',PERSONAL_OWNER_UID:'owner'};
 const request=(body:unknown)=>new Request('https://api.sanctrastudy.live/v1/personal/syllabus',{method:'POST',headers:{authorization:'Bearer firebase','content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await api(request({topics:[{id:'wave',title:'Wave optics',courseId:'course',subjectId:'physics',unitId:'optics',completed:false,revisionCount:0}]}),env)).status,200);
 assert.equal((docs.get('users/owner/personal_data/syllabus')!.topics as unknown[]).length,1);
 assert.equal((await api(request({topics:[{id:'../../other',title:'bad'}]}),env)).status,400);
});
