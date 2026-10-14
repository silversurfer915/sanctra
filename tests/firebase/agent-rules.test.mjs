import {readFile} from 'node:fs/promises';
import {test,before,after} from 'node:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-sanctra-agent',firestore:{rules:await readFile('firestore.rules','utf8')}});await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'admins','owner'),{enabled:true});await setDoc(doc(c.firestore(),'support_tickets','ticket'),{ownerUid:'owner',ownerName:'Owner',title:'Help',category:'question',status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});});});
after(async()=>env?.cleanup());
test('all agent credential, slot, rate, receipt and audit records reject every browser identity',async()=>{
 for(const context of [env.unauthenticatedContext(),env.authenticatedContext('alice'),env.authenticatedContext('owner')])for(const path of ['agent_grants/g','agent_owner_slots/owner','agent_rate_limits/g','agent_operations/g/receipts/op','agent_management/owner/receipts/op','agent_audit/a']){
  await assertFails(setDoc(doc(context.firestore(),path),{secretHash:'forged',createdAt:serverTimestamp()}));await assertFails(getDoc(doc(context.firestore(),path)));
 }
});
test('browser support reply remains allowed but cannot spoof agent attribution',async()=>{
 const db=env.authenticatedContext('owner').firestore(),message={senderUid:'owner',senderName:'Owner',text:'Hello',createdAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(db,'support_tickets/ticket/messages/browser'),message));
 await assertFails(setDoc(doc(db,'support_tickets/ticket/messages/forged'),{...message,channel:'agent',agentGrantId:'g'}));
});
