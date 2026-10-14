import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseManualSession} from '../src/features/ai-planner/manualSession.ts';
const now=new Date('2026-10-07T12:00:00+05:30');
const context={now,subjects:[{id:'physics',name:'Physics',color:'#abc'}],workspaceId:'desk'};
const response={question:null,session:{date:'2026-10-06',startTime:'18:00',durationMinutes:50,subjectId:'physics',notes:'Ray optics'}};
test('past session gets explicit AI manual provenance and no ranking credit',()=>{
 const r=parseManualSession(JSON.stringify(response),context);assert.ok(r.session);assert.equal(r.session.source,'ai-manual');assert.equal(r.session.durationSeconds,3000);assert.equal(r.session.subjectName,'Physics');assert.equal(r.session.rankingDurationSeconds,0);assert.equal(r.session.workspaceId,'desk');assert.ok(r.session.id.startsWith('sess-manual-'));
});
test('missing details become a question, not an invented session',()=>{
 assert.equal(parseManualSession(JSON.stringify({question:'When did you study?',session:null}),context).session,null);
});
test('rejects future, invalid dates, unknown subjects and unsupported durations',()=>{
 for(const patch of [{date:'2026-10-08'},{date:'2026-02-30'},{subjectId:'missing'},{durationMinutes:0},{durationMinutes:1441},{startTime:'25:00'}])assert.throws(()=>parseManualSession(JSON.stringify({...response,session:{...response.session,...patch}}),context));
});
