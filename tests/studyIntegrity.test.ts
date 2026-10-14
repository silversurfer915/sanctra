import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceIntegrity,integrityPeriods,type IntegrityClock} from '../src/utils/studyIntegrity.ts';
const start = new Date(2026, 9, 3, 12, 0, 0).getTime();
const clock=(patch:Partial<IntegrityClock>={}):IntegrityClock=>({uid:'alice',registered:true,...integrityPeriods(start),daySeconds:40,weekSeconds:40,monthSeconds:40,lastTick:{toMillis:()=>start},deviceId:'device-a',timerId:'timer',active:true,clientSeconds:40,credited:0,integrityStatus:'clear',reason:'',...patch});
test('one server clock ignores client claims and credits server elapsed only',()=>{
 const normal=advanceIntegrity(clock(),start+30000,'timer',true,70,'device-a');assert.equal(normal.daySeconds,70);assert.equal(normal.integrityStatus,'clear');
 const jump=advanceIntegrity(clock(),start+30000,'timer',true,5000,'device-a');assert.equal(jump.daySeconds,70);assert.equal(jump.integrityStatus,'clear');assert.equal(jump.reason,'');
});
test('a second active device cannot double count; stale lease can be taken over',()=>{
 assert.throws(()=>advanceIntegrity(clock(),start+30000,'other',true,20,'device-b'),/another device/);
 assert.equal(advanceIntegrity(clock(),start+120000,'other',true,20,'device-b').credited,120);
});
test('paused clocks give no credit and a new session on the same device can start',()=>{
 assert.equal(advanceIntegrity(clock({active:false}),start+30000,'timer',true,5000,'device-a').credited,0);
 assert.equal(advanceIntegrity(clock(),start+30000,'new-timer',false,0,'device-a').credited,30);
});
test('rollover limits the new day to time since midnight and flags remain until review',()=>{
 const localMidnight = new Date(2026, 9, 4, 0, 0, 0).getTime();
 const now = localMidnight + 5000;
 const old = clock({lastTick:{toMillis:()=>now-30000},...integrityPeriods(now-30000),integrityStatus:'review',reason:'timer_jump'});
 const next=advanceIntegrity(old,now,'timer',true,70,'device-a');assert.equal(next.daySeconds,5);assert.equal(next.weekSeconds,70);assert.equal(next.integrityStatus,'review');
});
test('group scores ignore editable totals and confirmed accounts are unranked',async()=>{
 const {memberFocusSeconds}=await import('../src/utils/groupInsights.ts');
 const member={uid:'alice',joined:true,dailySeconds:{'2026-10-03':99999},integrity:clock()} as any;
 assert.equal(memberFocusSeconds(member,'day',new Date(start)),40);
 assert.equal(memberFocusSeconds({...member,integrity:null},'day',new Date(start)),0);
 assert.equal(memberFocusSeconds({...member,integrity:clock({integrityStatus:'confirmed'})},'day',new Date(start)),0);
});
test('live stretches cap at three hours across heartbeats, timer IDs and take-over',()=>{
 const old=clock({stretchStart:start-10790000});
 const next=advanceIntegrity(old,start+60000,'different',true,99999,'device-a');
 assert.equal(next.credited,10);assert.equal(next.stretchStart,old.stretchStart);
 const capped=clock({...next,lastTick:{toMillis:()=>start+60000}});
 assert.equal(advanceIntegrity(capped,start+120000,'different',true,99999,'device-a').credited,0);
});
test('a paused clock starts a fresh stretch, midnight does not',()=>{
 assert.equal(advanceIntegrity(clock({active:false,stretchStart:start-20000000}),start+60000,'timer',true,0,'device-a').stretchStart,start+60000);
 const midnight=new Date(2026,9,4).getTime();
 const old=clock({...integrityPeriods(midnight-60000),lastTick:{toMillis:()=>midnight-60000},stretchStart:midnight-10830000});
 assert.equal(advanceIntegrity(old,midnight+60000,'timer',true,0,'device-a').daySeconds,0);
});
