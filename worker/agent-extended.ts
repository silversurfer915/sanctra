import {Temporal} from '@js-temporal/polyfill';
import {AgentError,object,id,textValue,integer,invalid} from './agent-auth.ts';
import {checkVersion,pick} from './agent-controls.ts';
import type {AgentTransaction,Data} from './agent-store.ts';
import {committedVersion} from './agent-store.ts';
import {records,sessionProjection,taskProjection} from './agent-projections.ts';
import {subject,consistentSubject,validateTag} from './agent-study.ts';
import {mutateCanonicalSession} from './personal-sessions.ts';
import type {PersonalStore} from './personal-api.ts';
export async function deleteStudy(tx:AgentTransaction,uid:string,kind:string,item:string,input:unknown,expected:Data,now:number,hard=false){
 object(input,[]);const path=`users/${uid}`, account=await tx.read(path);checkVersion(account.version,expected,'account');if(!account.data)throw new AgentError('missing','Account not found.',404);
 const field=kind==='delete_task'?'tasks':'sessions',archivePath=`${path}/agent_deleted/${field}_${item}`, archive=await tx.read(archivePath),canonicalPath=`${path}/personal_sessions/${item}`,canonical=field==='sessions'?await tx.read(canonicalPath):null;
 if(canonical){checkVersion(canonical.version,expected,'session');if(canonical.data?.status==='active')throw new AgentError('conflict','Stop the timer before deleting it.',409);}
 const items=records(account.data[field]),found=items.find(t=>t.id===item)||canonical?.data;
 if(!found&&!archive.data)throw new AgentError('missing','Record not found.',404);
 const deletedAt=now, tombstoneKey=field==='tasks'?'deletedTaskIds':'deletedSessionIds';
 let tasks=records(account.data.tasks);if(field==='sessions')tasks=tasks.filter(t=>t.id!==`task-${item}`);
 tx.patch(path,{[field]:items.filter(t=>t.id!==item),...(field==='sessions'?{tasks,deletedTaskIds:[...new Set([...(account.data.deletedTaskIds||[]),`task-${item}`])]}:{}),[tombstoneKey]:[...new Set([...(account.data[tombstoneKey]||[]),item])],lastSyncedAt:now});
 if(hard){if(!tx.delete)throw new AgentError('unavailable','Hard deletion is unavailable.',503);if(archive.data)tx.delete(archivePath);if(canonical?.data)tx.delete(canonicalPath);}
 else{tx.patch(archivePath,{kind:field,id:item,deletedAt,value:found||archive.data?.value,canonical:canonical?.data||archive.data?.canonical||null,linkedTask:field==='sessions'?records(account.data.tasks).find(t=>t.id===`task-${item}`)||null:null});if(canonical?.data)tx.patch(canonicalPath,{deletedAt,status:'deleted',updatedAt:now});}
 return {data:{id:item,deletedAt,hard,recoverable:!hard},versions:{account:committedVersion(path),...(canonical?.data&&!hard?{session:committedVersion(canonicalPath)}:{})},changed:[field]};
}
export async function restoreStudy(tx:AgentTransaction,uid:string,kind:string,item:string,input:unknown,expected:Data,now:number){
 object(input,[]);const path=`users/${uid}`,a=await tx.read(path);checkVersion(a.version,expected,'account');const field=kind==='restore_task'?'tasks':'sessions',archivePath=`${path}/agent_deleted/${field}_${item}`,d=await tx.read(archivePath);if(!a.data||!d.data?.deletedAt)throw new AgentError('missing','Recoverable record not found.',404);
 const key=field==='tasks'?'deletedTaskIds':'deletedSessionIds';const patch:Data={[field]:[d.data.value,...records(a.data[field]).filter(t=>t.id!==item)],[key]:(a.data[key]||[]).filter((v:string)=>v!==item),lastSyncedAt:now};
 if(field==='sessions'&&d.data.canonical){const cp=`${path}/personal_sessions/${item}`;await tx.read(cp);tx.patch(cp,{...d.data.canonical,deletedAt:null,updatedAt:now});if(d.data.linkedTask){patch.tasks=[d.data.linkedTask,...records(a.data.tasks).filter(t=>t.id!==d.data!.linkedTask.id)];patch.deletedTaskIds=(a.data.deletedTaskIds||[]).filter((v:string)=>v!==d.data!.linkedTask.id);}}
 tx.patch(path,patch);tx.patch(archivePath,{deletedAt:null,restoredAt:now});return {data:field==='tasks'?taskProjection(d.data.value):sessionProjection(d.data.value),versions:{account:committedVersion(path)},changed:[field]};
}
export async function sessionLifecycle(tx:AgentTransaction,uid:string,action:string,item:string|undefined,input:unknown,expected:Data,operationKey:string,now:number){
 const path=`users/${uid}`,account=await tx.read(path);checkVersion(account.version,expected,'account');if(!account.data)throw new AgentError('missing','Account not found.',404);
 if(action==='create_session'){
  const p=object(input,['sessionId','subjectId','startTime','durationSeconds','notes','jee','workspaceId']);const sid=p.sessionId===undefined?`agent-${operationKey}`:id(p.sessionId),sub=subject(account.data,p.subjectId);integer(p.startTime,0,now);integer(p.durationSeconds,1,86400);if(p.startTime+p.durationSeconds*1000>now+1000)invalid('A recorded session cannot end in the future.');if(p.notes!==undefined)textValue(p.notes,5000);if(p.jee){await validateTag(tx,uid,p.jee);consistentSubject(account.data,p.subjectId,p.jee);}if(p.workspaceId!==undefined&&!records(account.data.settings?.workspaces||account.data.workspaces).some(w=>w.id===id(p.workspaceId)))invalid('Select a saved workspace.');
  const cp=`${path}/personal_sessions/${sid}`,old=await tx.read(cp);if(old.data||records(account.data.sessions).some(s=>s.id===sid)||(account.data.deletedSessionIds||[]).includes(sid))throw new AgentError('conflict','Session ID already exists or was deleted.',409);
  const record={id:sid,subjectId:sub.id,subjectName:sub.name,startTime:p.startTime,endTime:p.startTime+p.durationSeconds*1000,durationSeconds:p.durationSeconds,rankingDurationSeconds:0,mode:'stopwatch',notes:p.notes||'',date:Temporal.Instant.fromEpochMilliseconds(p.startTime).toZonedDateTimeISO(account.data.settings?.timezone||'Asia/Kolkata').toPlainDate().toString(),source:'agent',...(p.jee?{jee:p.jee}:{}),...(p.workspaceId?{workspaceId:p.workspaceId}:{}),agentAttribution:{channel:'agent',operationId:operationKey}};
  tx.create(cp,{...record,status:'completed',actualDurationSeconds:p.durationSeconds,plannedDurationSeconds:0,accumulatedSeconds:p.durationSeconds,isPaused:false,deviceId:'hermes',revision:1,updatedAt:now});tx.patch(path,{sessions:[record,...records(account.data.sessions)],lastSyncedAt:now});return {data:sessionProjection(record),versions:{account:committedVersion(path),session:committedVersion(cp)},changed:['sessions']};
 }
 object(input,[]);const cp=`${path}/personal_sessions/${item}`,doc=await tx.read(cp);checkVersion(doc.version,expected,'session');if(!doc.data||doc.data.deletedAt)throw new AgentError('missing','Session not found.',404);
 if(['stop_session','complete_session'].includes(action)&&doc.data.status!=='active')throw new AgentError('conflict','Start this session before stopping or completing it.',409);
 const web=await tx.read(`activeSessions/${uid}`);if(action==='start_session'&&web.data?.sessionId&&web.data.sessionId!==item&&['running','paused','break-running','break-paused'].includes(web.data.status))throw new AgentError('conflict','Another timer is active. Stop it first.',409);
 const personal:PersonalStore={read:tx.read,write:async(p,data)=>{const d=await tx.read(p);if(d.data)tx.patch(p,data);else tx.create(p,data);},verifyOwner:async()=>{throw Error('Not used');}};
 const result=await mutateCanonicalSession(personal,uid,item!,{operationId:operationKey,expectedRevision:Number(doc.data.revision),action:action==='start_session'?(doc.data.status==='planned'?'start':'resume'):action==='stop_session'?'pause':'finish'},now);
 if(result.status>=400)throw new AgentError(result.status===409?'conflict':'validation',String(result.body.message||'Invalid session transition.'),result.status);
 const next=await tx.read(cp);tx.patch(path,{lastSyncedAt:now});
 if(action==='complete_session'){
  const a=await tx.read(path);const history=records(a.data?.sessions).map(s=>s.id===item?{...s,...(doc.data!.jee?{jee:doc.data!.jee}:{}),source:'agent'}:s);let tasks=records(a.data?.tasks).map(t=>t.id===`task-${item}`?{...t,completed:true,completedAt:now}:t);tx.patch(path,{sessions:history,tasks,lastSyncedAt:now});
 }
 return {data:sessionProjection(next.data!),versions:{account:committedVersion(path),session:committedVersion(cp)},changed:['sessions',...(action==='complete_session'?['tasks']:[])]};
}
export async function changeUser(tx:AgentTransaction,uid:string|undefined,input:unknown,expected:Data,now:number){
 const p=object(input,uid?['displayName','dailyGoalHours','weeklyTargetHours','timezone']:['uid','displayName']);if(!Object.keys(p).length)invalid('Supply profile fields.');const target=uid||id(p.uid);if(p.displayName!==undefined)textValue(p.displayName,100,1);
 const path=`users/${target}`,doc=await tx.read(path);checkVersion(doc.version,expected,'account');if(!uid&&doc.data)throw new AgentError('conflict','Account exists.',409);if(uid&&!doc.data)throw new AgentError('missing','Account not found.',404);
 const settings={...doc.data?.settings};for(const key of ['dailyGoalHours','weeklyTargetHours'])if(p[key]!==undefined){if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<0||p[key]>(key==='dailyGoalHours'?24:168))invalid('Invalid study goal.');settings[key]=p[key];}if(p.timezone!==undefined){textValue(p.timezone,100,1);try{Temporal.Now.zonedDateTimeISO(p.timezone);}catch{invalid('Use an IANA timezone.');}settings.timezone=p.timezone;}
 tx.patch(path,{settings,...(!uid?{tasks:[],sessions:[],subjects:[]}:{}),lastSyncedAt:now});const pp=`platform_users/${target}`,profile=await tx.read(pp);tx.patch(pp,{uid:target,...(p.displayName!==undefined?{displayName:p.displayName}:{}),...(!profile.data?{isGuest:false,avatarUrl:'',lastSeen:null}:{} )},profile.data?[]:['createdAt']);return {data:{uid:target,...pick(p,['displayName']),settings},versions:{account:committedVersion(path)},changed:['profile']};
}
export async function createTicket(tx:AgentTransaction,input:unknown,expected:Data,operationKey:string,_now:number,actorUid:string,grantId:string){const p=object(input,['ownerUid','title','category','text']);id(p.ownerUid);textValue(p.title,200,1);textValue(p.text,5000,1);if(!['bug','feature','account','payment','other'].includes(p.category))invalid('Invalid ticket category.');const account=await tx.read(`users/${p.ownerUid}`);checkVersion(account.version,expected,'account');if(!account.data)throw new AgentError('missing','Account not found.',404);const tid=`agent-${operationKey}`,path=`support_tickets/${tid}`;tx.create(path,{ownerUid:p.ownerUid,ownerName:account.data.displayName||account.data.name||'Member',title:p.title,category:p.category,status:'open',isPriority:false,channel:'agent'},['createdAt','updatedAt']);tx.create(`${path}/messages/${operationKey}`,{senderUid:actorUid,senderName:'Hermes · Administrator',agentGrantId:grantId,text:p.text,channel:'agent'},['createdAt']);return {data:{ticketId:tid,status:'open'},versions:{ticket:committedVersion(path)},changed:['ticket']};}
