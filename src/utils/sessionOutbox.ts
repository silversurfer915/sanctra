import {saveSession,updateSession} from './storage.ts';
import type {StudySession} from '../types/index.ts';
const key=(uid:string)=>`sanctra_pending_sessions_v1_${encodeURIComponent(uid)}`;
export function readSessionOutbox(uid:string):StudySession[]{
 try{const raw=JSON.parse(localStorage.getItem(key(uid))||'[]');return Array.isArray(raw)?raw.filter(s=>s&&typeof s.id==='string'&&Number.isFinite(s.startTime)&&Number.isFinite(s.durationSeconds)&&s.durationSeconds>0):[];}catch{return [];}
}
export function writeSessionOutbox(uid:string,sessions:StudySession[]):void{
 if(!sessions.length){localStorage.removeItem(key(uid));return;}
 localStorage.setItem(key(uid),JSON.stringify([...new Map(sessions.map(s=>[s.id,s])).values()]));
}
export function queueSessionSave(uid:string,session:StudySession):void{writeSessionOutbox(uid,[session,...readSessionOutbox(uid).filter(s=>s.id!==session.id)]);}
export function confirmSessionSaves(uid:string,saved:readonly StudySession[]):void{
 const confirmed=new Map(saved.map(s=>[s.id,JSON.stringify(s)]));
 writeSessionOutbox(uid,readSessionOutbox(uid).filter(s=>confirmed.get(s.id)!==JSON.stringify(s)));
}

/** Queue first: a successful outbox write is durable even if the main cache is full. */
export function persistSessionWithRetry(uid:string|null,session:StudySession,editing=false):void{
 if(uid)queueSessionSave(uid,session);
 try{if(editing)updateSession(session);else saveSession(session);}catch(error){if(!uid)throw error;}
}
