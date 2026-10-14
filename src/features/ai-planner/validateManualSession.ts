import type {StudySession} from '../../types/index.ts';
import {initFirebase} from '../../utils/firebase.ts';
import {callAiGateway} from './gateway.ts';
const requests=new Map<string,Promise<string>>();
export function validateManualSession(session:StudySession) {
 const key=`${initFirebase().auth?.currentUser?.uid}:${session.id}`;
 const current=requests.get(key);if(current)return current;
 const request=callAiGateway('validate-session','Check this completed study session.',{session,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}).finally(()=>requests.delete(key));requests.set(key,request);return request;
}
