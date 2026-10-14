import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendRoomMessage } from '../src/utils/roomMessages.ts';
test('a server echo and send completion produce only one message',()=>{
 assert.deepEqual(appendRoomMessage([{id:'a',text:'old'},{id:'b',text:'hello'}],{id:'b',text:'hello'}),[{id:'a',text:'old'},{id:'b',text:'hello'}]);
});
