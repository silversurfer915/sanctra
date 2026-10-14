import {groupMentionParts} from '../src/utils/groupConversation.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {composeGroupReply,filterGroupMessages} from '../src/utils/groupConversation.ts';

test('quoted replies remain readable by older clients without adding message fields',()=>{
 assert.equal(composeGroupReply('  I’ll join after lunch. ',{senderName:'Maya',text:'Working on calculus\ntoday.'}),'↳ Maya: Working on calculus today.\nI’ll join after lunch.');
});
test('long reply metadata leaves room inside the existing message allowance',()=>{
 const result=composeGroupReply('Thanks!',{senderName:'A'.repeat(100),text:'B'.repeat(200)});
 assert.ok(result.length<200);
 assert.equal(result.split('\n')[1],'Thanks!');
});
test('message search matches names and text without changing message order or source',()=>{
 const messages=[{senderName:'Maya',text:'Calculus today'},{senderName:'Alex',text:'Physics revision'},{senderName:'MAYA',text:'Finished!'}];
 assert.deepEqual(filterGroupMessages(messages,' maya '),[messages[0],messages[2]]);
 assert.deepEqual(filterGroupMessages(messages,'PHYSICS'),[messages[1]]);
 assert.deepEqual(filterGroupMessages(messages,'biology'),[]);
 assert.equal(filterGroupMessages(messages,'  '),messages);
 assert.equal(messages.length,3);
});

test('mentions match full names without also matching a shorter member name',async()=>{
 const {groupMentionUids}=await import('../src/utils/groupConversation.ts');
 const members=[{uid:'a',displayName:'Alex'},{uid:'b',displayName:'Alex Smith'}];
 assert.deepEqual(groupMentionUids('Hi @Alex Smith, ready?',members),['b']);
 assert.deepEqual(groupMentionUids('Hi @Alexandra',members),[]);
 assert.deepEqual(groupMentionUids('@Alex! @Alex',members),['a']);
});

test('chat grouping keeps different senders, days and system events distinct',async()=>{
 const {canGroupChatMessages}=await import('../src/utils/groupConversation.ts');
 const timestamp=new Date(2026,9,11,12).getTime();
 const previous={senderUid:'maya',timestamp,type:'chat' as const};
 assert.equal(canGroupChatMessages(previous,{...previous,timestamp:timestamp+60_000}),true);
 assert.equal(canGroupChatMessages(previous,{...previous,senderUid:'alex'}),false);
 assert.equal(canGroupChatMessages(previous,{...previous,type:'system'}),false);
 assert.equal(canGroupChatMessages(previous,{...previous,timestamp:timestamp+300_000}),false);
 assert.equal(canGroupChatMessages(previous,{...previous,timestamp:timestamp-1}),false);
 const midnight=new Date(2026,9,12,0,0).getTime();
 assert.equal(canGroupChatMessages({...previous,timestamp:midnight-60_000},{...previous,timestamp:midnight}),false);
});

test('reply display extracts the existing envelope while preserving ordinary text',async()=>{
 const {splitGroupReply}=await import('../src/utils/groupConversation.ts');
 assert.deepEqual(splitGroupReply(composeGroupReply('Yes!\nStarting now.',{senderName:'Maya Chen',text:'Integration today?'})),{quote:{name:'Maya Chen',text:'Integration today?'},body:'Yes!\nStarting now.'});
 for(const text of ['Hello!','↳ Just an arrow','↳ Maya: no newline'])assert.deepEqual(splitGroupReply(text),{quote:null,body:text});
});

test('mention display preserves text and matches longest full member name',()=>{
 const text='Hi @Alex Smith, meet @Alex! @Alexandra is not a mention.';
 const parts=groupMentionParts(text,[{uid:'short',displayName:'Alex'},{uid:'long',displayName:'Alex Smith'}]);
 assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.uid).map(p=>p.uid),['long','short']);
 assert.deepEqual(groupMentionParts('No mentions',[]),[{text:'No mentions'}]);
});
