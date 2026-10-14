import {test} from 'node:test';import assert from 'node:assert/strict';
import {aiConfig,aiAccess,aiBlocked,estimatedCostMicros} from '../src/features/ai-admin/config.ts';
import {reserveAiRate,recordAiUsage,readAiControls} from '../worker/ai-admin.ts';
test('kill switch, individual access and feature flags block their exact features',()=>{
 const config=aiConfig(),access=aiAccess();assert.equal(aiBlocked(config,access,'plan'),null);
 assert.equal(aiBlocked({...config,enabled:false,maintenanceMessage:'Back soon'},access,'plan'),'Back soon');
 assert.match(aiBlocked(config,{...access,enabled:false},'chat')!,/account/);
 assert.match(aiBlocked({...config,chatEnabled:false},access,'assistant')!,/chat/);
 assert.equal(aiBlocked({...config,chatEnabled:false},access,'plan'),null);
 assert.match(aiBlocked({...config,manualEnabled:false},access,'manual-session')!,/logging/);
 assert.match(aiBlocked({...config,validationEnabled:false},access,'validate-session')!,/validation/);
});
test('cost uses configured prices and includes no guessed billing rates',()=>{
 assert.equal(estimatedCostMicros(1000,500,aiConfig({inputPricePerMillion:0.25,outputPricePerMillion:1.5})),1000);
 assert.equal(estimatedCostMicros(1000,500,aiConfig()),0);
});
test('per-user rate limit is shared, cannot be bypassed by CAS races',async()=>{
 const original=fetch;let commits=0;const now=Date.now();
 globalThis.fetch=(async(input:any,init:any)=>{if(String(input).endsWith(':commit')){commits++;assert.equal(JSON.parse(init.body).writes[0].currentDocument.updateTime,'old');return new Response('{}',{status:409});}return Response.json({updateTime:'old',fields:{windowStart:{integerValue:String(Math.floor(now/60000))},windowCount:{integerValue:'1'}}});}) as typeof fetch;
 try{assert.equal(await reserveAiRate('https://firestore/v1/projects/test/databases/(default)/documents','token','alice',aiConfig(),aiAccess({requestsPerMinute:1}),now),null);assert.equal(commits,0);await assert.rejects(()=>reserveAiRate('https://firestore/v1/projects/test/databases/(default)/documents','token','alice',aiConfig(),aiAccess(),now),/busy/);assert.equal(commits,5);}finally{globalThis.fetch=original;}
});
test('usage records real provider tokens including thinking and server-only cost increments',async()=>{
 const original=fetch;globalThis.fetch=(async(_input:any,init:any)=>{const write=JSON.parse(init.body).writes[0];const values=Object.fromEntries(write.updateTransforms.filter((x:any)=>x.increment).map((x:any)=>[x.fieldPath,Number(x.increment.integerValue)]));assert.deepEqual(values,{requests:1,completed:1,failed:0,inputTokens:1000,outputTokens:500,costMicros:1000});return Response.json({});}) as typeof fetch;
 try{await recordAiUsage('base','token','name',aiConfig({inputPricePerMillion:.25,outputPricePerMillion:1.5}),'model',{usageMetadata:{promptTokenCount:1000,candidatesTokenCount:400,thoughtsTokenCount:100}},true);}finally{globalThis.fetch=original;}
});
test('controls cannot accept invalid authentication or silently ignore unavailable config',async()=>{
 const original=fetch;globalThis.fetch=(async()=>new Response('{}',{status:403})) as typeof fetch;
 try{await assert.rejects(()=>readAiControls('base','invalid','alice','plan'),/Reconnect/);}finally{globalThis.fetch=original;}
});
test('model listing requires Firestore-verified admin and filters non-generation models',async()=>{
 const {listAiModels}=await import('../worker/ai-admin.ts');const original=fetch;
 globalThis.fetch=(async(input:any)=>String(input).includes('/admins/')?new Response('{}',{status:404}):Response.json({models:[]})) as typeof fetch;
 try{await assert.rejects(()=>listAiModels('base','member','alice','key'),/administrator/);
 globalThis.fetch=(async(input:any)=>String(input).includes('/admins/')?Response.json({fields:{enabled:{booleanValue:true}}}):Response.json({models:[{name:'models/gemini-test',displayName:'Test',supportedGenerationMethods:['generateContent']},{name:'models/embedding',supportedGenerationMethods:['embedContent']}]})) as typeof fetch;
 assert.deepEqual(await listAiModels('base','admin','alice','key'),[{name:'gemini-test',displayName:'Test'}]);}finally{globalThis.fetch=original;}
});
test('usage receipt prevents double accounting after a lost commit response',async()=>{
 const original=fetch;let commits=0;globalThis.fetch=(async(input:any)=>{if(String(input).endsWith(':commit')){commits++;throw Error('lost response');}return Response.json({fields:{model:{stringValue:'gemini-test'}}});}) as typeof fetch;
 try{await recordAiUsage('https://firestore.googleapis.com/v1/projects/test/databases/(default)/documents','token','projects/test/databases/(default)/documents/ai_usage_days/1/users/alice',aiConfig(),'gemini-test',{},true,'receipt-test');assert.equal(commits,1);}finally{globalThis.fetch=original;}
});
