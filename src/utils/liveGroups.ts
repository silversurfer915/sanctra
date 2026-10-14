import type {PublicRanking} from './publicRanking.ts';
import {withPublicIdentity,type PublicIdentityProjection} from './publicIdentity.ts';
import { collection,doc,onSnapshot,query,where,orderBy,limit,writeBatch,runTransaction,updateDoc,deleteDoc,arrayUnion,arrayRemove,getDoc,getDocs } from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
import { normalizeCommunity,joinCommunity,leaveCommunity } from './communityState.ts';
import type { AuthUser } from '../types/index.ts';
import type { StudyGroup,GroupChatMessage } from '../types/groups.ts';
import type { LiveGroupMember } from './groupInsights.ts';
import { canCreateGroup } from './groupQuotas.ts';
import { isEntitlementActive } from './subscriptionPlans.ts';
import type { UserSubscription } from '../types/subscription.ts';
export type LiveGroup=StudyGroup & {adminIds?:string[];deleted?:boolean};
const dbRequired=()=>{const db=getCloudDatabase();if(!db)throw new Error('Connect your account to use live Groups.');return db;};
export function watchMemberships(uid:string,callback:(ids:string[])=>void,onError:(e:Error)=>void) {
 const db=dbRequired();return onSnapshot(doc(db,'users',uid,'community','preferences'),snap=>{const value=normalizeCommunity(snap.data());localStorage.setItem(`sanctra_community_${uid}`,JSON.stringify(value));callback(value.joinedIds);},onError);
}
export function watchGroup(id:string,callback:(group:LiveGroup|null)=>void,onError:(e:Error)=>void) {
 return onSnapshot(doc(dbRequired(),'study_groups',id),snap=>callback(snap.exists()&&!snap.data().deleted?{...snap.data(),id:snap.id} as LiveGroup:null),onError);
}
export function watchPublicGroups(callback:(groups:LiveGroup[])=>void,onError:(e:Error)=>void) {
 return onSnapshot(query(collection(dbRequired(),'study_groups'),where('isPublic','==',true)),snap=>callback(snap.docs.filter(d=>!d.data().deleted).map(d=>({...d.data(),id:d.id} as LiveGroup))),onError);
}
export function watchLiveMembers(id:string,callback:(members:LiveGroupMember[],cached:boolean)=>void,onError:(e:Error)=>void) {
 const db=dbRequired();let members:LiveGroupMember[]=[],cached=false,closed=false;
 const clocks=new Map<string,PublicRanking>(),clockListeners=new Map<string,()=>void>();
 const profiles=new Map<string,PublicIdentityProjection>(),listeners=new Map<string,()=>void>();
 const emit=()=>{if(!closed)callback(members.map(member=>({...withPublicIdentity(member,profiles.get(member.uid)),integrity:clocks.get(member.uid)||null})),cached);};
 const off=onSnapshot(collection(db,'study_groups',id,'members'),{includeMetadataChanges:true},snap=>{
  cached=snap.metadata.fromCache;
  members=snap.docs.filter(d=>d.data().joined!==false).map(d=>{
   const data=d.data(), raw=data.lastHeartbeat;
   const lastHeartbeat=(raw&&typeof raw.toMillis==='function')?raw.toMillis():(raw&&typeof raw.seconds==='number')?raw.seconds*1000:Number(raw)||0;
   return {dailySeconds:data.studyDate?{[data.studyDate]:data.todaySeconds||0}:{},liveSeconds:0,statusMessage:'',liveDate:'',focusStartedAt:0,...data,lastHeartbeat,uid:d.id,joined:true} as LiveGroupMember;
  });
  const ids=new Set(members.map(m=>m.uid));
  for(const [uid,stop] of listeners)if(!ids.has(uid)){stop();listeners.delete(uid);profiles.delete(uid);clockListeners.get(uid)?.();clockListeners.delete(uid);clocks.delete(uid);}
  for(const member of members)if(!listeners.has(member.uid))listeners.set(member.uid,onSnapshot(doc(db,'global_profiles',member.uid),profile=>{
   if(profile.exists())profiles.set(member.uid,{...profile.data(),uid:profile.id} as PublicIdentityProjection);else profiles.delete(member.uid);emit();
  },()=>{profiles.delete(member.uid);emit();}));
  for(const member of members)if(!clockListeners.has(member.uid))clockListeners.set(member.uid,onSnapshot(doc(db,'study_rankings',member.uid),snap=>{if(snap.exists())clocks.set(member.uid,snap.data() as PublicRanking);else clocks.delete(member.uid);emit();},()=>{clocks.delete(member.uid);emit();}));
  emit();
 },onError);
 return()=>{closed=true;off();for(const stop of listeners.values())stop();for(const stop of clockListeners.values())stop();};
}
export function watchLiveChat(id:string,callback:(messages:GroupChatMessage[])=>void,onError:(e:Error)=>void) {
 return onSnapshot(query(collection(dbRequired(),'study_groups',id,'messages'),orderBy('timestamp','desc'),limit(100)),snap=>callback(snap.docs.map(d=>({...d.data(),id:d.id} as GroupChatMessage)).reverse()),onError);
}

