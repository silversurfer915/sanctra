import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildJeeAIContext,parseJeeCoachResponse,requestJeeCoach} from '../src/utils/jeeAI.ts';
import type {JeeTrackState} from '../src/types/jeetrack.ts';
const empty=():JeeTrackState=>({tests:[],upcoming:[],hours:[],backlogs:[],practiceLogs:[],syllabus:{physics:[],chemistry:[],maths:[]},backlogStreak:0,backlogBestStreak:0,weeklyPracticeGoal:100,targetYear:'2027'});
const now=new Date('2026-10-11T12:00:00Z');
test('empty records cannot claim preparation progress',()=>{const context=buildJeeAIContext(empty(),[],[],now);assert.equal(context.hasRecordedProgress,false);assert.deepEqual(context.tests,[]);assert.equal('score' in context,false);});
test('coach samples completed records only within ninety days and removes private details',()=>{
 const state=empty();state.tests=[{id:'private',date:'2026-10-10',exam:'mains',type:'full',total:100,max:300,physics:30,chemistry:30,maths:40,notes:'private diary',session:'private name'},{id:'future',date:'2026-10-12',exam:'mains',type:'full',total:200,max:300,physics:70,chemistry:70,maths:60},{id:'old',date:'2026-01-01',exam:'mains',type:'full',total:200,max:300,physics:70,chemistry:70,maths:60}];
 const context=buildJeeAIContext(state,[],[],now);assert.equal(context.tests.length,1);assert.equal(context.hasRecordedProgress,true);assert.doesNotMatch(JSON.stringify(context),/private|future|old/);
});
test('record sampling is bounded and marks truncation',()=>{const state=empty();state.tests=Array.from({length:50},(_,i)=>({id:String(i),date:'2026-10-10',exam:'mains',type:'full',total:100,max:300,physics:30,chemistry:30,maths:40}));const context=buildJeeAIContext(state,[],[],now);assert.equal(context.tests.length,30);assert.equal(context.truncated,true);});
test('checked coach result has no fabricated readiness metric',()=>{const result=parseJeeCoachResponse(JSON.stringify({summary:'Only one mock is recorded.',strengths:[],gaps:[{title:'Trend unknown',evidence:'One mock',advice:'Log a comparable mock.'}],actions:[{day:1,task:'Review recorded mock errors',reason:'One recorded mock'}]}),now);assert.equal(result.generatedAt,now.toISOString());assert.equal('score' in result,false);});
test('malformed, oversized and duplicate-day plans are rejected',()=>{
 for(const value of ['not json','{}',JSON.stringify({summary:'ok',strengths:[],gaps:[],actions:[{day:8,task:'t',reason:'r'}]}),JSON.stringify({summary:'ok',strengths:[],gaps:[],actions:[{day:1,task:'t',reason:'r'},{day:1,task:'t',reason:'r'}]}),JSON.stringify({summary:'a'.repeat(1001),strengths:[],gaps:[],actions:[]})])assert.throws(()=>parseJeeCoachResponse(value));
});

test('empty preparation never consumes an AI request and provider failures are not fake success',async()=>{
 let calls=0; const transport=async()=>{calls++;throw new Error('All AI messages for today are used.');};
 const context=buildJeeAIContext(empty(),[],[],now);
 await assert.rejects(()=>requestJeeCoach(context,transport),/Record some preparation/);assert.equal(calls,0);
 await assert.rejects(()=>requestJeeCoach({...context,hasRecordedProgress:true},transport),/All AI messages/);assert.equal(calls,1);
});

test('invalid calendar dates are excluded from evidence',()=>{const state=empty();state.practiceLogs=[{id:'bad',subject:'physics',chapterId:1,chapterName:'Test',questions:10,date:'2026-09-31',loggedAt:0}];const context=buildJeeAIContext(state,[],[],now);assert.deepEqual(context.practice,[]);assert.equal(context.hasRecordedProgress,false);});
