import test from 'node:test';import assert from 'node:assert/strict';
import {advanceServerTimer} from '../worker/server-timer.ts';
const now=Date.UTC(2026,9,8,9),active={deviceId:'device-a',sessionId:'session-a',startTime:123,status:'running',mode:'countup',targetSeconds:0,accumulatedSeconds:0};
const previous={uid:'alice',registered:true,dayStart:Date.UTC(2026,9,8),weekStart:Date.UTC(2026,9,5),monthStart:Date.UTC(2026,9,1),daySeconds:1260,weekSeconds:1260,monthSeconds:1260,lastTick:new Date(now-780000).toISOString(),active:true,deviceId:'device-a',timerId:'session-a',stretchStart:now-2040000,clientSeconds:99999,credited:0,integrityStatus:'review',reason:'timer_jump'};
const request={deviceId:'device-a',sessionStart:123,status:'running'};
test('sleep credits all server elapsed time and removes automatic legacy review, independent of client totals',()=>{
 const next=advanceServerTimer(previous,active,request,now,'UTC',false)!;assert.equal(next.daySeconds,2040);assert.equal(next.integrityStatus,'clear');assert.equal(next.reason,'');assert.equal(next.serverManaged,true);
});
test('a long suspension is capped at three hours without an integrity flag',()=>{
 const next=advanceServerTimer({...previous,lastTick:new Date(now-72000000).toISOString(),stretchStart:now-72000000},active,request,now,'UTC',false)!;assert.equal(next.credited,10800);assert.equal(next.integrityStatus,'clear');
});
test('an admin review or confirmed decision is preserved',()=>{
 assert.equal(advanceServerTimer(previous,active,request,now,'UTC',true)!.integrityStatus,'review');
 assert.equal(advanceServerTimer({...previous,integrityStatus:'confirmed'},active,request,now,'UTC',false)!.integrityStatus,'confirmed');
});
test('second-device browsing and stale session messages cannot stop the running clock',()=>{
 assert.equal(advanceServerTimer(previous,active,{...request,deviceId:'device-b',status:'idle'},now,'UTC',false),null);
 assert.equal(advanceServerTimer({...previous,sessionStart:123},active,{...request,sessionStart:122,status:'idle'},now,'UTC',false),null);
 assert.throws(()=>advanceServerTimer(previous,active,{...request,deviceId:'device-b'},now,'UTC',false),/another device/);
});
test('countdown ends at its server deadline even while the laptop sleeps',()=>{
 const next=advanceServerTimer({...previous,creditUntil:now-600000},active,request,now,'UTC',false)!;assert.equal(next.credited,180);
});
test('foreground pause excludes away time and resume starts a fresh segment',()=>{
 const paused=advanceServerTimer(previous,active,{...request,status:'paused'},now,'UTC',false)!;assert.equal(paused.active,false);assert.equal(paused.daySeconds,2040);
 const resumed=advanceServerTimer({...paused,lastTick:new Date(now).toISOString()},active,request,now+3600000,'UTC',false)!;assert.equal(resumed.credited,0);assert.equal(resumed.daySeconds,2040);
});
test('a new owned session or takeover settles the old server stretch instead of being ignored',()=>{
 const next=advanceServerTimer({...previous,sessionStart:122},active,request,now,'UTC',false)!;
 assert.equal(next.daySeconds,2040);assert.equal(next.sessionStart,123);assert.equal(next.timerId,'session-a');
 const takenOver=advanceServerTimer({...previous,sessionStart:122,deviceId:'device-b'},active,request,now,'UTC',false)!;
 assert.equal(takenOver.daySeconds,2040);assert.equal(takenOver.deviceId,'device-a');assert.equal(takenOver.stretchStart,previous.stretchStart);
});
test('a save can close the owned clock after the active document is deleted',()=>{
 const next=advanceServerTimer({...previous,sessionStart:123},null,{...request,status:'idle'},now,'UTC',false)!;
 assert.equal(next.daySeconds,2040);assert.equal(next.active,false);
 assert.equal(advanceServerTimer({...previous,sessionStart:123},null,{...request,sessionStart:122,status:'idle'},now,'UTC',false),null);
});
test('completed countdown cannot turn into unlimited count-up credit',()=>{
 const next=advanceServerTimer(null,{...active,targetSeconds:120,accumulatedSeconds:120},request,now,'UTC',false)!;
 assert.equal(next.creditUntil,now);
 assert.equal(advanceServerTimer(next,active,request,now+3600000,'UTC',false)!.credited,0);
});
test('sleep credit crossing midnight goes into the correct daily and weekly periods',()=>{
 const tick=Date.UTC(2026,9,11,23,50),wake=Date.UTC(2026,9,12,0,10);
 const next=advanceServerTimer({...previous,dayStart:Date.UTC(2026,9,11),lastTick:new Date(tick).toISOString(),stretchStart:tick},active,request,wake,'UTC',false)!;
 assert.equal(next.daySeconds,600);assert.equal(next.weekSeconds,600);assert.equal(next.monthSeconds,2460);
});
test('timer endpoint requires verified authentication even when AI is disabled',async()=>{
 const {default:gateway}=await import('../worker/ai-gateway.ts');
 const env={FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',GEMINI_API_KEY:''};
 const unauth=await gateway.fetch(new Request('https://worker.test/timer',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN},body:JSON.stringify(request)}),env);assert.equal(unauth.status,401);
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response('{}',{status:403});}) as typeof fetch;
 const token=`x.${btoa(JSON.stringify({sub:'alice'}))}.x`;
 try{
  const invalid=await gateway.fetch(new Request('https://worker.test/timer',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,authorization:`Bearer ${token}`},body:JSON.stringify(request)}),env);
  assert.equal(invalid.status,401);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('authenticated timer recovery atomically updates private clock and ranking without calling Gemini or consuming allowance',async()=>{
 const {default:gateway}=await import('../worker/ai-gateway.ts');
 const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const pem=Buffer.from(await crypto.subtle.exportKey('pkcs8',key.privateKey)).toString('base64');
 const env={FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',GEMINI_API_KEY:'',FIREBASE_SERVICE_ACCOUNT:JSON.stringify({client_email:'timer-test@example.test',private_key:`-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`})};
 const token=`x.${btoa(JSON.stringify({sub:'alice',firebase:{sign_in_provider:'google.com'}}))}.x`;
 const fields=(data:Record<string,any>)=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,k==='lastTick'?{timestampValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{stringValue:v}]));
 const realNow=Date.now(),date=new Date(realNow),day=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
 const old={...previous,sessionStart:123,lastTick:new Date(realNow-780000).toISOString(),stretchStart:realNow-2040000,dayStart:day};
 const original=globalThis.fetch;let commits=0,reads=0;
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  assert.equal(url.includes('generativelanguage'),false);assert.equal(url.includes('ai_days'),false);
  if(url.includes('/users/alice')){assert.equal((init?.headers as any).authorization,`Bearer ${token}`);return Response.json({});}
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'test-access',expires_in:3600});
  if(url.endsWith(':beginTransaction'))return Response.json({transaction:'server-transaction'});
  if(url.includes('/study_integrity/alice?')){reads++;return Response.json({fields:fields(old)});}
  if(url.includes('/activeSessions/alice?'))return Response.json({fields:fields(active)});
  if(url.includes('/study_integrity_reviews/alice?'))return new Response('{}',{status:404});
  if(url.endsWith(':commit')){
   const body=JSON.parse(String(init?.body));assert.equal(body.transaction,'server-transaction');assert.equal(body.writes.length,2);
   const clock=body.writes[0].update,rank=body.writes[1].update;
   assert.equal(clock.fields.serverManaged.booleanValue,true);assert.equal(clock.fields.integrityStatus.stringValue,'clear');
   assert.ok(Number(clock.fields.daySeconds.integerValue)>=2040);assert.equal(rank.fields.daySeconds.integerValue,clock.fields.daySeconds.integerValue);
   assert.equal(rank.fields.lastTick,undefined);assert.ok(clock.fields.lastTick.timestampValue);
   // A concurrent manual-credit/timer update forces a transaction retry.
   return ++commits===1?new Response('{}',{status:409}):Response.json({});
  }
  throw Error(`Unexpected test route: ${url}`);
 }) as typeof fetch;
 try{const result=await gateway.fetch(new Request('https://worker.test/timer',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,authorization:`Bearer ${token}`},body:JSON.stringify({...request,timezone:'UTC'})}),env);assert.equal(result.status,200);assert.equal((await result.json()).integrityStatus,'clear');assert.equal(commits,2);assert.equal(reads,2);}finally{globalThis.fetch=original;}
});
test('automatic flags on already-stopped owned legacy clocks clear without inventing missing time',()=>{
 const stopped={...previous,active:false,sessionStart:123};
 const next=advanceServerTimer(stopped,null,{...request,sessionStart:0,status:'idle'},now,'UTC',false)!;
 assert.equal(next.integrityStatus,'clear');assert.equal(next.daySeconds,1260);assert.equal(next.credited,0);
 assert.equal(advanceServerTimer(stopped,null,{...request,status:'idle'},now,'UTC',true),null);
});
test('repeated server updates retain fractional seconds instead of dropping them on every request',()=>{
 let clock=advanceServerTimer(null,active,request,now,'UTC',false)!;
 for(let i=1;i<=10;i++)clock=advanceServerTimer(clock,active,request,now+i*1600,'UTC',false)!;
 assert.equal(clock.daySeconds,16);
});
