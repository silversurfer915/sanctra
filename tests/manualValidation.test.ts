import {test} from 'node:test';import assert from 'node:assert/strict';
import {checkManualCandidate,manualCreditTotals,parseValidation} from '../worker/manual-validation.ts';
const now=Date.UTC(2026,9,7,12),session={id:'sess-manual-ai-test',source:'ai-manual' as const,startTime:now-3600000,endTime:now,durationSeconds:3600,notes:'Physics practice',subjectName:'Physics'};
test('rejects malformed, future and inflated manual durations',()=>{assert.equal(checkManualCandidate(session,now).durationSeconds,3600);for(const patch of [{source:'live'},{durationSeconds:7200},{endTime:now+1},{durationSeconds:0},{id:'../other'}])assert.throws(()=>checkManualCandidate({...session,...patch},now));});
test('validation fails closed and requires an explicit verdict',()=>{assert.equal(parseValidation('{"status":"approved","reason":"Plausible focused practice."}').status,'approved');assert.equal(parseValidation('{"status":"rejected","reason":"Not study time."}').status,'rejected');assert.throws(()=>parseValidation('{"status":"maybe","reason":"okay"}'));});
test('manual credit is split at period boundaries without changing old period keys',()=>{
 const clock={dayStart:now-1800000,weekStart:now-86400000,monthStart:now-86400000,daySeconds:10,weekSeconds:20,monthSeconds:30};
 assert.deepEqual(manualCreditTotals(clock,session,now),{daySeconds:1810,weekSeconds:3620,monthSeconds:3630});
 assert.deepEqual(manualCreditTotals(clock,{...session,startTime:now-172800000,endTime:now-169200000},now),{daySeconds:10,weekSeconds:20,monthSeconds:30});
});

