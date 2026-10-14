import test from 'node:test';
import assert from 'node:assert/strict';
import {issuePersonalToken, matchesPersonalToken, verifyOwnerIdentity} from '../worker/personal-auth.ts';

test('personal tokens are random, stored hashed and revocation changes the accepted secret', async()=>{
 const first=await issuePersonalToken(),second=await issuePersonalToken();
 assert.notEqual(first.token,second.token);
 assert.ok(!JSON.stringify(first.record).includes(first.token));
 assert.equal(await matchesPersonalToken(first.token,first.record),true);
 assert.equal(await matchesPersonalToken(first.token,second.record),false);
 assert.equal(await matchesPersonalToken(second.token,{...second.record,revoked:true}),false);
 assert.equal(await matchesPersonalToken('bad',first.record),false);
});
test('owner authentication verifies signature, audience and exact owner identity', async()=>{
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 async function sign(sub:string,aud='test-project',provider='google.com') {
  const message=encode({alg:'RS256',kid:'test'})+'.'+encode({sub,aud,iss:'https://securetoken.google.com/test-project',exp:now+3600,iat:now,auth_time:now,firebase:{sign_in_provider:provider}});
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(message));
  return message+'.'+Buffer.from(signature).toString('base64url');
 }
 const fetchKeys=async()=>new Response(JSON.stringify({keys:[{...jwk,kid:'test'}]}),{headers:{'content-type':'application/json'}});
 assert.equal((await verifyOwnerIdentity(await sign('owner'),'test-project','owner',fetchKeys)).uid,'owner');
 await assert.rejects(verifyOwnerIdentity(await sign('other'),'test-project','owner',fetchKeys));
 await assert.rejects(verifyOwnerIdentity(await sign('owner','test-project','anonymous'),'test-project','owner',fetchKeys));
 await assert.rejects(verifyOwnerIdentity(await sign('owner','other-project'),'test-project','owner',fetchKeys));
 const original=await sign('owner');
 const forged=original.replace(original.split('.')[1],encode({sub:'owner',aud:'test-project',iss:'https://securetoken.google.com/test-project',exp:now+999999,iat:now,auth_time:now}));
 await assert.rejects(verifyOwnerIdentity(forged,'test-project','owner',fetchKeys));
});
