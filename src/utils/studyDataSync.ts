import {doc,onSnapshot,type Firestore,type Unsubscribe} from 'firebase/firestore';
import type {StudySession,Subject,TaskItem} from '../types/index.ts';
import {mergeStudyRecords} from './mergeStudyRecords.ts';
export interface StudyRecords {sessions:StudySession[];subjects:Subject[];tasks:TaskItem[]}
export interface StudyUpdate extends Partial<StudyRecords>{deletedSessionIds?:string[];deletedTaskIds?:string[]}
export function reconcileStudyRecords(previous:StudyRecords,local:StudyRecords,remote:StudyUpdate,pending:StudySession[]=[]):StudyRecords{
 return {sessions:remote.sessions?mergeStudyRecords(previous.sessions,local.sessions,remote.sessions,pending).filter(s=>!remote.deletedSessionIds?.includes(s.id)):local.sessions.filter(s=>!remote.deletedSessionIds?.includes(s.id)),subjects:remote.subjects?mergeStudyRecords(previous.subjects,local.subjects,remote.subjects):local.subjects,tasks:remote.tasks?mergeStudyRecords(previous.tasks,local.tasks,remote.tasks).filter(t=>!remote.deletedTaskIds?.includes(t.id)):local.tasks.filter(t=>!remote.deletedTaskIds?.includes(t.id))};
}
export function subscribeStudyRecords(db:Firestore,uid:string,onData:(data:StudyUpdate)=>void,onError:(error:Error)=>void):Unsubscribe{
 return onSnapshot(doc(db,'users',uid),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||!snapshot.exists())return;
  const data=snapshot.data();const records:StudyUpdate={};
  for(const key of ['sessions','subjects','tasks','deletedSessionIds','deletedTaskIds'] as const)if(Array.isArray(data[key]))(records as Record<string,unknown>)[key]=data[key];
  onData(records);
 },onError);
}
