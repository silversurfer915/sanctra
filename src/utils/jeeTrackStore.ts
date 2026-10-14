import type { StudySession } from '../types/index.ts';
import type { JeeStudyHour } from '../types/jeetrack.ts';
import { validJeeDate } from './jeeTrackValidation.ts';
import { localJeeDate } from './jeetrackData.ts';
export { flattenJeeState, inflateJeeRecords, validateJeeTrackState, deriveJeeStreaks, upsertTimerJeeHour } from './jeeTrackValidation.ts';
/** Saved focus time is attributed once by source session ID; question counts are never inferred. */
export function deriveJeeSessionHours(sessions: StudySession[]): JeeStudyHour[] {
  const records=new Map<string,JeeStudyHour>();
  for(const session of sessions) {
    if(!session.jee || !Number.isFinite(session.durationSeconds) || session.durationSeconds<=0)continue;
    const tag=session.jee;
    if(!['physics','chemistry','maths'].includes(tag.subject) || !['lecture','practice','revision','mockAnalysis'].includes(tag.kind))continue;
    const savedDate=new Date(session.startTime);
    if(Number.isNaN(savedDate.getTime()))continue;
    const total=session.durationSeconds/3600;
    if(total>24)continue;
    records.set(session.id,{id:`timer:${session.id}`,source:'timer',sourceSessionId:session.id,sessionId:session.id,date:validJeeDate(session.date)?session.date:localJeeDate(savedDate),subject:tag.subject,chapterId:tag.chapterId,lecture:0,practice:0,revision:0,mockAnalysis:0,total,[tag.kind]:total,notes:'Saved Sanctra focus session'});
  }
  return [...records.values()];
}

/** Display unlinked history without assigning a JEE subject, chapter or activity. */
export function deriveUnlinkedSessionHours(sessions:StudySession[]):JeeStudyHour[]{
 const records=new Map<string,JeeStudyHour>();
 for(const s of sessions){if(s.jee||!Number.isFinite(s.durationSeconds)||s.durationSeconds<=0||s.durationSeconds>86400)continue;const start=new Date(s.startTime);if(Number.isNaN(+start))continue;records.set(s.id,{id:`timer:${s.id}`,source:'timer',sourceSessionId:s.id,sessionId:s.id,date:validJeeDate(s.date)?s.date:localJeeDate(start),subject:'all',lecture:0,practice:0,revision:0,mockAnalysis:0,total:s.durationSeconds/3600,notes:'Unlinked Sanctra session — chapter and activity not assigned.'});}
 return [...records.values()];
}
