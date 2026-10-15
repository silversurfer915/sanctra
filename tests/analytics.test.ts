import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics } from '../src/utils/analytics.ts';
const session = (id:string, start:Date, duration:number, extra={}) => ({ id, startTime:start.getTime(), endTime:start.getTime()+duration*1000, durationSeconds:duration, mode:'countup' as const, date:'2026-10-01', ...extra });
test('month totals preserve old subject names and distribute across midnight', () => {
  const records = [session('one', new Date(2026,9,1,23,30),3600,{subjectId:'deleted',subjectName:'Physics',subjectColor:'#00f'}), session('two',new Date(2026,8,30,23,30),3600)];
  const stats = buildAnalytics(records,[],2026,9, new Date(2026,9,2));
  assert.equal(stats.totalSeconds,5400);
  assert.equal(stats.days[0].seconds,3600);
  assert.equal(stats.days[1].seconds,1800);
  assert.equal(stats.subjects.find(s=>s.name==='Physics')?.seconds,3600);
  assert.equal(stats.hours[0],3600);
  assert.equal(stats.hours[23],1800);
});
test('ignores invalid durations, deduplicates IDs, and future periods are empty', () => {
  const record = session('one',new Date(2026,9,1,10),3600);
  const stats = buildAnalytics([record,record,{...record,id:'bad',durationSeconds:NaN}],[],2026,9,new Date(2026,9,2));
  assert.equal(stats.totalSeconds,3600);
  assert.equal(stats.sessionCount,1);
  assert.equal(stats.daysElapsed,2);
  assert.equal(buildAnalytics([],[],2027,0,new Date(2026,9,2)).daysElapsed,0);
});

test('week starts Monday, spans months, and preserves focus with pauses', async () => {
  const { buildPeriodAnalytics } = await import('../src/utils/analytics.ts');
  const records = [session('pause',new Date(2026,8,30,23),3600,{endTime:+new Date(2026,9,1,1)}),session('outside',new Date(2026,9,5,10),600)];
  const stats = buildPeriodAnalytics(records,[],new Date(2026,9,1),'week',new Date(2026,9,2));
  assert.equal(stats.start.getDay(),1); assert.equal(stats.days.length,7);
  assert.equal(stats.totalSeconds,3600); assert.equal(stats.sessionCount,1);
  assert.equal(stats.days.find(d=>d.date.getMonth()===8&&d.day===30)?.seconds,1800);
  assert.equal(stats.days.find(d=>d.date.getMonth()===9&&d.day===1)?.seconds,1800);
  assert.equal(stats.daysElapsed,5); assert.equal(stats.medianSession,3600);
});
test('day clips cross-midnight focus but history retains full duration', async () => {
  const { buildPeriodAnalytics } = await import('../src/utils/analytics.ts');
  const stats = buildPeriodAnalytics([session('night',new Date(2026,9,1,23,30),3600,{notes:'Review'})],[],new Date(2026,9,2),'day',new Date(2026,9,2,12));
  assert.equal(stats.totalSeconds,1800); assert.equal(stats.sessions[0].durationSeconds,3600);
  assert.equal(stats.averageSession,1800);assert.equal(stats.medianSession,1800);assert.equal(stats.longestSession,1800);
  assert.equal(stats.sessions[0].notes,'Review'); assert.equal(stats.peakHour,0);
});
test('period navigation handles year and leap-month boundaries', async () => {
  const { shiftPeriod, buildPeriodAnalytics } = await import('../src/utils/analytics.ts');
  assert.equal(shiftPeriod(new Date(2026,11,31),'month',1).getFullYear(),2027);
  assert.equal(buildPeriodAnalytics([],[],new Date(2028,1,20),'month',new Date(2028,2,1)).days.length,29);
});
