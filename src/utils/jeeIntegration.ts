import type {JeeSessionTag,StudySession,Subject,TaskItem} from '../types/index.ts';
import type {JeeBacklog,JeePracticeLog,JeeTrackState} from '../types/jeetrack.ts';
import type {CalendarEvent} from '../features/calendar/types.ts';
import {addDays} from '../features/calendar/dates.ts';
import {localJeeDate} from './jeetrackData.ts';
import {normalizeJeeFocusTag} from './jeeFocus.ts';
const subjects=['physics','chemistry','maths'] as const;
const clean=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function taskJeeTag(task:TaskItem,state:JeeTrackState,labels:Subject[]):JeeSessionTag|undefined {
 const explicit=normalizeJeeFocusTag(task.jee);
 if(explicit&&state.syllabus[explicit.subject].some(c=>c.id===explicit.chapterId))return explicit;
 const label=clean(labels.find(s=>s.id===task.subjectId)?.name||'');
 const subject=subjects.find(s=>label===s||s==='maths'&&['mathematics','math'].includes(label));
 if(!subject)return;
 const matches=state.syllabus[subject].filter(c=>clean(c.name).length>=6&&clean(task.text).includes(clean(c.name)));
 if(matches.length===1)return {subject,chapterId:matches[0].id,kind:'practice'};
}
export function sharedJeeBacklogs(state:JeeTrackState,tasks:TaskItem[],labels:Subject[],today=localJeeDate()):JeeBacklog[] {
 const projected=tasks.filter(t=>!t.completed&&(t.category==='backlog'||!!t.dueDate&&t.dueDate<today)).flatMap(task=>{
  const tag=taskJeeTag(task,state,labels);return tag?[{id:`task.${task.id}`,title:task.text,subject:tag.subject,priority:'high' as const,...(task.dueDate?{due:task.dueDate}:{}),details:'Shared Sanctra task · manage its date and chapter in Tasks',done:false,addedDate:localJeeDate(new Date(task.createdAt))}]:[];
 });return [...state.backlogs,...projected];
}
export function deriveJeePractice(sessions:StudySession[],state:JeeTrackState):JeePracticeLog[] {
 return [...new Map(sessions.map(s=>[s.id,s])).values()].flatMap(s=>{const tag=normalizeJeeFocusTag(s.jee);if(!tag||tag.kind!=='practice'||!tag.questions)return [];const chapter=state.syllabus[tag.subject].find(c=>c.id===tag.chapterId);return chapter?[{id:`session.${s.id}`,subject:tag.subject,chapterId:tag.chapterId,chapterName:chapter.name,questions:tag.questions,date:s.date,loggedAt:s.endTime,notes:'Saved focus session · edit the session to change its question count'}]:[];});
}
export function jeeCalendarEvents(state:JeeTrackState,workspaceId:string,timezone:string):CalendarEvent[] {
 const rows=[...state.upcoming.map(t=>({id:`jee.mock.${t.id}`,title:`Mock · ${t.session}`,date:t.date,notes:`JEE ${t.exam==='mains'?'Mains':'Advanced'} · ${t.type} syllabus${t.notes?'\n'+t.notes:''}`,location:t.venue})),...state.backlogs.filter(b=>!b.done&&b.due).map(b=>({id:`jee.backlog.${b.id}`,title:`Backlog · ${b.title}`,date:b.due!,notes:`JEE ${b.subject} · ${b.priority} priority${b.details?'\n'+b.details:''}`,location:undefined}))];
 return rows.map(row=>({id:row.id,title:row.title,notes:row.notes,...(row.location?{location:row.location}:{}),workspaceId,timezone,allDay:true,startDate:row.date,endDateExclusive:addDays(row.date,1),createdAt:0,updatedAt:0,revision:1,readOnly:true}));
}
export function completeJeeTask(state:JeeTrackState,task:TaskItem):JeeTrackState {
 const tag=normalizeJeeFocusTag(task.jee);if(!tag||!task.completed||!task.completeJeeChapter)return state;
 return {...state,syllabus:{...state.syllabus,[tag.subject]:state.syllabus[tag.subject].map(c=>c.id!==tag.chapterId?c:{...c,...(tag.kind==='lecture'?{theory:true}:tag.kind==='practice'?{practice:true}:tag.kind==='revision'?{revisions:(c.revisions||0)+1}:{})})}};
}
/** Legacy manual JEE hours are projected for analytics only, never for competitive credit. */
export function jeeManualSessions(state:JeeTrackState,labels:Subject[]):StudySession[] {
 return state.hours.filter(h=>h.source!=='timer').flatMap(h=>(['lecture','practice','revision','mockAnalysis'] as const).filter(kind=>h[kind]>0).map(kind=>{
  const subject=labels.find(s=>s.name.toLowerCase()==={physics:'physics',chemistry:'chemistry',maths:'mathematics',all:'all'}[h.subject]||h.subject==='maths'&&s.name.toLowerCase()==='maths');
  const durationSeconds=Math.round(h[kind]*3600),startTime=new Date(`${h.date}T00:00:00`).getTime();
  return {id:`jee.hours.${h.id}.${kind}`,date:h.date,startTime,endTime:startTime+durationSeconds*1000,durationSeconds,rankingDurationSeconds:0,timeOfDayUnknown:true,mode:'custom' as const,subjectId:subject?.id,subjectName:subject?.name||({physics:'Physics',chemistry:'Chemistry',maths:'Mathematics',all:'All subjects'}[h.subject]),subjectColor:subject?.color,notes:`Manual JEE record · ${kind} (time of day unknown)`,...(h.chapterId&&h.subject!=='all'?{jee:{subject:h.subject,chapterId:h.chapterId,kind}}:{})};
 }));
}
export function jeeReminders(state:JeeTrackState,tasks:TaskItem[],labels:Subject[],today=localJeeDate()) {
 const week=addDays(today,7);
 return [...state.upcoming.filter(t=>t.date>=today&&t.date<=week).map(t=>({id:`jee-reminder.mock.${t.id}`,section:'tests' as const,title:`Mock ${t.date===today?'today':t.date} · ${t.session}`,text:`${t.exam==='mains'?'JEE Mains':'JEE Advanced'} · ${t.type} syllabus. Open your mock schedule to prepare.`,timestamp:new Date(`${t.date}T00:00:00`).getTime()})),...sharedJeeBacklogs(state,tasks,labels,today).filter(b=>!b.done&&b.due&&b.due<=week).map(b=>({id:`jee-reminder.backlog.${b.id}`,section:'backlog' as const,title:`${b.due!<today?'Overdue':b.due===today?'Due today':'Due '+b.due} · ${b.title}`,text:`${b.subject} · ${b.priority} priority. Review this backlog in JEE Track.`,timestamp:new Date(`${b.due}T00:00:00`).getTime()}))];
}
export function jeeStudyStreak(sessions:StudySession[],today=localJeeDate()) {
 const days=new Map<string,number>();
 for(const s of sessions){if(!normalizeJeeFocusTag(s.jee)||!Number.isFinite(s.durationSeconds)||s.durationSeconds<=0)continue;days.set(s.date,(days.get(s.date)||0)+s.durationSeconds);}
 let date=(days.get(today)||0)>=3600?today:addDays(today,-1),streak=0;
 while((days.get(date)||0)>=3600){streak++;date=addDays(date,-1);}
 return streak;
}
