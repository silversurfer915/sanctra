import type {StudySession,Subject} from '../../types/index.ts';
import {AI_SCOPE_MESSAGE} from './policy.ts';
export function buildStudyChatContext(today:string,sessions:StudySession[],subjects:Subject[],conversation:Array<{sender:'user'|'ai';text:string}>,fullContext=false){
 return {today,historyTruncated:!fullContext&&sessions.length>100,
  sessions:[...sessions].sort((a,b)=>b.startTime-a.startTime).slice(0,fullContext?undefined:100).map(s=>({
   date:s.date,seconds:s.durationSeconds,
   subject:(s.subjectName||subjects.find(subject=>subject.id===s.subjectId)?.name||'Unrecorded').slice(0,80),
   ...(s.syllabusTopicTitle?{topic:s.syllabusTopicTitle.slice(0,100)}:{}),
   ...(s.notes?{note:fullContext?s.notes:s.notes.slice(0,100)}:{}),
  })),
  conversation:conversation.filter(message=>message.text!==AI_SCOPE_MESSAGE).slice(-6).map(message=>({role:message.sender==='ai'?'assistant':'user',text:message.text.slice(0,600)})),
 };
}
