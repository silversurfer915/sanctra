import test from 'node:test';
import assert from 'node:assert/strict';
import { nextChatUsage,chatDay } from '../src/utils/chatAllowance.ts';
import { validateVipMediaUrl,isVideoMedia } from '../src/utils/vipMedia.ts';
test('Plus doubles the daily allowance without invalid counters or refresh resets',()=>{
 assert.equal(nextChatUsage(249,false),250);assert.throws(()=>nextChatUsage(250,false));
 assert.equal(nextChatUsage(499,true),500);assert.throws(()=>nextChatUsage(500,true));assert.throws(()=>nextChatUsage(-1,true));
 assert.equal(chatDay(86400000),1);assert.equal(chatDay(86399999),0);
});
test('VIP media accepts direct secure files and rejects unsafe or unsupported links',()=>{
 assert.equal(validateVipMediaUrl('https://example.com/avatar.gif'),'https://example.com/avatar.gif');
 assert.equal(validateVipMediaUrl('https://example.com/scene.mp4?token=public',true),'https://example.com/scene.mp4?token=public');
 assert.equal(validateVipMediaUrl('/avatars/plus-lofi-cat.svg'),'/avatars/plus-lofi-cat.svg');
 for(const link of ['javascript:alert(1)','http://example.com/a.gif','https://user:pass@example.com/a.mp4','https://example.com/page','//malicious.com/evil.svg'])assert.throws(()=>validateVipMediaUrl(link));
 assert.throws(()=>validateVipMediaUrl('/avatars/plus-lofi-cat.svg',true));
 assert.throws(()=>validateVipMediaUrl('https://example.com/a.png',true));assert.equal(isVideoMedia('https://example.com/a.webm?x=1'),true);
});
