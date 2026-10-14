import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultJeeTrackState} from '../src/utils/jeetrackData.ts';
import {completeJeeTask,deriveJeePractice,jeeCalendarEvents,sharedJeeBacklogs,jeeReminders,jeeStudyStreak,jeeManualSessions} from '../src/utils/jeeIntegration.ts';
import {validateJeeTrackState} from '../src/utils/jeeTrackValidation.ts';
import {buildJeeAIContext} from '../src/utils/jeeAI.ts';
import {projectCalendarEntries} from '../src/features/calendar/projection.ts';
import type {StudySession,TaskItem,Subject} from '../src/types/index.ts';
const state=getDefaultJeeTrackState();
const chapter=state.syllabus.chemistry.find(c=>/chemical kinetics/i.test(c.name))!;
const labels:Subject[]=[{id:'chem',name:'Chemistry',color:'#f2c3cc',createdAt:0}];
const tag={subject:'chemistry' as const,chapterId:chapter.id,kind:'practice' as const};
const task:TaskItem={id:'late',text:'Revise Chemical Kinetics',subjectId:'chem',createdAt:1,completed:false,category:'today',dueDate:'2026-10-10'};
const session:StudySession={id:'focus',date:'2026-10-11',startTime:new Date('2026-10-11T12:00:00').getTime(),endTime:new Date('2026-10-11T13:00:00').getTime(),durationSeconds:3600,mode:'countup',jee:{...tag,questions:25}};

test('an overdue shared chapter task feeds backlog and reminder without copying into JEE storage',()=>{
 const result=sharedJeeBacklogs(state,[task],labels,'2026-10-12');assert.equal(result.length,1);assert.equal(result[0].id,'task.late');assert.equal(state.backlogs.length,0);
 assert.equal(sharedJeeBacklogs(state,[{...task,completed:true}],labels,'2026-10-12').length,0);
 assert.equal(jeeReminders(state,[task],labels,'2026-10-12')[0].section,'backlog');
});
test('chapter completion needs explicit consent and matches the selected activity',()=>{
 assert.equal(completeJeeTask(state,{...task,jee:tag,completed:true}),state);
 const revised=completeJeeTask(state,{...task,jee:{...tag,kind:'revision'},completed:true,completeJeeChapter:true});
 const updated=revised.syllabus.chemistry.find(c=>c.id===chapter.id)!;
 assert.equal(updated.revisions,(chapter.revisions||0)+1);assert.equal(updated.theory,chapter.theory);assert.equal(updated.practice,chapter.practice);
});
test('saved session question counts derive once and do not invent counts from time',()=>{
 assert.equal(deriveJeePractice([session,session],state).reduce((s,p)=>s+p.questions,0),25);
 assert.equal(deriveJeePractice([{...session,jee:tag}],state).length,0);
 assert.equal(deriveJeePractice([],state).length,0);
});
test('calendar mock projection is all-day, visible, read-only and disappears when source is deleted',()=>{
 const mock={id:'cpt',session:'CPT',exam:'mains' as const,type:'full' as const,date:'2026-10-16'};
 const events=jeeCalendarEvents({...state,upcoming:[mock]},'study','Asia/Kolkata');
 const entries=projectCalendarEntries({tasks:[],events,subjects:labels,workspaceId:'study',legacySpaceId:'study',timezone:'Asia/Kolkata',rangeStart:'2026-10-01',rangeEnd:'2026-11-01'});
 assert.equal(entries.length,1);assert.equal(entries[0].date,'2026-10-16');assert.equal(entries[0].readonly,true);
 assert.equal(jeeCalendarEvents(state,'study','Asia/Kolkata').length,0);
});
test('mock detail backup round-trips and rejects unsupported question counts or mistakes',()=>{
 const mock={id:'mock',exam:'mains' as const,type:'full' as const,date:'2026-10-11',physics:50,chemistry:60,maths:70,total:180,max:300,durationMinutes:180,attempted:60,unattempted:15,chapterMistakes:[{subject:'chemistry' as const,chapterId:chapter.id,mistakes:3,reason:'Concept'}]};
 assert.deepEqual(validateJeeTrackState({...state,tests:[mock]}).tests[0],mock);
 assert.throws(()=>validateJeeTrackState({...state,tests:[{...mock,attempted:1.5}]}));
 assert.throws(()=>validateJeeTrackState({...state,tests:[{...mock,chapterMistakes:[{...mock.chapterMistakes[0],mistakes:-1}]}]}));
});
test('coach sees shared focus and question evidence while empty accounts remain unknown',()=>{
 const context=buildJeeAIContext(state,[session],[],new Date('2026-10-12T12:00:00'));
 assert.equal(context.hasRecordedProgress,true);assert.equal(context.practice[0].questions,25);assert.equal(context.focusSessions[0].topic,chapter.name);
 assert.equal(buildJeeAIContext(state,[],[],new Date('2026-10-12T12:00:00')).hasRecordedProgress,false);
});
test('JEE focus streak requires one hour per day and legacy manual hours never earn ranked credit',()=>{
 assert.equal(jeeStudyStreak([session],'2026-10-12'),1);assert.equal(jeeStudyStreak([{...session,durationSeconds:3599}],'2026-10-12'),0);
 const projected=jeeManualSessions({...state,hours:[{id:'h',date:'2026-10-11',subject:'chemistry',chapterId:chapter.id,lecture:1,practice:2,revision:0,mockAnalysis:0,total:3,source:'manual'}]},labels);
 assert.equal(projected.reduce((sum,s)=>sum+s.durationSeconds,0),10800);assert.ok(projected.every(s=>s.rankingDurationSeconds===0));
});
