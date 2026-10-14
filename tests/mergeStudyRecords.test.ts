import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeStudyRecords} from '../src/utils/mergeStudyRecords.ts';
test('saving a website record preserves concurrent Mac history and planner insertions',()=>{
 const base=[{id:'old',text:'Old'}];
 const local=[{id:'web',text:'Web'},...base];
 const remote=[{id:'mac',text:'Mac'},...base];
 assert.deepEqual(mergeStudyRecords(base,local,remote).map(item=>item.id),['web','old','mac']);
});
test('intentional removals stay removed while unchanged records follow remote edits',()=>{
 const base=[{id:'delete',text:'Remove'},{id:'edit',text:'Original'}];
 assert.deepEqual(mergeStudyRecords(base,[base[1]],[{id:'edit',text:'Remote edit'},base[0]]),[{id:'edit',text:'Remote edit'}]);
 assert.deepEqual(mergeStudyRecords(base,base,[]),[]);
});
test('a delayed timer-end history refresh preserves a newly saved background session in analytics',async()=>{
 const {buildPeriodAnalytics}=await import('../src/utils/analytics.ts');
 const start=new Date(2026,9,14,10).getTime();
 const old={id:'old',startTime:start-3600000,endTime:start-3000000,durationSeconds:600,mode:'countup' as const,date:'2026-10-14'};
 const saved={id:'ipad',startTime:start,endTime:start+900000,durationSeconds:900,mode:'countup' as const,date:'2026-10-14'};
 const historyAtRefresh=[old];let latest=[old];
 let finish!:(value:typeof historyAtRefresh)=>void;
 const staleCloudRead=new Promise<typeof historyAtRefresh>(resolve=>{finish=resolve;});
 const pendingRefresh=staleCloudRead.then(remote=>mergeStudyRecords(historyAtRefresh,latest,remote));
 latest=[saved,...latest];finish([old]);
 const merged=await pendingRefresh;assert.deepEqual(merged.map(s=>s.id),['ipad','old']);
 const analytics=buildPeriodAnalytics(merged,[],new Date(start),'day');
 assert.equal(analytics.sessionCount,2);assert.equal(analytics.totalSeconds,1500);
});
test('pending saves survive cloud reads begun after Save, but explicit local deletion still wins',()=>{
 const saved={id:'ipad',text:'15 minute focus'};
 assert.deepEqual(mergeStudyRecords([saved],[saved],[],[saved]),[saved]);
 assert.deepEqual(mergeStudyRecords([saved],[],[],[saved]),[]);
 // Once the write is confirmed, an authoritative later deletion is respected.
 assert.deepEqual(mergeStudyRecords([saved],[saved],[]),[]);
});
