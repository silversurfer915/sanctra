import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentPublicStreak,streakProjection} from '../src/utils/studyStreak.ts';
const now=Date.UTC(2026,9,7,12);
test('one hour saved study qualifies, partial day preserves yesterday streak',()=>{
 const p=streakProjection([{date:'2026-10-05',durationSeconds:3600},{date:'2026-10-06',durationSeconds:3600},{date:'2026-10-07',durationSeconds:1800}],new Date(now),0);
 assert.equal(p.streakDays,2);assert.equal(p.streakDate,'2026-10-06');
 assert.equal(currentPublicStreak(p,now),2);
 assert.equal(currentPublicStreak(p,now+86400000),0);
});
test('split records qualify, missing days reset, future records excluded',()=>{
 const p=streakProjection([{date:'2026-10-05',durationSeconds:7200},{date:'2026-10-07',durationSeconds:1800},{date:'2026-10-07',durationSeconds:1800},{date:'2026-10-08',durationSeconds:7200}],new Date(now),0);
 assert.equal(p.streakDays,1);assert.equal(p.streakDate,'2026-10-07');
});
test('expiry uses member timezone and legacy/invalid snapshots show zero',()=>{
 const p={streakDays:4,streakDate:'2026-10-07',streakUtcOffset:330};
 assert.equal(currentPublicStreak(p,Date.UTC(2026,9,8,20)),0);
 assert.equal(currentPublicStreak(p,Date.UTC(2026,9,8,17)),4);
 assert.equal(currentPublicStreak({streakDays:4},now),0);
 assert.equal(currentPublicStreak({...p,streakDays:-1},now),0);
});
test('empty and malformed durations cannot create a streak',()=>{
 assert.equal(streakProjection([],new Date(now),0).streakDays,0);
 assert.equal(streakProjection([{date:'2026-10-07',durationSeconds:NaN},{date:'2026-10-07',durationSeconds:-3600}],new Date(now),0).streakDays,0);
});
