import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildStudyChatContext} from '../src/features/ai-planner/chatContext.ts';
import type {StudySession} from '../src/types/index.ts';
import {AI_SCOPE_MESSAGE} from '../src/features/ai-planner/policy.ts';
test('chat receives recorded subjects and topics plus follow-up context without mutating records',()=>{
 const sessions:StudySession[]=[{id:'older',subjectId:'chem',date:'2026-10-02',startTime:1,endTime:2,durationSeconds:504,mode:'countup'},{id:'newer',subjectName:'Physics',syllabusTopicTitle:'Ray Optics',notes:'Mirror practice',date:'2026-10-03',startTime:3,endTime:4,durationSeconds:1853,mode:'countup'}];
 const result=buildStudyChatContext('2026-10-04',sessions,[{id:'chem',name:'Chemistry',color:'blue',createdAt:0}],[{sender:'user',text:'progress this week'},{sender:'ai',text:'You studied on October 2.'},{sender:'ai',text:AI_SCOPE_MESSAGE}]);
 assert.equal(result.sessions[0].subject,'Physics');assert.equal(result.sessions[0].topic,'Ray Optics');assert.equal(result.sessions[0].note,'Mirror practice');assert.equal(result.sessions[1].subject,'Chemistry');assert.equal(result.conversation.length,2);assert.equal(sessions[0].id,'older');assert.equal(result.historyTruncated,false);
});
