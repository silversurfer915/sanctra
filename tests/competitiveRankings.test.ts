import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordedFocus, localPeriodKey, competitiveRows, type Competitor } from '../src/utils/competitiveRankings.ts';
const now = new Date(2026, 9, 2, 12, 0, 0);
const member=(uid:string,day:number,previous=0):Competitor=>({uid,displayName:uid,avatarUrl:'',streakDays:0,status:'idle',currentSubject:'',statusMessage:'',updatedAt:+now,dayKey:'2026-10-02',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:day,weekSeconds:day,monthSeconds:day,previousDaySeconds:previous,previousWeekSeconds:0,previousMonthSeconds:0});
test('local competition periods use local timezone and cross boundaries',()=>{
 assert.equal(localPeriodKey(new Date(2026, 9, 2, 2, 0, 0),'day'),'2026-10-02');
 assert.equal(localPeriodKey(now,'week'),'2026-09-28');
 assert.equal(localPeriodKey(now,'month'),'2026-10-01');
});
test('saved focus is split across midnight and duplicates do not inflate rankings',()=>{
 const session={id:'one',startTime:+new Date(2026, 9, 1, 23, 30, 0),endTime:+new Date(2026, 9, 2, 0, 30, 0),durationSeconds:1800,mode:'countup' as const,date:'2026-10-01'};
 assert.equal(recordedFocus([session,session],now,'day'),900);
 assert.equal(recordedFocus([session],now,'day',true),900);
 assert.equal(recordedFocus([session],now,'month'),1800);
 assert.equal(recordedFocus([{...session,durationSeconds:NaN}],now,'day'),0);
});
test('ties share rank and movement compares the previous period',()=>{const rows=competitiveRows([member('a',200,100),member('b',100,200),member('c',100)],'day',now);assert.equal(rows[0].rank,1);assert.equal(rows[0].movement,1);assert.equal(rows[1].rank,2);assert.equal(rows[1].movement,-1);assert.equal(rows[2].rank,2);assert.equal(rows[2].movement,null);});
test('offline previous-period totals expire today and remain available for movement',()=>{const inactive={...member('b',400),dayKey:'2026-10-01'};const rows=competitiveRows([member('a',50,100),inactive],'day',now);assert.equal(rows[0].uid,'a');assert.equal(rows[0].movement,1);assert.equal(rows[1].seconds,0);});

test('abuse detection rejects future sessions and impossible durations', () => {
  const futureSession = {
    id: 'future',
    startTime: +new Date(2026, 9, 5, 12, 0, 0),
    endTime: +new Date(2026, 9, 5, 13, 0, 0),
    durationSeconds: 3600,
    mode: 'countup' as const,
    date: '2026-10-05',
  };
  assert.equal(recordedFocus([futureSession], now, 'day'), 0);

  const giantSession = {
    id: 'giant',
    startTime: +new Date(2026, 9, 2, 0, 0, 0),
    endTime: +new Date(2026, 9, 2, 20, 0, 0),
    durationSeconds: 20 * 3600, // 20 hours > 16 hours max single session
    mode: 'countup' as const,
    date: '2026-10-02',
  };
  assert.equal(recordedFocus([giantSession], now, 'day'), 0);

  const inflatedDuration = {
    id: 'inflated',
    startTime: +new Date(2026, 9, 2, 10, 0, 0),
    endTime: +new Date(2026, 9, 2, 11, 0, 0), // 1 hour wall-clock
    durationSeconds: 10000, // claims nearly 3 hours in 1 hour
    mode: 'countup' as const,
    date: '2026-10-02',
  };
  // Should cap to wallClock (3600 + 2 = 3602, floor = 3602)
  assert.ok(recordedFocus([inflatedDuration], now, 'day') <= 3602);
});
