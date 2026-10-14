import test from 'node:test';import assert from 'node:assert/strict';
import {rankingAfterManualDeletion,rankingAfterDeletion,HISTORICAL_RANKING_CUTOFF} from '../src/utils/rankingDeletion.ts';import {integrityPeriods,type IntegrityClock} from '../src/utils/studyIntegrity.ts';import type {StudySession} from '../src/types/index.ts';
const now=Date.UTC(2026,9,3,18),clock={...integrityPeriods(now),daySeconds:4500,weekSeconds:6000,monthSeconds:7000} as IntegrityClock;
const session={id:'sess-timer',startTime:now-3600000,endTime:now,durationSeconds:3600,mode:'countup',date:'2026-10-03'} as StudySession;
test('removing ranked study subtracts all current period scores',()=>assert.deepEqual(rankingAfterDeletion(clock,session,now),{daySeconds:900,weekSeconds:2400,monthSeconds:3400}));
test('manual study added after historical launch never removes earned rank',()=>assert.deepEqual(rankingAfterDeletion(clock,{...session,id:'sess-manual-test'},now),{daySeconds:4500,weekSeconds:6000,monthSeconds:7000}));
test('historical manual credit can be removed and never makes a score negative',()=>{const end=HISTORICAL_RANKING_CUTOFF-1000;assert.deepEqual(rankingAfterDeletion({...clock,daySeconds:10,weekSeconds:10,monthSeconds:10},{...session,id:'sess-manual-legacy',startTime:end-3600000,endTime:end},now),{daySeconds:0,weekSeconds:0,monthSeconds:0});});
test('personal edits preserve original ranking duration',()=>assert.equal(rankingAfterDeletion(clock,{...session,durationSeconds:6000,rankingDurationSeconds:3600},now).daySeconds,900));
test('midnight overlap removes only time belonging to each period',()=>{const start=integrityPeriods(now).dayStart;assert.deepEqual(rankingAfterDeletion(clock,{...session,startTime:start-1800000,endTime:start+1800000},now),{daySeconds:2700,weekSeconds:2400,monthSeconds:3400});});

test('server-approved AI deletion uses actual period credits from its immutable receipt',()=>{
 const now=new Date(2026,9,7,12).getTime(),periods=integrityPeriods(now);
 const clock={...periods,daySeconds:4000,weekSeconds:4000,monthSeconds:4000} as IntegrityClock;
 const proof={...periods,creditedDaySeconds:1800,creditedWeekSeconds:3600,creditedMonthSeconds:3600};
 assert.deepEqual(rankingAfterManualDeletion(clock,proof),{daySeconds:2200,weekSeconds:400,monthSeconds:400});
 assert.equal(rankingAfterManualDeletion(clock,{...proof,dayStart:0}).daySeconds,4000);
});
