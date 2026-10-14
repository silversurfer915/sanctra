import {streakProjection} from '../utils/studyStreak.ts';
import {integrityPeriods,type IntegrityClock} from '../utils/studyIntegrity.ts';
import {publicStyle,publicAvatar} from '../utils/publicIdentity.ts';
import {useEffect} from 'react';
import {doc,setDoc,onSnapshot} from 'firebase/firestore';
import {getCloudDatabase} from '../utils/firebase.ts';
import type {AuthUser,StudySession,UserSettings,TimerStatus,UserSubscription} from '../types/index.ts';
import {localPeriodKey} from '../utils/competitiveRankings.ts';
/** Public registered-account projection. Private session details never leave the account. */
export function useCompetitivePresence(user:AuthUser|null,settings:UserSettings,sessions:StudySession[],_status:TimerStatus,_subject:string,_streak:number,subscription:UserSubscription|null=null){
 useEffect(()=>{
  const db=getCloudDatabase();if(!db||!user||user.uid.startsWith('guest-')||user.isAnonymous)return;
  const ref=doc(db,'global_profiles',user.uid);
  let disposed=false,clock:IntegrityClock|null=null;
  const publish=()=>{if(disposed)return;const now=new Date();const scores=Object.fromEntries((['day','week','month'] as const).flatMap(period=>[[`${period}Key`,localPeriodKey(now,period)],[`${period}Seconds`,clock&&clock.integrityStatus!=='confirmed'&&clock[`${period}Start`]===integrityPeriods(+now)[`${period}Start`]?clock[`${period}Seconds`]:0]]));
   void setDoc(ref,{uid:user.uid,displayName:(settings.customDisplayName||user.displayName||'Member').slice(0,200),avatarUrl:publicAvatar(settings,user,subscription).slice(0,2048),updatedAt:Date.now(),publicStyle:publicStyle(settings,subscription),...scores,...streakProjection(sessions,now)}).catch(()=>{});
  };
  const off=onSnapshot(doc(db,'study_integrity',user.uid),snapshot=>{clock=snapshot.exists()?snapshot.data() as IntegrityClock:null;publish();},()=>publish());
  let publishedDay=localPeriodKey(new Date(),'day');
  const refresh=setInterval(()=>{const day=localPeriodKey(new Date(),'day');if(day!==publishedDay){publishedDay=day;publish();}},60000);
  return()=>{disposed=true;off();clearInterval(refresh);};
 },[user?.uid,user?.isAnonymous,user?.displayName,user?.photoURL,settings.rankingOptIn,settings.avatarUrl,settings.plusAnimatedAvatarUrl,settings.customDisplayName,settings.plusProfileCoverUrl,settings.plusProfileScene,settings.plusProfileFrame,settings.plusAvatarEffect,subscription,sessions]);
}
