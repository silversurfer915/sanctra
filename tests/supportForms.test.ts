import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupportMessage, supportCategories } from '../src/utils/supportForms.ts';
test('seven categories including Plus purchases provide their own required fields and helpful FAQ',()=>{
 assert.deepEqual(supportCategories.map(c=>c.id),['issue','suggestion','account','timer','appeal','other','premium']);
 for(const c of supportCategories){assert.ok(c.fields.length);assert.ok(c.faq.length);}
});
test('bug report retains expected behaviour and environment in the initial message',()=>{
 const message=buildSupportMessage('issue',{happened:'Button failed',expected:'Panel opens',device:'iPad / Safari',screenshot:'https://example.com/screen.png'});
 assert.match(message,/What happened\nButton failed/);assert.match(message,/What you expected\nPanel opens/);assert.match(message,/Device and browser\niPad \/ Safari/);assert.match(message,/https:\/\/example.com/);
});
test('missing required fields, unsafe links and oversized messages are rejected',()=>{
 assert.throws(()=>buildSupportMessage('appeal',{session:'Yesterday'}),/Why/);
 assert.throws(()=>buildSupportMessage('issue',{happened:'Bug',expected:'Work',device:'Mac',screenshot:'javascript:alert(1)'}),/https/);
 assert.throws(()=>buildSupportMessage('other',{details:'x'.repeat(5001)}),/5,000/);
});
test('optional screenshots and whitespace do not create empty fields',()=>{
 assert.equal(buildSupportMessage('suggestion',{want:'  Calendar widget  ',benefit:'Saves time'}),'What would you like?\nCalendar widget\n\nWhy would it help?\nSaves time');
});

test('a new reply or status update surfaces as unread without duplicating the ticket',async()=>{
 const {supportInboxNotice}=await import('../src/utils/supportInbox.ts');
 const {Timestamp}=await import('firebase/firestore');
 const ticket={id:'one',ownerUid:'member',ownerName:'Member',title:'Session help',category:'timer',status:'open' as const,createdAt:Timestamp.fromMillis(1000),updatedAt:Timestamp.fromMillis(1000)};
 const original=supportInboxNotice(ticket),updated=supportInboxNotice({...ticket,status:'in_progress',updatedAt:Timestamp.fromMillis(2000)});
 assert.equal(original.ticketId,updated.ticketId);assert.notEqual(original.id,updated.id);assert.match(updated.text,/Timer \/ session issue · In progress/);
});

test('Plus purchase requests include plan, request and optional payment proof',()=>{
 const message=buildSupportMessage('premium',{plan:'Annual',details:'Please renew my Plus membership',payment:'Paid today, reference ABC',screenshot:'https://example.com/receipt.png'});
 assert.match(message,/Preferred plan\nAnnual/);assert.match(message,/Purchase, renewal or billing request\nPlease renew/);assert.match(message,/Payment details\nPaid today/);assert.match(message,/Payment proof link\nhttps:/);
 assert.throws(()=>buildSupportMessage('premium',{plan:'Annual'}),/request is required/);
});