export function memberIdentity(user:AuthUser) {
 return {uid:user.uid,displayName:user.displayName||'Member',avatarUrl:user.photoURL||'',joined:true,joinedAt:Date.now(),status:'idle',currentSubject:'',statusMessage:'',todaySeconds:0,streakDays:0,lastActiveAt:Date.now(),lastHeartbeat:Date.now(),dailySeconds:{},liveSeconds:0,liveDate:'',focusStartedAt:0};
}

export async function createLiveGroup(
  user: AuthUser,
  name: string,
  description: string,
  isPublic: boolean,
  customCode?: string,
  isPlus: boolean = false
) {
  const db = dbRequired();
  const planSnapshot = await getDoc(doc(db,'subscriptions',user.uid));
  const adminSnapshot=await getDoc(doc(db,'admins',user.uid));
  isPlus = adminSnapshot.exists()||isEntitlementActive(planSnapshot.exists()?planSnapshot.data() as UserSubscription:null);
  if(customCode?.trim() && !isPlus) throw new Error('An active Plus membership is required for a custom invitation code.');
  const existingSnap = await getDocs(
    query(collection(db, 'study_groups'), where('createdById', '==', user.uid))
  );
  const activeCreated = existingSnap.docs.filter(
    (d: { data: () => Record<string, unknown> }) => !d.data().deleted
  ).length;
  const quota = canCreateGroup(activeCreated, isPlus);
  if (!quota.allowed) {
    throw new Error(quota.error || 'Group creation limit reached.');
  }

  const id = `room-${crypto.randomUUID()}`;
  let roomCode = `SANCT-${crypto.randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase()}`;
  if (customCode && customCode.trim()) {
    const cleaned = customCode.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,20}$/.test(cleaned)) throw new Error('Use 4–20 letters, numbers or hyphens for your invitation code.');
    roomCode = cleaned.startsWith('SANCT-') ? cleaned : `SANCT-${cleaned}`;
  }
  const room: LiveGroup = {
    id,
    name: name.trim(),
    description: description.trim(),
    category: 'Study circle',
    timerMode: 'countup',
    badgeColor: '',
    activeCount: 0,
    isPublic,
    createdById: user.uid,
    createdByName: user.displayName || 'Member',
    createdAt: Date.now(),
    roomCode,
    adminIds: [],
    deleted: false,
    customCode: !!customCode?.trim(),
  };
  if (!room.name || room.name.length > 60) throw new Error('Choose a group name between 1 and 60 characters.');
  const pref = doc(db, 'users', user.uid, 'community', 'preferences');
  await runTransaction(db, async (tx) => {
    const inviteRef = doc(db,'room_invites',roomCode);
    const [snapshot,invite] = await Promise.all([tx.get(pref),tx.get(inviteRef)]);
    if(invite.exists()) throw new Error('That invitation code is already taken. Choose another.');
    const
      value = normalizeCommunity(snapshot.data());
    if (value.joinedIds.length >= 100)
      throw new Error('Leave a group before creating another (100 groups maximum).');
    tx.set(doc(db, 'study_groups', id), room);
    tx.set(inviteRef, { groupId: id, createdById: user.uid });
    tx.set(doc(db, 'study_groups', id, 'members', user.uid), memberIdentity(user));
    tx.set(pref, joinCommunity(value, id));
  });
  return room;
}
export async function joinLiveGroup(user:AuthUser,room:LiveGroup) {
 const db=dbRequired(),pref=doc(db,'users',user.uid,'community','preferences'),ref=doc(db,'study_groups',room.id,'members',user.uid);
 await runTransaction(db,async tx=>{const [prefs,member,parent]=await Promise.all([tx.get(pref),tx.get(ref),tx.get(doc(db,'study_groups',room.id))]);if(!parent.exists()||parent.data().deleted)throw new Error('This group has been deleted.');const value=normalizeCommunity(prefs.data());if(value.joinedIds.length>=100&&!value.joinedIds.includes(room.id))throw new Error('Leave a group before joining another (100 groups maximum).');if(!member.exists()||member.data().joined===false)tx.set(ref,{...(member.exists()?member.data():memberIdentity(user)),joined:true,status:'idle',lastHeartbeat:Date.now(),inviteCode:room.roomCode||''});tx.set(pref,joinCommunity(value,room.id));});
}
export async function leaveLiveGroup(user:AuthUser,room:LiveGroup) {
 if(room.createdById===user.uid)throw new Error('As owner, delete your group from Group settings before leaving.');
 const db=dbRequired(),pref=doc(db,'users',user.uid,'community','preferences');
 await runTransaction(db,async tx=>{const p=await tx.get(pref);tx.update(doc(db,'study_groups',room.id,'members',user.uid),{joined:false,status:'offline',lastHeartbeat:0});tx.set(pref,leaveCommunity(normalizeCommunity(p.data()),room.id));tx.update(doc(db,'study_groups',room.id),{adminIds:arrayRemove(user.uid)});});
}
export async function deleteLiveGroup(user:AuthUser,room:LiveGroup) {
 const db=dbRequired(),batch=writeBatch(db);batch.update(doc(db,'study_groups',room.id),{deleted:true});await batch.commit();
 const pref=doc(db,'users',user.uid,'community','preferences');await runTransaction(db,async tx=>{const p=await tx.get(pref);tx.set(pref,leaveCommunity(normalizeCommunity(p.data()),room.id));});
}
export async function setGroupAdmin(room:LiveGroup,uid:string,enabled:boolean) {
 await updateDoc(doc(dbRequired(),'study_groups',room.id),{adminIds:enabled?arrayUnion(uid):arrayRemove(uid)});
}
export async function editLiveGroup(room:LiveGroup,name:string,description:string,isPublic?:boolean) {
 const updates: Record<string, unknown> = {name:name.trim(),description:description.trim()};
 if(typeof isPublic === 'boolean') updates.isPublic = isPublic;
 await updateDoc(doc(dbRequired(),'study_groups',room.id),updates);
}
export async function kickLiveGroupMember(actor:AuthUser,room:LiveGroup,targetUid:string) {
 const isOwner=room.createdById===actor.uid;
 const isAdmin=isOwner||(room.adminIds?.includes(actor.uid)===true);
 if(!isAdmin) throw new Error('Only the group owner or admins can kick members.');
 if(targetUid===room.createdById) throw new Error('The group owner cannot be kicked.');
 if(targetUid===actor.uid) throw new Error('You cannot kick yourself.');
 if(!isOwner && room.adminIds?.includes(targetUid)) throw new Error('Admins cannot kick other admins.');
 const db=dbRequired();
 await runTransaction(db,async tx=>{
  const memberRef=doc(db,'study_groups',room.id,'members',targetUid);
  const roomRef=doc(db,'study_groups',room.id);
  const [memberSnap,roomSnap]=await Promise.all([tx.get(memberRef),tx.get(roomRef)]);
  if(!memberSnap.exists()||memberSnap.data().joined===false) return;
  tx.update(memberRef,{joined:false,status:'offline',lastHeartbeat:0});
  if(roomSnap.exists()&&roomSnap.data().adminIds?.includes(targetUid)){
   tx.update(roomRef,{adminIds:arrayRemove(targetUid)});
  }
 });
}
export async function resolveLiveGroup(code:string) {
 const db=dbRequired();let id=code.trim();try{const url=new URL(id);id=url.searchParams.get('room')||id;}catch{/* direct code */}
 if(!id.startsWith('room-')) {const invite=await getDoc(doc(db,'room_invites',id.toUpperCase()));if(!invite.exists())throw new Error('That invitation was not found.');id=invite.data().groupId;}
 const snap=await getDoc(doc(db,'study_groups',id));if(!snap.exists()||snap.data().deleted)throw new Error('This group is unavailable.');return {...snap.data(),id:snap.id} as LiveGroup;
}

export async function removeGroupMessage(groupId:string,messageId:string) {await deleteDoc(doc(dbRequired(),'study_groups',groupId,'messages',messageId));}

export async function forgetDeletedGroup(uid:string,id:string) {
 const db=dbRequired(),ref=doc(db,'users',uid,'community','preferences');
 await runTransaction(db,async tx=>{const snap=await tx.get(ref);const value=normalizeCommunity(snap.data());if(value.joinedIds.includes(id))tx.set(ref,leaveCommunity(value,id));});
}
