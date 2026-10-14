import {publicStyle,publicAvatar} from '../utils/publicIdentity.ts';
import {useEffect,useRef} from 'react';
import {doc,updateDoc} from 'firebase/firestore';
import {getCloudDatabase} from '../utils/firebase.ts';
import {watchMemberships} from '../utils/liveGroups.ts';
import type {AuthUser,StudySession,TimerStatus,UserSettings,UserSubscription} from '../types/index.ts';
export function useGroupPresence(user:AuthUser|null,sessions:StudySession[],status:TimerStatus,subject:string,streak:number,focusSeconds:number,sessionStart:number,settings:UserSettings,subscription:UserSubscription|null) {
 const latest=useRef({user,sessions,status,subject,streak,focusSeconds,sessionStart,settings,subscription});latest.current={user,sessions,status,subject,streak,focusSeconds,sessionStart,settings,subscription};
 const publishRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  const db=getCloudDatabase();if(!db||!user)return;
  let ids:string[]=[],closed=false;
  const publish=()=>{if(closed)return;const state=latest.current,now=Date.now();
   const data={publicStyle:publicStyle(state.settings,state.subscription),displayName:state.settings.customDisplayName||state.user?.displayName||'Member',avatarUrl:state.user?publicAvatar(state.settings,state.user,state.subscription):'',status:state.status==='running'?'focusing':state.status.startsWith('break-')?'break':state.status==='paused'?'paused':'idle',currentSubject:state.subject,statusMessage:localStorage.getItem(`sanctra_status_${user.uid}`)||'',streakDays:state.streak,focusStartedAt:state.status==='running'?(state.sessionStart||now):0,liveSeconds:state.focusSeconds,lastHeartbeat:now,lastActiveAt:now};
   for(const id of ids)void updateDoc(doc(db,'study_groups',id,'members',user.uid),data).catch(()=>{/* Deleted/left groups cannot be revived by a heartbeat. */});
  };
  publishRef.current=publish;
  const off=watchMemberships(user.uid,value=>{ids=value;publish();},()=>{}),interval=setInterval(publish,30000);
  const offline=()=>{for(const id of ids)void updateDoc(doc(db,'study_groups',id,'members',user.uid),{status:'offline',lastHeartbeat:0}).catch(()=>{});};
  const visibility=()=>{if(document.visibilityState==='visible')publish();};
  window.addEventListener('pagehide',offline);window.addEventListener('pageshow',publish);window.addEventListener('sanctra-status',publish);document.addEventListener('visibilitychange',visibility);
  return()=>{offline();closed=true;off();clearInterval(interval);window.removeEventListener('pagehide',offline);window.removeEventListener('pageshow',publish);window.removeEventListener('sanctra-status',publish);document.removeEventListener('visibilitychange',visibility);publishRef.current=()=>{};};
 },[user?.uid]);
 // Transitions publish immediately; clock ticks don't generate a write every second.
 useEffect(()=>{publishRef.current();},[status,subject,streak,sessions,user?.displayName,user?.photoURL,settings.customDisplayName,settings.avatarUrl,settings.plusAnimatedAvatarUrl,settings.plusProfileCoverUrl,settings.plusProfileScene,settings.plusProfileFrame,settings.plusAvatarEffect,subscription]);
}
