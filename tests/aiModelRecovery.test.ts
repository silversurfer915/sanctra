import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../worker/ai-gateway.ts';
import {gatewayHarness,testServiceAccount} from './helpers/aiGatewayHarness.ts';

for(const scenario of ['recover','model-unsupported','invalid-key','both-missing','forbidden','working'] as const){
 test(`generation model recovery: ${scenario}`,async()=>{
  const original=fetch,models:string[]=[],signals:unknown[]=[],recordedModels:string[]=[];let reservations=0;
  const harness=gatewayHarness((async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);
   if(url.includes('/ai_config/'))return Response.json({fields:{model:{stringValue:'gemini-selected'}}});
   if(url.endsWith(':commit')){reservations++;return Response.json({});}
   if(url.includes('generativelanguage')){
    models.push(url.split('/models/')[1].split(':')[0]);signals.push(init?.signal);
    const status=scenario==='working'?200:models.length===1?(scenario==='forbidden'?403:scenario==='invalid-key'||scenario==='model-unsupported'?400:404):scenario==='both-missing'?404:200;
    const message=scenario==='invalid-key'?'API key not valid.':scenario==='model-unsupported'?'JSON response MIME type is not supported by this model.':'';
    return Response.json(status===200?{candidates:[{content:{parts:[{text:'Recovered answer'}]}}]}:{error:{code:status,message}},{status});
   }
   return new Response('{}',{status:404});
  }) as typeof fetch);
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
   if(String(input).endsWith(':commit')){
    const fields=JSON.parse(String(init?.body)).writes[0]?.update?.fields;
    if(fields?.model)recordedModels.push(fields.model.stringValue);
   }
   return harness(input,init);
  }) as typeof fetch;
  try{
   const token=`header.${btoa(JSON.stringify({sub:'test-user'}))}.signature`;
   const result=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'chat',instructions:'Hello'})}),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test-project',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});
   assert.equal(reservations,1,'a fallback must not use another daily message');
   assert.deepEqual(models,['recover','model-unsupported','both-missing'].includes(scenario)?['gemini-selected','gemini-3.5-flash-lite']:['gemini-selected']);
   assert.deepEqual(recordedModels,models,'usage records every actual provider attempt');
   if(models.length===2)assert.equal(signals[0],signals[1],'attempts share one generation deadline');
   assert.equal(result.status,['recover','model-unsupported','working'].includes(scenario)?200:503);
   const body=await result.json() as any;
   if(result.status===200)assert.equal(body.text,'Recovered answer');
   else assert.match(body.message,scenario==='both-missing'?/model.*unavailable/i:/connection.*needs attention/i);
  }finally{globalThis.fetch=original;}
 });
}
