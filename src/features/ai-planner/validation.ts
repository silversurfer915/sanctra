import {normalizeJeeFocusTag} from '../../utils/jeeFocus.ts';
import {validTaskSlot,timeMinutes} from '../../utils/taskSchedule.ts';
import {belongsToWorkspace} from '../../utils/workspaces.ts';
import type {TaskItem} from '../../types/index.ts';
import type {PlannerContext,PlannerValidation,PlannerIssue,ProposalBatch,TaskDraft,PlannerProposal} from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
const date=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)===v;
export function taskFingerprint(t:TaskItem):string {return JSON.stringify(['id','text','dueDate','startTime','endTime','category','completed','createdAt','workspaceId','subjectId','syllabusCourseId','syllabusTopicId','syllabusTopicTitle','jee','completeJeeChapter'].map(k=>[k,t[k as keyof TaskItem]??null]));}
export function validatePlannerResponse(raw:unknown,c:PlannerContext,ids:{batchId:string;proposalIds:string[]}):PlannerValidation {
 const bad=(message:string):PlannerValidation=>({ok:false,issues:[{code:'invalid',message}]});
 if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{return bad('AI could not finish a valid plan. Please try again.');}}
 if(!object(raw)||!keys(raw,['version','summary','question','operations'])||raw.version!==1||typeof raw.summary!=='string'||raw.summary.length>1000||!(raw.question===null||typeof raw.question==='string'&&raw.question.length<=500)||!Array.isArray(raw.operations)||raw.operations.length>30)return bad('AI returned an unsupported plan. Please try again.');
 if(raw.question&&raw.operations.length)return bad('Please answer the question before applying a plan.');
 const seen=new Set<string>(),proposals:PlannerProposal[]=[];
 for(const [i,o] of raw.operations.entries()){
  if(!object(o)||!keys(o,['kind','taskId','draft'])||!['create','update','delete'].includes(String(o.kind))||!ids.proposalIds[i])return bad('AI returned an invalid task suggestion.');
  const kind=o.kind as PlannerProposal['kind'];let before:TaskItem|undefined;
  if(kind==='create'){if(o.taskId!==null)return bad('New tasks cannot replace existing records.');}
  else {if(!c.includeTasks||typeof o.taskId!=='string'||seen.has(o.taskId)||(kind==='delete'&&!c.allowDeletes))return bad('This change is outside the permitted task context.');before=c.tasks.find(t=>t.id===o.taskId);if(!before)return bad('This task is unavailable for editing.');seen.add(o.taskId);}
  if(kind==='delete'){if(o.draft!==null)return bad('Invalid removal suggestion.');}
  else {const d=o.draft;if(!object(d)||!keys(d,['text','dueDate','startTime','endTime','subjectId','jee'])||typeof d.text!=='string'||!d.text.trim()||d.text.length>200||!(d.dueDate===null||typeof d.dueDate==='string'&&date(d.dueDate)&&d.dueDate>=c.today&&d.dueDate<=c.horizonEnd)||!(d.subjectId===null||c.subjects.some(s=>s.id===d.subjectId))||!((d.startTime===null&&d.endTime===null)||(typeof d.startTime==='string'&&typeof d.endTime==='string'&&d.dueDate!==null&&validTaskSlot(d.startTime,d.endTime))))return bad('Check task dates, times and subject links before applying.');
   if(d.jee!==undefined&&d.jee!==null){const tag=normalizeJeeFocusTag(d.jee);if(!tag||!c.jeeChapters?.some(ch=>ch.subject===tag.subject&&ch.chapterId===tag.chapterId)||!object(d.jee)||!keys(d.jee,['subject','chapterId','kind']))return bad('Choose an available JEE chapter before adding this task.');}
  }
  proposals.push({id:ids.proposalIds[i],kind,taskId:o.taskId as string|null,draft:o.draft as TaskDraft|null,...(before?{before}: {})});
 }
 return {ok:true,batch:{id:ids.batchId,identity:{userId:c.userId,workspaceId:c.workspaceId,legacySpaceId:c.legacySpaceId},context:c,summary:raw.summary,question:raw.question as string|null,proposals}};
}
export function draftTask(p:PlannerProposal,b:ProposalBatch,today:string,now:number):TaskItem {const d=p.draft!;return {...p.before,id:p.before?.id||`task-ai-${p.id}`,createdAt:p.before?.createdAt??now,completed:p.before?.completed??false,workspaceId:p.before?.workspaceId??b.identity.workspaceId,text:d.text.trim(),dueDate:d.dueDate??'',category:d.dueDate?(d.dueDate<today?'backlog':'today'):'unscheduled',startTime:d.startTime??undefined,endTime:d.endTime??undefined,subjectId:(d.jee?b.context.subjects.find(s=>s.name.toLowerCase()===({physics:'physics',chemistry:'chemistry',maths:'mathematics'}[d.jee!.subject])||(d.jee!.subject==='maths'&&s.name.toLowerCase()==='maths'))?.id:d.subjectId)??undefined,...(d.jee!==undefined?{jee:d.jee?normalizeJeeFocusTag(d.jee):undefined,completeJeeChapter:false}:{} )};}
export function validatePlannerSelection(b:ProposalBatch,selectedIds:string[],current:TaskItem[],today:string):PlannerIssue[]{
 const issues:PlannerIssue[]=[],selected=b.proposals.filter(p=>selectedIds.includes(p.id));const affected=new Set(selected.map(p=>p.taskId).filter(Boolean));
 if(new Set(selectedIds).size!==selectedIds.length||selected.length!==selectedIds.length)issues.push({code:'selection',message:'The selected suggestions have changed.'});
 for(const p of selected){const v=validatePlannerResponse({version:1,summary:'',question:null,operations:[{kind:p.kind,taskId:p.taskId,draft:p.draft}]},{...b.context,today},{batchId:b.id,proposalIds:[p.id]});if(!v.ok)issues.push(...v.issues.map(x=>({...x,proposalId:p.id})));if(p.before){const t=current.find(t=>t.id===p.taskId);if(!t||(t.completed&&!b.context.fullAccess)||!belongsToWorkspace(t,b.identity.workspaceId,b.identity.legacySpaceId)||taskFingerprint(t)!==taskFingerprint(p.before))issues.push({proposalId:p.id,code:'stale',message:'This task changed. Generate a fresh plan.'});}}
 const final=current.filter(t=>!affected.has(t.id)&&!t.completed&&belongsToWorkspace(t,b.identity.workspaceId,b.identity.legacySpaceId));
 for(const p of selected){if(!p.draft)continue;const t=draftTask(p,b,today,0);for(const other of final){if(t.text===other.text&&t.dueDate===other.dueDate&&t.startTime===other.startTime&&t.endTime===other.endTime&&t.subjectId===other.subjectId||t.dueDate&&t.dueDate===other.dueDate&&validTaskSlot(t.startTime,t.endTime)&&validTaskSlot(other.startTime,other.endTime)&&timeMinutes(t.startTime)!<timeMinutes(other.endTime)!&&timeMinutes(other.startTime)!<timeMinutes(t.endTime)!)issues.push({proposalId:p.id,code:'overlap',message:'This task duplicates or overlaps another task. Edit its schedule.'});}final.push(t);}
 return issues;
}
