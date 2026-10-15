import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreTimerDraft } from '../src/utils/timerDraft.ts';
const base = { mode: 'countup', status: 'running', accumulatedSeconds: 30, runningSince: 100000, targetSeconds: 1500, breakSeconds: 300, lastUpdated: 110000 } as const;
test('running drafts add elapsed time once; legacy snapshots start at lastUpdated', () => {
  assert.equal(restoreTimerDraft({...base, version:2}, 120000).elapsedSeconds, 50);
  assert.equal(restoreTimerDraft(base, 120000).elapsedSeconds, 40);
});
test('break restore uses break duration; pause and session start survive refresh', () => {
  const result = restoreTimerDraft({...base, version:2, status:'break-running', sessionStartTime:80000}, 120000);
  assert.equal(result.displaySeconds, 250);
  assert.equal(result.sessionStartTime, 80000);
  assert.equal(restoreTimerDraft({...base, status:'paused', runningSince:null}, 120000).elapsedSeconds, 30);
});
test('an unfinished idle draft remains recoverable as paused study time', () => {
  assert.equal(restoreTimerDraft({...base,status:'idle',runningSince:null},120000).status,'paused');
});
import { hasUnsavedFocus } from '../src/utils/timerDraft.ts';
test('mode changes protect unfinished focus but do not treat break minutes as study',()=>{
  assert.equal(hasUnsavedFocus('paused',20),true);
  assert.equal(hasUnsavedFocus('break-ready',1500),true);
  assert.equal(hasUnsavedFocus('break-running',20),false);
  assert.equal(hasUnsavedFocus('idle',0),false);
});
test('reload retains the canonical timer identity across background elapsed restoration',()=>{
 const result=restoreTimerDraft({...base,version:2,sessionId:'sess-ipad-15min'},1010000);
 assert.equal(result.sessionId,'sess-ipad-15min');assert.equal(result.elapsedSeconds,940);
 assert.equal(restoreTimerDraft({...base,version:2},120000).sessionId,null);
});
import {focusSnapshot} from '../src/utils/focusTiming.ts';
test('a suspended 25-minute timer completes at its deadline, not next morning',()=>{
 const start=+new Date(2026,9,14,16,6),nextMorning=+new Date(2026,9,15,9,11);
 const focus=focusSnapshot('pomodoro-25',1500,0,start,nextMorning);
 assert.equal(focus.seconds,1500);assert.equal(focus.endTime,start+1500000);assert.equal(focus.capped,false);
});
test('completion after a pause uses the remaining run segment',()=>{
 const focus=focusSnapshot('custom',1500,600,1000000,10000000);
 assert.equal(focus.endTime,1900000);assert.equal(focus.seconds,1500);
 assert.equal(focusSnapshot('countup',0,600,null,10000000,1900000).endTime,1900000);
});
test('bounded draft restored next morning cannot accumulate overnight focus',()=>{
 const result=restoreTimerDraft({...base,version:2,mode:'pomodoro-25',sessionStartTime:100000},100000000);
 assert.equal(result.elapsedSeconds,1500);assert.equal(result.runningSince,null);assert.equal(result.status,'break-ready');assert.equal(result.focusEndedAt,1570000);
});

test('completed Pomodoro draft preserves all focus minutes while awaiting a break',()=>{
 const result=restoreTimerDraft({...base,version:2,mode:'pomodoro-25',status:'break-ready',accumulatedSeconds:1500,runningSince:null,focusEndedAt:1600000},99999999);
 assert.equal(result.elapsedSeconds,1500);assert.equal(result.status,'break-ready');assert.equal(result.focusEndedAt,1600000);
});
test('late save after a pause uses the last focus end timestamp',()=>{
 assert.equal(focusSnapshot('pomodoro-25',1500,600,null,99999999,700000).endTime,700000);
});