test('credit settlement preserves a running clock and allocates elapsed time across midnight',async()=>{
 const {settleManualClock}=await import('../worker/manual-validation.ts');
 const previous={fields:{uid:{stringValue:'alice'},registered:{booleanValue:true},active:{booleanValue:true},deviceId:{stringValue:'device-a'},timerId:{stringValue:'timer'},lastTick:{timestampValue:'2026-10-06T23:59:30Z'},dayStart:{integerValue:String(Date.UTC(2026,9,6))},weekStart:{integerValue:String(Date.UTC(2026,9,5))},monthStart:{integerValue:String(Date.UTC(2026,9,1))},daySeconds:{integerValue:'100'},weekSeconds:{integerValue:'200'},monthSeconds:{integerValue:'300'},integrityStatus:{stringValue:'clear'},reason:{stringValue:''},credited:{integerValue:'0'},clientSeconds:{integerValue:'100'}}};
 const next=settleManualClock(previous,'alice','UTC',Date.UTC(2026,9,7,0,0,30));assert.equal(next.active,true);assert.equal(next.deviceId,'device-a');assert.equal(next.daySeconds,30);assert.equal(next.weekSeconds,260);assert.equal(next.monthSeconds,360);assert.equal(next.lastTick,undefined);
});
test('atomic receipt prevents retrying the same credit and duplicate-time entries are rejected',async()=>{
 const {commitValidation}=await import('../worker/manual-validation.ts');const original=globalThis.fetch;let commits=0;
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.endsWith(':beginTransaction'))return Response.json({transaction:'test-transaction'});
  if(url.endsWith(':commit')){commits++;const writes=JSON.parse(String(init?.body)).writes;assert.equal(writes.length,1);assert.equal(writes[0].update.fields.status.stringValue,'rejected');assert.equal(writes[0].update.fields.creditedSeconds.integerValue,'0');return Response.json({});}
  if(url.includes('/manual_credit_receipts/'))return Response.json({fields:{sessionId:{stringValue:'different'}}});
  return new Response('{}',{status:404});
 }) as typeof fetch;
 try{const r=await commitValidation('https://firestore.googleapis.com/v1/projects/test/databases/(default)/documents','test-token','alice',session,{status:'approved',reason:'Plausible study'},'UTC');assert.equal(r.status,'rejected');assert.equal(commits,1);}finally{globalThis.fetch=original;}
});
test('approved clock, ranking and receipt share one version-checked commit',async()=>{
 const {commitValidation}=await import('../worker/manual-validation.ts');const original=globalThis.fetch;
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.endsWith(':beginTransaction'))return Response.json({transaction:'test-transaction'});if(url.endsWith(':commit')){const writes=JSON.parse(String(init?.body)).writes;assert.equal(writes.length,5);assert.equal(writes[0].currentDocument.exists,false);assert.equal(writes[2].currentDocument.exists,false);assert.equal(writes[4].currentDocument.exists,false);assert.equal(writes[3].update.fields.daySeconds.integerValue,writes[2].update.fields.daySeconds.integerValue);assert.equal(writes[2].update.fields.lastTick.timestampValue.includes('T'),true);return Response.json({});}return new Response('{}',{status:404});}) as typeof fetch;
 try{const r=await commitValidation('https://firestore.googleapis.com/v1/projects/test/databases/(default)/documents','test-token','alice',session,{status:'approved',reason:'Plausible study'},'UTC');assert.equal(r.status,'approved');assert.equal(r.creditedSeconds,3600);}finally{globalThis.fetch=original;}
});
test('manual daily allowance splits at midnight and allocates only remaining six-hour credit',async()=>{
 const {manualDays,capManualDays}=await import('../worker/manual-validation.ts');
 const start=Date.UTC(2026,9,6,22),end=Date.UTC(2026,9,7,8);
 const days=manualDays({...session,startTime:start,endTime:end,durationSeconds:36000},'UTC');
 const segments=capManualDays(days,{'2026-10-06':19800,'2026-10-07':3600});
 assert.deepEqual(segments.map(s=>s.seconds),[1800,18000]);
 assert.equal(segments[0].end,start+1800000);
 assert.deepEqual(capManualDays(days,{'2026-10-06':21600,'2026-10-07':21600}).map(s=>s.seconds),[0,0]);
});
test('manual validation cannot revive capped live time',async()=>{
 const {settleManualClock}=await import('../worker/manual-validation.ts');
 const document={fields:Object.fromEntries(Object.entries({uid:'alice',active:true,lastTick:new Date(now-60000).toISOString(),stretchStart:now-14400000,...{dayStart:now-43200000,weekStart:now-43200000,monthStart:now-43200000,daySeconds:10800,weekSeconds:10800,monthSeconds:10800}}).map(([k,v])=>[k,typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:k==='lastTick'?{timestampValue:v}:{stringValue:v}]))};
 assert.equal(settleManualClock(document,'alice','UTC',now).daySeconds,10800);
});
test('approved manual credit commits only the remaining daily allowance atomically',async()=>{
 const {commitValidation}=await import('../worker/manual-validation.ts');const original=globalThis.fetch;
 const twoHours={...session,startTime:now-7200000,durationSeconds:7200};
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);
  if(url.endsWith(':beginTransaction'))return Response.json({transaction:'cap-transaction'});
  if(url.includes('/manual_daily_credit/'))return Response.json({fields:{seconds:{integerValue:'18000'}},updateTime:'2026-10-07T01:00:00Z'});
  if(url.endsWith(':commit')){const writes=JSON.parse(String(init?.body)).writes;assert.equal(writes[0].update.fields.creditedSeconds.integerValue,'3600');assert.equal(writes[0].update.fields.capped.booleanValue,true);assert.equal(writes[1].update.fields.seconds.integerValue,'21600');assert.equal(writes[1].currentDocument.updateTime,'2026-10-07T01:00:00Z');assert.equal(JSON.parse(String(init?.body)).transaction,'cap-transaction');return Response.json({});}
  return new Response('{}',{status:404});
 }) as typeof fetch;
 try{const result=await commitValidation('https://firestore.googleapis.com/v1/projects/test/databases/(default)/documents','token','alice',twoHours,{status:'approved',reason:'Plausible practice'},'Asia/Kolkata');assert.equal(result.creditedSeconds,3600);}finally{globalThis.fetch=original;}
});
test('manual settlement respects the server countdown deadline during laptop sleep',async()=>{
 const {settleManualClock}=await import('../worker/manual-validation.ts');
 const data={uid:'alice',active:true,lastTick:new Date(now-1800000).toISOString(),stretchStart:now-1800000,creditUntil:now-1200000,serverManaged:true,dayStart:now-43200000,weekStart:now-43200000,monthStart:now-43200000,daySeconds:0,weekSeconds:0,monthSeconds:0};
 const document={fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:k==='lastTick'?{timestampValue:v}:{stringValue:v}]))};
 const next=settleManualClock(document,'alice','UTC',now);assert.equal(next.daySeconds,600);assert.equal(next.serverManaged,true);
});
