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
