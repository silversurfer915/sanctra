import {normalizeJeeFocusTag} from '../../utils/jeeFocus.ts';
import type {JeeSessionTag} from '../../types/index.ts';
import type {StudySession,Subject} from '../../types/index.ts';
export interface ManualSessionContext {jeeChapters?:{subject:JeeSessionTag['subject'];chapterId:number;name:string}[];now:Date;subjects:Pick<Subject,'id'|'name'|'color'>[];workspaceId:string}
export function parseManualSession(raw:string,context:ManualSessionContext):{question:string|null;session:StudySession|null} {
 const value=JSON.parse(raw);
 if(typeof value.question==='string'&&value.question.trim()&&value.session===null)return {question:value.question.slice(0,300),session:null};
 const s=value.session;
 if(!s||typeof s.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||typeof s.startTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime)||!Number.isInteger(s.durationMinutes)||s.durationMinutes<=0||s.durationMinutes>1440||typeof s.notes!=='string'||s.notes.length>2000)throw new Error('The session could not be read. Include the date, start time, duration and what you studied.');
 const start=new Date(`${s.date}T${s.startTime}:00`);
 const [year,month,day]=s.date.split('-').map(Number);
 if(start.getFullYear()!==year||start.getMonth()+1!==month||start.getDate()!==day)throw new Error('Choose a valid session date.');
 const end=+start+s.durationMinutes*60000;
 if(!Number.isFinite(+start)||end>+context.now)throw new Error('Only finished past sessions can be added here.');
 let jee=normalizeJeeFocusTag(s.jee);
 if(s.jee!==undefined&&s.jee!==null&&(!jee||!context.jeeChapters?.some(c=>c.subject===jee!.subject&&c.chapterId===jee!.chapterId)))throw new Error('Choose an available JEE chapter before logging this session.');
 if(s.jee?.questions!==undefined&&(!Number.isInteger(s.jee.questions)||s.jee.questions<0||s.jee.questions>10000))throw new Error('Check the questions solved before saving.');
 const subject=jee?context.subjects.find(subject=>subject.name.toLowerCase()===({physics:'physics',chemistry:'chemistry',maths:'mathematics'}[jee!.subject])||(jee!.subject==='maths'&&subject.name.toLowerCase()==='maths')):context.subjects.find(subject=>subject.id===s.subjectId);
 if(!jee&&s.subjectId!==null&&!subject)throw new Error('That subject is no longer available. Generate the session again.');
 return {question:null,session:{id:`sess-manual-ai-${crypto.randomUUID()}`,source:'ai-manual',...(jee?{jee}:{}),workspaceId:context.workspaceId,startTime:+start,endTime:end,durationSeconds:s.durationMinutes*60,rankingDurationSeconds:0,mode:'custom',date:s.date,notes:s.notes,...(subject?{subjectId:subject.id,subjectName:subject.name,subjectColor:subject.color}:{})}};
}
