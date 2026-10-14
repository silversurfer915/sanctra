import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildPlannerContext} from '../src/features/ai-planner/context.ts';
import {applyPlannerBatch} from '../src/features/ai-planner/apply.ts';
import {parseAssistantReply} from '../src/features/ai-planner/assistantResponse.ts';
import {normalizeMathMarkdown} from '../src/features/ai-planner/mathMarkdown.ts';

const identity={userId:'user',workspaceId:'desk',legacySpaceId:'desk'};
const context=buildPlannerContext({...identity,instructions:'Add physics and chemistry',now:new Date(2026,9,4,10),includeTasks:true,allowDeletes:false,tasks:[],subjects:[]});
const operation=(text:string,startTime:string,endTime:string)=>({kind:'create',taskId:null,draft:{text,dueDate:context.today,startTime,endTime,subjectId:null}});
test('chat suggestions can add multiple tasks through the existing validated apply flow',()=>{
 const result=parseAssistantReply(JSON.stringify({reply:'Review these two tasks.',plan:{version:1,summary:'Today',question:null,operations:[operation('Physics','10:00','11:00'),operation('Chemistry','11:10','12:00')]}}),context,{batchId:'batch',proposalIds:['a','b']});
 assert.equal(result.ok,true);if(!result.ok||!result.batch)throw new Error('Missing suggestions');
 const applied=applyPlannerBatch([],result.batch,['a','b'],{identity,today:context.today,now:1,alreadyAppliedIds:[]});
 assert.equal(applied.ok,true);if(applied.ok)assert.deepEqual(applied.tasks.map(t=>t.text),['Physics','Chemistry']);
});
test('chat cannot smuggle unapproved deletions or unknown subjects into tasks',()=>{
 for(const bad of [{kind:'delete',taskId:'foreign',draft:null},{...operation('Physics','10:00','11:00'),draft:{...operation('Physics','10:00','11:00').draft,subjectId:'foreign'}}]){
  const result=parseAssistantReply(JSON.stringify({reply:'Done',plan:{version:1,summary:'Today',question:null,operations:[bad]}}),context,{batchId:'batch',proposalIds:['a']});
  assert.equal(result.ok,false);
 }
});
test('normal chat replies keep maths intact without creating tasks',()=>{
 const reply='**Lens formula**: $$\\frac{1}{f}=\\frac{1}{v}+\\frac{1}{u}$$';
 assert.deepEqual(parseAssistantReply(JSON.stringify({reply,plan:null}),context,{batchId:'b',proposalIds:[]}),{ok:true,text:reply,batch:null});
 assert.equal(parseAssistantReply('not JSON',context,{batchId:'b',proposalIds:[]}).ok,false);
});
test('LaTeX bracket delimiters render as maths without altering code examples',()=>{
 assert.equal(normalizeMathMarkdown(String.raw`Inline \(x^2\) and \[\frac{1}{f}\]`),'Inline $x^2$ and \n\n$$\\frac{1}{f}$$\n\n');
 assert.equal(normalizeMathMarkdown('Example: `\\(x\\)`'),'Example: `\\(x\\)`');
});

test('unified assistant accepts a session alongside task proposals',()=>{
 const result=parseAssistantReply(JSON.stringify({reply:'Review both.',sessions:[{date:'2026-10-03',startTime:'18:00',durationMinutes:50,subjectId:null,notes:'Ray optics'}],plan:{version:1,summary:'Tomorrow',question:null,operations:[operation('Physics','10:00','11:00')]}}),context,{batchId:'combined',proposalIds:['task']});
 assert.equal(result.ok,true);
 if(result.ok)assert.equal(result.batch?.proposals.length,1);
});

test('full chat planning context enables deletion and includes tasks beyond the old cap',async()=>{
 const {buildFullPlannerContext}=await import('../src/features/ai-planner/context.ts');
 const tasks=Array.from({length:110},(_,i)=>({id:`t${i}`,workspaceId:'desk',text:`Task ${i}`,dueDate:'',category:'unscheduled' as const,completed:false,createdAt:i}));
 const full=buildFullPlannerContext({...identity,instructions:'Remove task 109',now:new Date(),includeTasks:false,allowDeletes:false,tasks,subjects:[]});
 assert.equal(full.tasks.length,110);assert.equal(full.truncated,false);assert.equal(full.allowDeletes,true);assert.equal(full.includeTasks,true);
 const result=parseAssistantReply(JSON.stringify({reply:'Review removal.',plan:{version:1,summary:'Remove requested task',question:null,operations:[{kind:'delete',taskId:'t109',draft:null}]}}),full,{batchId:'delete',proposalIds:['p']});
 assert.equal(result.ok,true);
});
