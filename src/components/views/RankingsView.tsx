import {currentPublicStreak,type StreakProjection} from '../../utils/studyStreak.ts';
import {RankingBoard} from '../RankingBoard.tsx';
import {integrityPeriods,type IntegrityStatus} from '../../utils/studyIntegrity.ts';
import {publicStyle, publicAvatar, type PublicStyle} from '../../utils/publicIdentity.ts';
import {useEffect,useState} from 'react';
import {collection,doc,getCountFromServer,limit,onSnapshot,orderBy,query,where} from 'firebase/firestore';
import {getCloudDatabase} from '../../utils/firebase.ts';
import {cloudErrorMessage} from '../../utils/cloudErrors.ts';
import {type RankingPeriod} from '../../utils/competitiveRankings.ts';
import type {AuthUser,UserSettings,UserSubscription} from '../../types/index.ts';
import {subscribeAdminUids} from '../../utils/adminService.ts';
interface Entry extends StreakProjection {integrityStatus?:IntegrityStatus;dayStart:number;weekStart:number;monthStart:number;publicStyle?:PublicStyle;uid:string;displayName:string;avatarUrl:string;dayKey:string;weekKey:string;monthKey:string;daySeconds:number;weekSeconds:number;monthSeconds:number;updatedAt:number}
export function RankingsView({user,settings,subscription,onProfile}:{user:AuthUser;settings:UserSettings;subscription?:UserSubscription|null;onProfile:()=>void}) {
 const ownStyle=publicStyle(settings,subscription||null);
 const [members,setMembers]=useState<Entry[]>([]),[own,setOwn]=useState<Entry|null>(null),[period,setPeriod]=useState<RankingPeriod>('day'),[now,setNow]=useState(new Date()),[pageSize,setPageSize]=useState(50),[loading,setLoading]=useState(true),[error,setError]=useState(''),[ownRank,setOwnRank]=useState<number|null>(null);
 const [adminUids,setAdminUids]=useState<Set<string>>(new Set());
 const key=integrityPeriods(+now)[`${period}Start`],keyField=`${period}Start`,scoreField=`${period}Seconds` as 'daySeconds'|'weekSeconds'|'monthSeconds';
 const enabled=!user.isAnonymous,participating=enabled;
 useEffect(()=>{if(!subscription?.adminAccess)return;return subscribeAdminUids(setAdminUids,()=>{});},[subscription?.adminAccess]);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{setLoading(true);setError('');setMembers([]);const db=getCloudDatabase();if(!db||!enabled){setLoading(false);return;}
  let ranked:Entry[]=[],catalog:Entry[]=[],closed=false,rankedReady=false,catalogReady=false,failed=false;
  const identities=new Map<string,Partial<Entry>>(),clocks=new Map<string,Partial<Entry>>(),stops=new Map<string,()=>void>();
  const emit=()=>{if(!closed){const all=new Map([...catalog,...ranked].map(r=>[r.uid,r]));setMembers([...all.values()].map(r=>({...r,...clocks.get(r.uid),...identities.get(r.uid)})));setLoading(!failed&&!(rankedReady&&catalogReady));}};
  const sync=()=>{const ids=new Set([...catalog,...ranked].map(r=>r.uid));for(const [uid,stop] of stops)if(!ids.has(uid)){stop();stops.delete(uid);identities.delete(uid);clocks.delete(uid);}for(const uid of ids)if(!stops.has(uid)){
   const identityOff=onSnapshot(doc(db,'global_profiles',uid),snap=>{if(snap.exists()){const p=snap.data();identities.set(uid,{displayName:p.displayName,avatarUrl:p.avatarUrl,publicStyle:p.publicStyle,streakDays:p.streakDays,streakDate:p.streakDate,streakUtcOffset:p.streakUtcOffset});}emit();},()=>emit());
   const clockOff=onSnapshot(doc(db,'study_rankings',uid),snap=>{clocks.set(uid,snap.exists()?snap.data() as Partial<Entry>:{daySeconds:0,weekSeconds:0,monthSeconds:0});emit();},()=>emit());
   stops.set(uid,()=>{identityOff();clockOff();});
  }emit();};
  const fail=(e:unknown)=>{if(closed)return;failed=true;setError(cloudErrorMessage(e,'load global rankings'));setLoading(false);};
  const off=onSnapshot(query(collection(db,'study_rankings'),where('registered','==',true),where(keyField,'==',key),orderBy(scoreField,'desc'),limit(pageSize)),snapshot=>{ranked=snapshot.docs.map(d=>({...d.data(),uid:d.id,displayName:'Member',avatarUrl:''} as Entry));rankedReady=true;sync();},fail);
  // Include registered public identities even before their first verified checkpoint.
  // Never use their editable public totals as competitive scores.
  const catalogOff=onSnapshot(query(collection(db,'global_profiles'),orderBy('updatedAt','desc'),limit(pageSize)),snapshot=>{catalog=snapshot.docs.map(d=>({...d.data(),uid:d.id,daySeconds:0,weekSeconds:0,monthSeconds:0,dayStart:0,weekStart:0,monthStart:0} as Entry));catalogReady=true;sync();},fail);
  return()=>{closed=true;off();catalogOff();for(const stop of stops.values())stop();};
 },[enabled,key,period,pageSize]);
 useEffect(()=>{setOwn(null);const db=getCloudDatabase();if(!db||!participating)return;return onSnapshot(doc(db,'study_rankings',user.uid),s=>setOwn(s.exists()?s.data() as Entry:null),e=>setError(cloudErrorMessage(e,'load your ranking')));},[participating,user.uid]);
 const seconds=own&&own[keyField as 'dayStart']===key&&own.integrityStatus!=='confirmed'?Math.max(0,Number.isFinite(own[scoreField])?own[scoreField]:0):0;
 useEffect(()=>{setOwnRank(null);const db=getCloudDatabase();if(!db||!seconds)return;let cancelled=false;
  void getCountFromServer(query(collection(db,'study_rankings'),where('registered','==',true),where('integrityStatus','in',['clear','review']),where(keyField,'==',key),where(scoreField,'>',seconds),orderBy(scoreField,'desc'))).then(s=>{if(!cancelled)setOwnRank(s.data().count+1);}).catch(()=>{});return()=>{cancelled=true;};
 },[seconds,key,period,keyField,scoreField]);
 const resolveStyle=(r:Entry):PublicStyle|undefined=>{
  const isMe=r.uid===user.uid;
  const base=isMe?(ownStyle||r.publicStyle):r.publicStyle;
  const isAdmin=Boolean(base?.admin||adminUids.has(r.uid)||(isMe&&subscription?.adminAccess));
  if(!base&&!isAdmin)return undefined;
  return {plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false,...base,admin:isAdmin};
 };
 const eligible=members.map(m=>({...m,streakDays:currentPublicStreak(m,+now),seconds:m.integrityStatus==='confirmed'||m[keyField as 'dayStart']!==key?0:Math.max(0,Number.isFinite(m[scoreField])?m[scoreField]:0)})).sort((a,b)=>b.seconds-a.seconds);
 const rows=eligible.map((m,index)=>({...m,rank:m.seconds>0?1+eligible.slice(0,index).filter(other=>other.seconds>m.seconds).length:null}));
 return <RankingBoard rows={rows.map(row=>({...row,publicStyle:resolveStyle(row)}))} userId={user.uid} ownName={settings.customDisplayName||user.displayName||'You'} ownAvatar={publicAvatar(settings,user,subscription||null)} ownStyle={ownStyle} seconds={seconds} ownRank={ownRank} period={period} onPeriod={value=>{setPeriod(value);setPageSize(50);}} onProfile={onProfile} loading={loading} error={error} canLoadMore={members.length>=pageSize} onLoadMore={()=>setPageSize(value=>value+50)}/>;
}
