import {belongsToWorkspace} from '../../utils/workspaces.ts';
import {getLocalDateString} from '../../utils/time.ts';
import type {PlannerContext,PlannerInput} from './types.ts';
export function buildPlannerContext(input:PlannerInput):PlannerContext {
 if(!input.userId||!input.workspaceId)throw new Error('Sign in to plan your study day.');
 if(!input.instructions.trim()||input.instructions.length>2000)throw new Error('Describe your day in 1–2,000 characters.');
 const today=getLocalDateString(input.now),end=new Date(input.now);end.setDate(end.getDate()+30);
 const scope=(t:{workspaceId?:string})=>belongsToWorkspace(t,input.workspaceId,input.legacySpaceId);
 const all=input.includeTasks?input.tasks.filter(t=>!t.completed&&scope(t)).sort((a,b)=>(a.dueDate===today?-1:b.dueDate===today?1:0)||(!a.dueDate?1:!b.dueDate?-1:a.dueDate.localeCompare(b.dueDate))||a.id.localeCompare(b.id)):[];
 return {userId:input.userId,workspaceId:input.workspaceId,legacySpaceId:input.legacySpaceId,today,localTime:`${String(input.now.getHours()).padStart(2,'0')}:${String(input.now.getMinutes()).padStart(2,'0')}`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,horizonEnd:getLocalDateString(end),instructions:input.instructions.trim(),includeTasks:input.includeTasks,allowDeletes:input.includeTasks&&input.allowDeletes,truncated:all.length>100,tasks:all.slice(0,100).map(t=>({id:t.id,text:t.text,dueDate:t.dueDate,startTime:t.startTime,endTime:t.endTime,category:t.category,completed:t.completed,createdAt:t.createdAt,workspaceId:t.workspaceId,subjectId:t.subjectId,syllabusCourseId:t.syllabusCourseId,syllabusTopicId:t.syllabusTopicId,syllabusTopicTitle:t.syllabusTopicTitle})),subjects:input.subjects.filter(scope).map(({id,name})=>({id,name}))};
}

/** Unified chat always receives the complete current workspace task context. */
export function buildFullPlannerContext(input:PlannerInput):PlannerContext {
 const context=buildPlannerContext({...input,includeTasks:true,allowDeletes:true});
 return {...context,fullAccess:true,truncated:false,tasks:input.tasks.filter(t=>belongsToWorkspace(t,input.workspaceId,input.legacySpaceId)).map(t=>({...t}))};
}
