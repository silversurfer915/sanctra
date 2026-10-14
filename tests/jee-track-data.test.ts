import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultJeeTrackState,generateJeeInsights,JEE_EXAM_DATES} from '../src/utils/jeetrackData.ts';
import {importJeeTrackData,exportJeeTrackData,validateJeeTrackState,deriveJeeStreaks,flattenJeeState,inflateJeeRecords,sanitizeLegacyJeeState} from '../src/utils/jeeTrackValidation.ts';
import {deriveJeeSessionHours} from '../src/utils/jeeTrackStore.ts';

test('new preparation starts empty, not with fabricated progress or exam dates',()=>{
 const s=getDefaultJeeTrackState();assert.equal(s.tests.length+s.hours.length+s.practiceLogs.length+s.backlogs.length+s.upcoming.length,0);
 assert.ok(Object.values(s.syllabus).flat().every(c=>!c.theory&&!c.practice));assert.equal(s.backlogStreak,0);assert.equal(generateJeeInsights(s).score,0);assert.deepEqual(JEE_EXAM_DATES,{});
});
test('backup validation rejects bad dates, mismatched marks, oversized data and does not write storage',()=>{
 const s=getDefaultJeeTrackState();const record={id:'a',exam:'mains' as const,type:'full' as const,date:'2026-10-11',total:180,max:300,physics:60,chemistry:60,maths:60};s.tests=[record];
 assert.deepEqual(importJeeTrackData(exportJeeTrackData(s))?.tests,[record]);
 assert.equal(importJeeTrackData(JSON.stringify({...s,tests:[{...record,total:181}]})),null);
 assert.equal(importJeeTrackData(JSON.stringify({...s,tests:[{...record,date:'2026-02-30'}]})),null);
 assert.equal(importJeeTrackData('x'.repeat(2000001)),null);
 assert.throws(()=>validateJeeTrackState({...s,tests:[record,record]}));
});
test('separate cloud records preserve sibling writes across devices',()=>{
 const a=getDefaultJeeTrackState(),b=getDefaultJeeTrackState();
 a.backlogs=[{id:'device-a',title:'Real homework',subject:'maths',priority:'high',done:false,addedDate:'2026-10-11'}];
 b.practiceLogs=[{id:'device-b',subject:'physics',chapterId:101,chapterName:'Units',questions:25,date:'2026-10-11',loggedAt:1}];
 const merged=flattenJeeState(a);for(const [key,value]of flattenJeeState(b))merged.set(key,value);
 const result=inflateJeeRecords(merged);assert.equal(result.backlogs[0].id,'device-a');assert.equal(result.practiceLogs[0].id,'device-b');
});
test('backlog streak follows completed local dates, not stored counters',()=>{
 const s=getDefaultJeeTrackState();s.backlogs=['2026-10-09','2026-10-10','2026-10-11'].map((doneDate,i)=>({id:String(i),title:'Work',subject:'maths',priority:'low',done:true,addedDate:'2026-10-01',doneDate}));
 assert.equal(deriveJeeStreaks(s,'2026-10-11').backlogStreak,3);assert.equal(deriveJeeStreaks(s,'2026-10-13').backlogStreak,0);assert.equal(deriveJeeStreaks(s,'2026-10-13').backlogBestStreak,3);
});
test('derived timer hours deduplicate IDs and use focused duration with chapter provenance',()=>{
 const session={id:'focus-1',startTime:new Date('2026-10-11T12:00:00').getTime(),endTime:0,durationSeconds:1800,mode:'countup',date:'2026-10-11',jee:{subject:'physics',chapterId:101,kind:'practice'}} as any;
 const records=deriveJeeSessionHours([session,session]);assert.equal(records.length,1);assert.equal(records[0].practice,0.5);assert.equal(records[0].total,0.5);assert.equal(records[0].sourceSessionId,'focus-1');assert.equal(records[0].chapterId,101);assert.ok(!('questions' in records[0]));
});
test('legacy demo filtering retains separately entered preparation records',()=>{
 const s=getDefaultJeeTrackState();s.tests=[{id:'real-user-mock',exam:'mains',type:'full',date:'2026-10-11',total:180,max:300,physics:60,chemistry:60,maths:60}];assert.equal(sanitizeLegacyJeeState(s).tests[0].id,'real-user-mock');
});

test('preparation map includes verified missing experiment and Advanced-only topics',()=>{
 const s=getDefaultJeeTrackState();assert.ok(s.syllabus.physics.some(c=>c.name==='Experimental Skills'));
 for(const name of ['States of Matter: Gases and Liquids','Environmental Chemistry','Hydrogen','Surface Chemistry'])assert.equal(s.syllabus.chemistry.find(c=>c.name===name)?.adv,true);
});

test('updated 92-topic map preserves saved progress when loading old records and imports',()=>{
 const old=getDefaultJeeTrackState();assert.equal(Object.values(old.syllabus).flat().length,92);
 old.syllabus.physics=old.syllabus.physics.filter(c=>c.id!==131);old.syllabus.chemistry=old.syllabus.chemistry.filter(c=>![232,233].includes(c.id));
 old.syllabus.physics[0].theory=true;old.syllabus.physics[0].revisions=3;
 const loaded=inflateJeeRecords(flattenJeeState(old));assert.equal(Object.values(loaded.syllabus).flat().length,92);assert.equal(loaded.syllabus.physics[0].theory,true);assert.equal(loaded.syllabus.physics[0].revisions,3);
 const imported=importJeeTrackData(JSON.stringify(old))!;assert.equal(Object.values(imported.syllabus).flat().length,92);assert.equal(imported.syllabus.physics[0].theory,true);assert.equal(imported.syllabus.physics[0].revisions,3);
 assert.equal(imported.syllabus.chemistry.find(c=>c.id===232)?.adv,true);assert.equal(imported.syllabus.chemistry.find(c=>c.id===233)?.adv,true);
});

test('legacy filtering removes known untouched demo scores and retains edited records',()=>{
 const s=getDefaultJeeTrackState();const demo={id:'demo-m-1',exam:'mains' as const,type:'partial' as const,session:'Allen Major Test 1',date:'2026-09-15',max:300,total:168,physics:62,chemistry:64,maths:42,notes:'Maths length took extra time in Calculus'};
 s.tests=[demo];assert.equal(sanitizeLegacyJeeState(s).tests.length,0);
 s.tests=[{...demo,notes:'My own analysis'}];assert.equal(sanitizeLegacyJeeState(s).tests.length,1);
 s.syllabus.physics[0].theory=true;assert.equal(sanitizeLegacyJeeState(s).syllabus.physics[0].theory,true);
});

test('legacy unlinked study time is displayed without fabricated JEE tags or duplicated linked sessions',async()=>{
 const {deriveUnlinkedSessionHours}=await import('../src/utils/jeeTrackStore.ts');
 const base={id:'old',startTime:+new Date('2026-09-01T10:00:00'),endTime:+new Date('2026-09-01T11:00:01'),date:'2026-09-01',durationSeconds:3601,mode:'countup' as const};
 const linked={...base,id:'linked',jee:{subject:'physics' as const,chapterId:101,kind:'practice' as const}};
 const records=deriveUnlinkedSessionHours([base,base,linked]);assert.equal(records.length,1);assert.equal(records[0].total,3601/3600);assert.equal(records[0].subject,'all');assert.equal(records[0].chapterId,undefined);assert.equal(records[0].practice,0);assert.equal(records[0].sourceSessionId,'old');
 assert.equal(deriveUnlinkedSessionHours([linked]).length,0);assert.equal(deriveJeeSessionHours([linked]).length,1);
});
