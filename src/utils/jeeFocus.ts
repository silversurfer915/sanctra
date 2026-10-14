import type {JeeSessionTag,StudySession} from '../types/index.ts';
export function normalizeJeeFocusTag(value:unknown):JeeSessionTag|undefined {
 if(!value||typeof value!=='object')return undefined;
 const tag=value as JeeSessionTag;
 if(!['physics','chemistry','maths'].includes(tag.subject)||!Number.isSafeInteger(tag.chapterId)||tag.chapterId<=0||!['lecture','practice','revision','mockAnalysis'].includes(tag.kind))return undefined;
 return {subject:tag.subject,chapterId:tag.chapterId,kind:tag.kind,...(Number.isInteger(tag.questions)&&tag.questions!>=0&&tag.questions!<=10000?{questions:tag.questions}:{})};
}
export function withJeeFocus(session:StudySession,tag:unknown):StudySession {const jee=normalizeJeeFocusTag(tag);return jee?{...session,jee}:session;}
