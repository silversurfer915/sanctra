import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../worker/ai-gateway.ts';
import {gatewayHarness,testServiceAccount} from './helpers/aiGatewayHarness.ts';
import {JEE_COACH_REQUEST,parseJeeCoachResponse} from '../src/utils/jeeAI.ts';

test('JEE coaching uses existing chat gateway without assistant envelope rewriting and reserves shared allowance once',async()=>{
 const original=globalThis.fetch;
 let modelRequest: any, allowanceWrites=0, generations=0;
 const coaching={summary:'One recorded mock cannot establish a trend.',strengths:[],gaps:[{title:'Trend unknown',evidence:'One recorded mock',advice:'Compare another full syllabus mock.'}],actions:[{day:1,task:'Review errors from the recorded mock',reason:'The context contains one mock'}]};
 globalThis.fetch=gatewayHarness((async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(input);
   if(url.includes('generativelanguage.googleapis.com')) {generations++;modelRequest=JSON.parse(String(init?.body));return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(coaching)}]}}]});}
   if(url.endsWith(':commit')) {const writes=JSON.parse(String(init?.body)).writes;if(writes[0]?.update?.name?.includes('/ai_days/'))allowanceWrites++;return Response.json({writeResults:[]});}
   return new Response('{}',{status:404});
 }) as typeof fetch);
 try {
   const token=`header.${btoa(JSON.stringify({sub:'jee-coach-fixture'}))}.signature`;
   const response=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'chat',instructions:JEE_COACH_REQUEST,context:{today:'2026-10-11',tests:[{date:'2026-10-10',exam:'mains',type:'full',total:100,max:300}],hasRecordedProgress:true}})}),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});
   assert.equal(response.status,200);assert.equal(generations,1);assert.equal(allowanceWrites,1);
   const data=await response.json();assert.equal(parseJeeCoachResponse(data.text).summary,coaching.summary);
   assert.match(modelRequest.contents[0].parts[0].text,/Test percentage is NOT percentile/);
   assert.match(modelRequest.contents[0].parts[0].text,/"max":300/);
   assert.doesNotMatch(modelRequest.systemInstruction.parts[0].text,/Return ONLY JSON \{"reply"/);
 }finally {globalThis.fetch=original;}
});
