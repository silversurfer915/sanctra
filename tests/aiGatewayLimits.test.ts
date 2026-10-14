import {gatewayHarness,testServiceAccount} from './helpers/aiGatewayHarness.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../worker/ai-gateway.ts';

test('gateway accepts a general chat and leaves output tokens to the model default',async()=>{
 const original=globalThis.fetch;
 let modelRequest:any;
 globalThis.fetch=gatewayHarness((async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.includes('generativelanguage.googleapis.com')){
   modelRequest=JSON.parse(String(init?.body));
   return Response.json({candidates:[{content:{parts:[{text:'General answer'}]}}]});
  }
  if(url.endsWith(':commit'))return Response.json({writeResults:[]});
  return new Response('{}',{status:404});
 }) as typeof fetch);
 try{
  const token=`header.${btoa(JSON.stringify({sub:'test-user'}))}.signature`;
  const response=await gateway.fetch(new Request('https://gateway.test',{
   method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},
   body:JSON.stringify({mode:'chat',instructions:'Explain entropy',context:{}}),
  }),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test-project',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});
  assert.equal(response.status,200);
  assert.equal((await response.json() as {text:string}).text,'General answer');
  assert.equal(modelRequest.generationConfig.maxOutputTokens,undefined);
  assert.doesNotMatch(modelRequest.systemInstruction.parts[0].text,/Do not teach subjects|at most 60 words/);
 }finally{globalThis.fetch=original;}
});

test('manual extraction reserves the same shared allowance before schema-only generation',async()=>{
 const original=globalThis.fetch;let reserved=false;
 globalThis.fetch=gatewayHarness((async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.endsWith(':commit')){reserved=true;assert.equal(JSON.parse(String(init?.body)).writes[0].update.fields.count.integerValue,'1');return Response.json({});}
  if(url.includes('generativelanguage.googleapis.com')){assert.ok(reserved);const body=JSON.parse(String(init?.body));assert.match(body.systemInstruction.parts[0].text,/finished past study session/);assert.equal(body.generationConfig.responseMimeType,'application/json');return Response.json({candidates:[{content:{parts:[{text:'{"question":null,"session":null}'}]}}]});}
  return new Response('{}',{status:404});
 }) as typeof fetch);
 try{const token=`header.${btoa(JSON.stringify({sub:'test-user'}))}.signature`;const response=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'manual-session',instructions:'Yesterday at 6 pm studied physics for 50 minutes',context:{}})}),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test-project',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});assert.equal(response.status,200);}finally{globalThis.fetch=original;}
});

test('previous manual verdict returns before quota or generation; unsaved entries cannot earn credit',async()=>{
 const original=globalThis.fetch;let requests=0;
 const session={id:'sess-manual-ai-retry',source:'ai-manual',startTime:Date.now()-60000,endTime:Date.now(),durationSeconds:60,notes:'Physics revision'};session.startTime=session.endTime-60000;
 const {candidateFingerprint}=await import('../worker/manual-validation.ts');const fingerprint=await candidateFingerprint(session as any);
 const token=`header.${btoa(JSON.stringify({sub:'test-user'}))}.signature`,make=()=>new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'validate-session',instructions:'Check this session.',context:{session,timezone:'UTC'}})});
 const env={GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test-project',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:'configured'};
 globalThis.fetch=(async()=>{requests++;return Response.json({fields:{status:{stringValue:'approved'},fingerprint:{stringValue:fingerprint},reason:{stringValue:'Plausible study'}}});}) as typeof fetch;
 try{const prior=await gateway.fetch(make(),env);assert.equal(prior.status,200);assert.equal(requests,3);
 globalThis.fetch=(async(input:RequestInfo|URL)=>{assert.doesNotMatch(String(input),/ai_days|generativelanguage|:commit/);return new Response('{}',{status:404});}) as typeof fetch;
 const unsaved=await gateway.fetch(make(),env);assert.equal(unsaved.status,400);
 }finally{globalThis.fetch=original;}
});
test('global AI maintenance blocks generation before taking a daily message',async()=>{
 const original=fetch;globalThis.fetch=(async(input:any)=>{const url=String(input);assert.doesNotMatch(url,/ai_days|generativelanguage|:commit/);return url.includes('ai_config')?Response.json({fields:{enabled:{booleanValue:false},maintenanceMessage:{stringValue:'Maintenance until tonight'}}}):new Response('{}',{status:404});}) as typeof fetch;
 try{const token=`header.${btoa(JSON.stringify({sub:'alice'}))}.signature`;const r=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'chat',instructions:'Plan today'})}),{GEMINI_API_KEY:'test',FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});assert.equal(r.status,503);assert.equal((await r.json() as any).message,'Maintenance until tonight');}finally{globalThis.fetch=original;}
});
test('runtime model override is used and disabled manual logging cannot leak through chat',async()=>{
 const original=fetch;let modelUrl='';
 globalThis.fetch=gatewayHarness((async(input:any)=>{const url=String(input);
  if(url.includes('/ai_config/'))return Response.json({fields:{model:{stringValue:'gemini-admin-selected'},manualEnabled:{booleanValue:false}}});
  if(url.endsWith(':commit'))return Response.json({});
  if(url.includes('generativelanguage')){modelUrl=url;return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Saved it',plan:null,sessions:[{notes:'should not leak'}]})}]}}]});}
  return new Response('{}',{status:404});
 }) as typeof fetch);
 try{const token=`header.${btoa(JSON.stringify({sub:'alice'}))}.signature`;const r=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'assistant',instructions:'Log past study'})}),{GEMINI_API_KEY:'test',FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});assert.equal(r.status,200);assert.match(modelUrl,/gemini-admin-selected:generateContent/);const result=JSON.parse((await r.json() as any).text);assert.deepEqual(result.sessions,[]);assert.match(result.reply,/paused/);}finally{globalThis.fetch=original;}
});
