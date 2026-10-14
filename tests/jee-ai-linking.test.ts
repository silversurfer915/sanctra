import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultJeeTrackState} from '../src/utils/jeetrackData.ts';
import {parseJeeChapterSuggestion,jeeChapterCatalog} from '../src/utils/jeeChapterSuggestion.ts';
import {parseManualSession} from '../src/features/ai-planner/manualSession.ts';
import {buildPlannerContext} from '../src/features/ai-planner/context.ts';
import {validatePlannerResponse,draftTask} from '../src/features/ai-planner/validation.ts';
const syllabus=getDefaultJeeTrackState().syllabus;
const chapters=jeeChapterCatalog(syllabus),chapter=chapters.find(c=>c.subject==='physics')!;
const tag={subject:chapter.subject,chapterId:chapter.chapterId,kind:'practice' as const};
test('chapter suggestions are catalog-bound and ambiguity creates no tag or counts',()=>{
 assert.deepEqual(parseJeeChapterSuggestion(JSON.stringify({chapter:null,reason:'Which chapter did you study?'}),syllabus),{reason:'Which chapter did you study?'});
 assert.deepEqual(parseJeeChapterSuggestion(JSON.stringify({chapter:tag,reason:'Matches the description.'}),syllabus).tag,tag);
 assert.throws(()=>parseJeeChapterSuggestion(JSON.stringify({chapter:{...tag,chapterId:999999},reason:'Invalid'}),syllabus));
});
test('planned JEE tasks use the matching shared subject and reject unknown tags or invented counts',()=>{
 const c={...buildPlannerContext({userId:'u',workspaceId:'w',legacySpaceId:'w',instructions:'Plan practice',now:new Date(2026,9,12),includeTasks:true,allowDeletes:false,tasks:[],subjects:[{id:'p',name:'Physics',color:'#abc',createdAt:1},{id:'c',name:'Chemistry',color:'#def',createdAt:1}]}),jeeChapters:chapters};
 const envelope=(jee:unknown)=>({version:1,summary:'Practice plan',question:null,operations:[{kind:'create',taskId:null,draft:{text:'Practice chapter',dueDate:'2026-10-12',startTime:null,endTime:null,subjectId:'c',jee}}]});
 const parse=(jee:unknown)=>validatePlannerResponse(envelope(jee),c,{batchId:'b',proposalIds:['p']});
 const v=parse(tag);assert.ok(v.ok);const task=draftTask(v.batch.proposals[0],v.batch,c.today,1);assert.deepEqual(task.jee,tag);assert.equal(task.subjectId,'p');assert.equal(task.completeJeeChapter,false);
 assert.equal(parse({...tag,questions:50}).ok,false);assert.equal(parse({...tag,chapterId:999999}).ok,false);
 assert.equal(validatePlannerResponse(envelope(tag),{...c,jeeChapters:undefined},{batchId:'b',proposalIds:['p']}).ok,false);
});
test('past JEE sessions preserve explicit practice counts and canonical subject with no ranking credit',()=>{
 const context={now:new Date(2026,9,12,12),subjects:[{id:'p',name:'Physics',color:'#abc',createdAt:1},{id:'c',name:'Chemistry',color:'#def',createdAt:1}],workspaceId:'w',jeeChapters:chapters};
 const payload={question:null,session:{date:'2026-10-11',startTime:'10:00',durationMinutes:30,subjectId:'c',notes:'Practice',jee:{...tag,questions:20}}};
 const session=parseManualSession(JSON.stringify(payload),context).session!;assert.equal(session.subjectId,'p');assert.equal(session.jee?.questions,20);assert.equal(session.rankingDurationSeconds,0);
 assert.throws(()=>parseManualSession(JSON.stringify({...payload,session:{...payload.session,jee:{...tag,questions:1.5}}}),context));
});
