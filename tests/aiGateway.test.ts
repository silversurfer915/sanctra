import {gatewayHarness,testServiceAccount} from './helpers/aiGatewayHarness.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';import worker from '../worker/ai-gateway.ts';
const env={GEMINI_API_KEY:'test-only',FIREBASE_PROJECT_ID:'demo-sanctra',ALLOWED_ORIGIN:'https://sanctrastudy.live',FIREBASE_SERVICE_ACCOUNT:testServiceAccount};
test('empty gateway requests are refused before allowance or provider calls',async()=>{const r=await worker.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,authorization:'Bearer test'},body:JSON.stringify({mode:'chat',instructions:''})}),env);assert.equal(r.status,400);});
test('foreign origins and missing server credentials cannot invoke generation',async()=>{assert.equal((await worker.fetch(new Request('https://gateway.test',{method:'POST'}),env)).status,403);assert.equal((await worker.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN}}),{...env,GEMINI_API_KEY:''})).status,503);});
test('gateway reserves a version-checked increment before generation and retries concurrent conflicts',async()=>{
 const original=globalThis.fetch;let commits=0,generated=0;
 globalThis.fetch=gatewayHarness(async(input,init)=>{const url=String(input);
  if(url.includes('/ai_days/'))return Response.json({updateTime:'2026-10-04T00:00:00Z',fields:{count:{integerValue:'1'}}});
  if(url.endsWith(':commit')){commits++;const write=JSON.parse(String(init?.body)).writes[0];assert.deepEqual(write.currentDocument,{updateTime:'2026-10-04T00:00:00Z'});assert.equal(write.update.fields.count.integerValue,'2');return new Response('{}',{status:commits===1?409:200});}
  if(url.includes('/ai_config/')||url.includes('/ai_access/'))return new Response('{}',{status:404});
  generated++;assert.equal(commits,2);return Response.json({candidates:[{content:{parts:[{text:'Schedule only'}]}}]});
 });
 try{const token='header.'+Buffer.from(JSON.stringify({sub:'member'})).toString('base64url')+'.signature';const r=await worker.fetch(new Request('https://gateway.test',{method:'POST',headers:{origin:env.ALLOWED_ORIGIN,authorization:'Bearer '+token},body:JSON.stringify({mode:'chat',instructions:'Plan my tasks'})}),env);assert.equal(r.status,200);assert.equal(generated,1);}finally{globalThis.fetch=original;}
});
