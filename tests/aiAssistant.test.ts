import {gatewayHarness,testServiceAccount} from './helpers/aiGatewayHarness.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../worker/ai-gateway.ts';

test('assistant sends a plan photo and text in one generation and one allowance increment',async()=>{
 const original=globalThis.fetch;let modelRequest:any,commits=0,generations=0;
 globalThis.fetch=gatewayHarness((async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.includes('generativelanguage.googleapis.com')){generations++;modelRequest=JSON.parse(String(init?.body));return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Review these tasks.',plan:null})}]}}]});}
  if(url.endsWith(':commit')){commits++;return Response.json({writeResults:[]});}
  return new Response('{}',{status:404});
 }) as typeof fetch);
 try {
  const token=`header.${btoa(JSON.stringify({sub:'fixture'}))}.signature`;
  const result=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'assistant',instructions:'Make tasks from this plan',context:{},image:{mimeType:'image/jpeg',data:'/9j/2Q=='}})}),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});
  assert.equal(result.status,200);
  assert.equal(generations,1);assert.equal(commits,1);
  assert.deepEqual(modelRequest.contents[0].parts[1],{inlineData:{mimeType:'image/jpeg',data:'/9j/2Q=='}});
  assert.equal(modelRequest.generationConfig.responseMimeType,'application/json');
  assert.equal(modelRequest.generationConfig.maxOutputTokens,undefined);
 } finally {globalThis.fetch=original;}
});

test('unsupported image data is rejected before spending an allowance',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=(async()=>{calls++;return new Response('{}',{status:404});}) as typeof fetch;
 try {
  const token=`header.${btoa(JSON.stringify({sub:'fixture'}))}.signature`;
  const result=await gateway.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:'https://sanctrastudy.live',authorization:`Bearer ${token}`},body:JSON.stringify({mode:'assistant',instructions:'Read this',image:{mimeType:'image/svg+xml',data:'PHN2Zz4='}})}),{GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'test',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount});
  assert.equal(result.status,400);assert.equal(calls,0);
 }finally {globalThis.fetch=original;}
});
