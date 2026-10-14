import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrantClient, GrantError} from '../src/utils/agentGrantService.ts';
const grant={id:'fake',label:'Hermes',creatorUid:'owner',scopes:['users:read'],createdAt:1,expiresAt:null,revokedAt:null,version:'v1'};
test('Firebase management envelope strips private fields and passes cursor',async()=>{
 let request:Request|undefined;
 const client=createGrantClient(async()=> 'firebase-id-token',async(input,init)=>{request=new Request(input,init);return Response.json({apiVersion:'1',data:{grants:[{...grant,secretHash:'private',token:'private'}]},nextCursor:'next'});});
 const result=await client.list('owner','cursor');assert.equal(result.nextCursor,'next');assert.deepEqual(result.grants,[grant]);assert.equal(request?.headers.get('authorization'),'Bearer firebase-id-token');assert.match(request!.url,/cursor=cursor/);
});
test('preserves stale authentication and conflict errors',async()=>{
 for(const code of ['reauthentication_required','forbidden','conflict']){
 const client=createGrantClient(async()=> 'firebase',async()=>Response.json({apiVersion:'1',error:{code,message:'Reload safely',retryable:false}},{status:409}));
 await assert.rejects(client.list('owner'),(error:unknown)=>error instanceof GrantError&&error.code===code);
 }
});
test('Worker ISO timestamps normalize to UI milliseconds with null and legacy expiry',async()=>{
 const wire={...grant,createdAt:'2026-10-13T00:00:00.000Z',expiresAt:'2026-10-14T00:00:00.000Z',revokedAt:'2026-10-13T01:00:00.000Z'};
 const client=createGrantClient(async()=> 'firebase',async()=>Response.json({apiVersion:'1',data:{grants:[wire,{...wire,id:'null',expiresAt:null,revokedAt:null},{...wire,id:'expired',expiresAt:'2020-01-01T00:00:00.000Z',revokedAt:null}]}}));
 const result=await client.list('owner');assert.equal(result.grants[0].createdAt,Date.parse(wire.createdAt));assert.equal(result.grants[0].expiresAt,Date.parse(wire.expiresAt));assert.equal(result.grants[0].revokedAt,Date.parse(wire.revokedAt));assert.equal(result.grants[1].expiresAt,null);assert.ok(result.grants[2].expiresAt!<Date.now());
});
test('malformed successful issue/rotate is uncertain with one fetch and recovery instruction',async()=>{
 const malformed=[{}, {grant:null}, {grant,token:''}, {grant,token:'secret',secretUnavailable:true}, {grant:{...grant,createdAt:'bad'},token:'secret'}, {grant:{...grant,scopes:'users:read'},token:'secret'}];
 for(const data of malformed){for(const kind of ['create','rotate'] as const){let calls=0;const client=createGrantClient(async()=> 'firebase',async()=>{calls++;return Response.json({apiVersion:'1',data});});
 const input={label:'Hermes',scopes:['users:read'],operationId:'op',reason:'Connect'};
 await assert.rejects(kind==='create'?client.create('owner',input):client.rotate('owner',grant,input),(error:unknown)=>error instanceof GrantError&&error.code==='issuance_uncertain'&&/revoke.*issue/i.test(error.message));assert.equal(calls,1);}}
});
test('malformed list/revoke responses fail with controlled unavailable errors',async()=>{
 for(const data of [{},{grants:[{...grant,expiresAt:'invalid'}]},{grant:null}]){const client=createGrantClient(async()=> 'firebase',async()=>Response.json({apiVersion:'1',data}));for(const operation of [()=>client.list('owner'),()=>client.revoke('owner',grant,'op','Revoke')])await assert.rejects(operation(),(error:unknown)=>error instanceof GrantError&&error.code==='unavailable');}
});
test('valid Worker issuance normalizes ISO grant and enforces label bound before fetch',async()=>{
 let calls=0;const token='sanctra_agent_'+ 'F'.repeat(22)+'.'+'P'.repeat(43);
 const client=createGrantClient(async()=> 'firebase',async()=>{calls++;return Response.json({apiVersion:'1',data:{grant:{...grant,createdAt:'2026-10-13T00:00:00.000Z'},token}});});
 const input={label:'Hermes',scopes:['users:read'],operationId:'op',reason:'Connect'};
 assert.equal((await client.create('owner',input)).token,token);assert.equal(calls,1);
 await assert.rejects(client.create('owner',{...input,label:'x'.repeat(101)}),(error:unknown)=>error instanceof GrantError&&error.code==='validation');assert.equal(calls,1);
});
test('null terminal cursor from Worker becomes no next page',async()=>{
 const client=createGrantClient(async()=> 'firebase',async()=>Response.json({apiVersion:'1',data:{grants:[]},nextCursor:null}));assert.deepEqual(await client.list('owner'),{grants:[]});
});
test('lost issuance is never retried and replay never invents a secret',async()=>{
 let calls=0;const input={label:'Hermes',scopes:['users:read'],operationId:'op',reason:'Connect Hermes'};
 const client=createGrantClient(async()=> 'firebase',async()=>{calls++;throw Error('lost');});
 await assert.rejects(client.create('owner',input),(error:unknown)=>error instanceof GrantError&&error.code==='issuance_uncertain');assert.equal(calls,1);
 const replay=createGrantClient(async()=> 'firebase',async()=>Response.json({apiVersion:'1',data:{grant,secretUnavailable:true}}));
 assert.deepEqual(await replay.create('owner',input),{grant,secretUnavailable:true});
});
test('agent bearer cannot enter browser management client',async()=>{
 let calls=0;const client=createGrantClient(async()=> 'sanctra_agent_fake.secret',async()=>{calls++;return Response.json({});});
 await assert.rejects(client.list('owner'));assert.equal(calls,0);
});
test('revoke and rotate use observed grant version and revoke strips secrets',async()=>{
 const bodies:unknown[]=[];
 const client=createGrantClient(async()=> 'firebase',async(_input,init)=>{bodies.push(JSON.parse(String(init?.body)));return Response.json({apiVersion:'1',data:{grant:{...grant,secretHash:'private'},secretUnavailable:true}});});
 assert.deepEqual(await client.revoke('owner',grant,'revoke-op','Retired host'),grant);
 await client.rotate('owner',grant,{label:'Hermes',scopes:['users:read'],operationId:'rotate-op',reason:'Rotate access'});
 assert.deepEqual(bodies[0],{operationId:'revoke-op',reason:'Retired host',expectedVersions:{grant:'v1'}});
 assert.deepEqual((bodies[1] as {expectedVersions:unknown}).expectedVersions,{grant:'v1'});
 assert.equal('expiresInDays' in (bodies[1] as object),false);
});
