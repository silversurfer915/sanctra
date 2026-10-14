import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupDailyTotals,groupRankings,memberFocusSeconds,liveMemberStatus,type LiveGroupMember} from '../src/utils/groupInsights.ts';
const now=new Date('2026-10-02T12:00:00');
const member=(uid:string,values:Record<string,number>):LiveGroupMember=>({uid,displayName:uid,avatarUrl:'',joined:true,joinedAt:1,status:'offline',currentSubject:'',statusMessage:'',streakDays:2,dailySeconds:values,liveSeconds:0,liveDate:'2026-10-02',lastHeartbeat:0,focusStartedAt:0});
test('group periods cross month boundaries and keep offline members ranked',()=>{
 const a=member('a',{'2026-09-28':3600,'2026-10-01':1800,'2026-10-02':600});
 assert.equal(memberFocusSeconds(a,'day',now),600);assert.equal(memberFocusSeconds(a,'week',now),6000);assert.equal(memberFocusSeconds(a,'month',now),2400);
 assert.equal(groupRankings([a],'month',now)[0].seconds,2400);assert.equal(liveMemberStatus(a,+now),'offline');
});
test('rank movement compares previous period, new participants and ties are explicit',()=>{
 const a=member('a',{'2026-10-01':100,'2026-10-02':200}),b=member('b',{'2026-10-01':200,'2026-10-02':100}),c=member('c',{'2026-10-02':100});
 const rows=groupRankings([a,b,c],'day',now);assert.equal(rows[0].movement,1);assert.equal(rows[1].movement,-1);assert.equal(rows[2].rank,2);assert.equal(rows[2].movement,null);
 c.joined=false;assert.equal(groupRankings([a,b,c],'day',now).length,2);
});
test('running focus ticks between snapshots, pauses and expired presence stop ticking',()=>{
 const a={...member('a',{'2026-10-02':100}),status:'focusing',lastHeartbeat:+now-10000,focusStartedAt:+now-10000};
 assert.equal(memberFocusSeconds(a,'day',now),110);
 assert.equal(memberFocusSeconds({...a,status:'paused'},'day',now),100);
 assert.equal(memberFocusSeconds({...a,lastHeartbeat:+now-46000},'day',now),100);
});
test('group totals distribute saved focus across midnight without double counting',()=>{
 const totals=groupDailyTotals([{id:'1',startTime:+new Date('2026-10-01T23:30:00'),endTime:+new Date('2026-10-02T00:30:00'),durationSeconds:1800,mode:'countup',date:'2026-10-01'}],now);
 assert.deepEqual(totals,{'2026-10-01':900,'2026-10-02':900});
});
test('a missing integrity clock cannot fall back to editable presence study time',()=>{
  const a={...member('a',{'2026-10-02':600}),integrity:null};
  assert.equal(memberFocusSeconds(a,'day',now),0);
  assert.equal(groupRankings([a],'day',now)[0].seconds,0);
});
test('confirmed integrity clocks are unranked while clear clocks use verified seconds',async()=>{
  const {integrityPeriods}=await import('../src/utils/studyIntegrity.ts');
  const periods=integrityPeriods(+now);
  const clock=(status:'clear'|'confirmed',daySeconds:number)=>({uid:'x',registered:true,...periods,daySeconds,weekSeconds:daySeconds,monthSeconds:daySeconds,lastTick:{toMillis:()=>+now},deviceId:'d',timerId:'t',active:false,clientSeconds:daySeconds,credited:0,integrityStatus:status,reason:''});
  const present={...member('a',{'2026-10-02':9999}),integrity:clock('clear',120)};
  const banned={...member('b',{'2026-10-02':9999}),integrity:clock('confirmed',500)};
  assert.equal(memberFocusSeconds(present,'day',now),120);
  assert.equal(memberFocusSeconds(banned,'day',now),0);
});
test('members with no focus time are unranked',()=>{
 const rows=groupRankings([member('a',{}),member('b',{})],'day',now);
 assert.equal(rows[0].rank,null);assert.equal(rows[1].rank,null);
 assert.equal(rows[0].movement,null);assert.equal(rows[1].movement,null);
});

test('verified group time never adds the current session age to server credit',async()=>{
 const {integrityPeriods}=await import('../src/utils/studyIntegrity.ts');
 const periods=integrityPeriods(+now);
 const integrity={uid:'a',registered:true,...periods,daySeconds:1080,weekSeconds:2400,monthSeconds:3600,integrityStatus:'clear' as const};
 const focusing={...member('a',{'2026-10-02':9999}),integrity,status:'focusing',lastHeartbeat:+now,focusStartedAt:+now-1140000,liveSeconds:1080};
 assert.equal(memberFocusSeconds(focusing,'day',now),1080);
 assert.equal(memberFocusSeconds(focusing,'week',now),2400);
 assert.equal(memberFocusSeconds(focusing,'month',now),3600);
 assert.equal(groupRankings([focusing],'day',now)[0].seconds,1080);
 assert.equal(memberFocusSeconds({...focusing,status:'paused'},'day',now),1080);
 assert.equal(memberFocusSeconds({...focusing,lastHeartbeat:0},'day',now),1080);
 assert.equal(memberFocusSeconds(focusing,'day',new Date(+now+86400000)),0);
});
