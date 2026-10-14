import {validImageAttachment,type ImageAttachment} from './imageAttachments.ts';
import { collection, doc, onSnapshot, query, where, limit, orderBy, setDoc, updateDoc, serverTimestamp, writeBatch, runTransaction, getDoc, type Timestamp } from 'firebase/firestore';
import { getCloudDatabase } from './firebase.ts';
import type { AuthUser } from '../types/index.ts';
export interface PlatformUser {uid:string;displayName:string;avatarUrl:string;isGuest:boolean;lastSeen:Timestamp;}
export interface Restriction {reason:string;expiresAt:number;permanent:boolean;active:boolean;actorUid:string;updatedAt:Timestamp;}
export interface Ticket {id:string;ownerUid:string;ownerName:string;title:string;category:string;status:'open'|'in_progress'|'resolved';createdAt:Timestamp;updatedAt:Timestamp;isPriority?:boolean;}
export interface TicketMessage {channel?:'agent';agentGrantId?:string;image?:ImageAttachment;id:string;senderUid:string;senderName:string;text:string;createdAt:Timestamp;}
function database(){const db=getCloudDatabase();if(!db)throw new Error('Connect and sign in to use this feature.');return db;}
export function subscribeAdmin(uid:string,callback:(value:boolean)=>void){const db=getCloudDatabase();if(!db){callback(false);return()=>{};}return onSnapshot(doc(db,'admins',uid),s=>callback(s.exists()),()=>callback(false));}
export function trackPlatformUser(user:AuthUser){if(user.isAnonymous)return()=>{};const db=getCloudDatabase();if(!db)return()=>{};const beat=()=>{if(document.visibilityState==='visible')void setDoc(doc(db,'platform_users',user.uid),{uid:user.uid,displayName:(user.displayName||'Scholar').slice(0,200),avatarUrl:user.photoURL||'',isGuest:false,lastSeen:serverTimestamp()}).catch(()=>{});};beat();const timer=window.setInterval(beat,60000);document.addEventListener('visibilitychange',beat);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',beat);};}
export function subscribePlatformUsers(callback:(v:PlatformUser[])=>void,error:(s:string)=>void){return onSnapshot(query(collection(database(),'platform_users'),where('isGuest','==',false)),s=>callback(s.docs.map(d=>({...d.data(),uid:d.id} as PlatformUser))),e=>error(cloudErrorMessage(e,'load platform users')));}
export function subscribeRestriction(uid:string,callback:(v:Restriction|null)=>void){const db=getCloudDatabase();if(!db){callback(null);return()=>{};}return onSnapshot(doc(db,'moderation',uid),s=>callback(s.exists()?s.data() as Restriction:null),()=>callback(null));}
export function subscribeRestrictions(callback:(v:Record<string,Restriction>)=>void,error:(s:string)=>void){return onSnapshot(query(collection(database(),'moderation'),limit(1000)),s=>callback(Object.fromEntries(s.docs.map(d=>[d.id,d.data() as Restriction]))),e=>error(cloudErrorMessage(e,'load moderation records')));}
export async function moderateUser(actorUid:string,uid:string,reason:string,hours:number|null,active=true){if(actorUid===uid)throw new Error('You cannot restrict your own admin account.');if(!reason.trim())throw new Error('Enter a reason.');if(hours!==null&&(!Number.isFinite(hours)||hours<=0||hours>87600))throw new Error('Duration must be between 0 and 87600 hours.');const db=database(),batch=writeBatch(db);const value={reason:reason.trim().slice(0,1000),expiresAt:hours===null?0:Date.now()+hours*3600000,permanent:hours===null,active,actorUid,updatedAt:serverTimestamp()};batch.set(doc(db,'moderation',uid),value);batch.set(doc(db,'moderation_audit',crypto.randomUUID()),{...value,targetUid:uid});await batch.commit();}
export function isRestricted(value:Restriction|null,now=Date.now()){return !!value?.active&&(value.permanent||value.expiresAt>now);}
export function subscribeTickets(uid:string,admin:boolean,callback:(v:Ticket[])=>void,error:(s:string)=>void){const ref=collection(database(),'support_tickets');return onSnapshot(query(ref,...(admin?[]:[where('ownerUid','==',uid)]),orderBy('updatedAt','desc')),s=>callback(s.docs.map(d=>({id:d.id,...d.data()} as Ticket)).sort((a,b)=>{if(admin){if(a.isPriority&&!b.isPriority)return -1;if(!a.isPriority&&b.isPriority)return 1;}return (b.updatedAt?.toMillis()||0)-(a.updatedAt?.toMillis()||0);})),e=>error(cloudErrorMessage(e,'load tickets')));}
export async function createTicket(user:AuthUser,title:string,category:string,text:string,_isPriority=false,image?:ImageAttachment) {
 if(!title.trim()||title.trim().length>120)throw new Error('Enter a title between 1 and 120 characters.');
 if(!text.trim()||text.trim().length>5000)throw new Error('Enter a message between 1 and 5,000 characters.');
 if(image&&!validImageAttachment(image))throw new Error('Invalid image attachment.');
 if(!['issue','suggestion','question','account','report','partnership','premium','timer','appeal','other'].includes(category))throw new Error('Choose a supported ticket topic.');
 const db=database(),id=crypto.randomUUID(),batch=writeBatch(db);
 const [membership,controls]=await Promise.all([getDoc(doc(db,'subscriptions',user.uid)),getDoc(doc(db,'platform','controls'))]);
 if(controls.exists()&&controls.data().supportEnabled===false)throw new Error('New tickets are temporarily paused. You can still reply to your existing conversations.');
 const priority=membership.exists()&&isEntitlementActive(membership.data() as UserSubscription);
 const name=(user.displayName||'Member').slice(0,200);
 batch.set(doc(db,'support_tickets',id),{ownerUid:user.uid,ownerName:name,title:title.trim(),category,status:'open',isPriority:priority,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 batch.set(doc(db,'support_tickets',id,'messages',crypto.randomUUID()),{senderUid:user.uid,senderName:name,text:text.trim(),...(image?{image}:{}),createdAt:serverTimestamp()});
 try {await batch.commit();} catch(e){throw new Error(cloudErrorMessage(e,'open a support ticket'));}return id;
}
export function subscribeTicketMessages(id:string,callback:(v:TicketMessage[])=>void,error:(s:string)=>void){return onSnapshot(query(collection(database(),'support_tickets',id,'messages'),orderBy('createdAt','desc'),limit(500)),s=>callback(s.docs.map(d=>({id:d.id,...d.data()} as TicketMessage)).sort((a,b)=>(a.createdAt?.toMillis()||0)-(b.createdAt?.toMillis()||0))),e=>error(cloudErrorMessage(e,'load this conversation')));}
export async function replyTicket(id:string,user:AuthUser,text:string,image?:ImageAttachment){if(image&&!validImageAttachment(image))throw new Error('Invalid image attachment.');if(!text.trim()||text.trim().length>5000)throw new Error('Write a reply between 1 and 5,000 characters.');const db=database(),batch=writeBatch(db);batch.set(doc(db,'support_tickets',id,'messages',crypto.randomUUID()),{senderUid:user.uid,senderName:(user.displayName||'Member').slice(0,200),text:text.trim(),...(image?{image}:{}),createdAt:serverTimestamp()});batch.update(doc(db,'support_tickets',id),{updatedAt:serverTimestamp()});await batch.commit();}
export async function setTicketStatus(id:string,status:'open'|'in_progress'|'resolved'){await updateDoc(doc(database(),'support_tickets',id),{status,updatedAt:serverTimestamp()});}
export interface ModerationEvent extends Restriction {id:string;targetUid:string;}
export function subscribeModerationAudit(callback:(v:ModerationEvent[])=>void,error:(s:string)=>void){return onSnapshot(query(collection(database(),'moderation_audit'),limit(200)),s=>callback(s.docs.map(d=>({id:d.id,...d.data()} as ModerationEvent)).sort((a,b)=>(b.updatedAt?.toMillis()||0)-(a.updatedAt?.toMillis()||0))),e=>error(cloudErrorMessage(e,'load the audit history')));}

import type { UserSubscription, SubscriptionTier } from '../types/subscription.ts';
import { buildManualMembership,buildTrialMembership } from './manualMembership.ts';
import { publicStyle } from './publicIdentity.ts';
import { isEntitlementActive } from './subscriptionPlans.ts';
import { cloudErrorMessage } from './cloudErrors.ts';

export async function grantUserSubscription(
  targetUid: string,
  tier: SubscriptionTier = 'yearly',
  ticketId = ''
) {
  const db = database();
  const subRef = doc(db, 'subscriptions', targetUid);
  const auditRef = doc(db, 'membership_audit', crypto.randomUUID());
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(subRef);
    if (ticketId) {
      const ticketSnapshot = await transaction.get(doc(db, 'support_tickets', ticketId));
      if (!ticketSnapshot.exists() || ticketSnapshot.data().ownerUid !== targetUid) throw new Error('The ticket does not belong to this member.');
    }
    const existing = snapshot.exists() ? snapshot.data() as UserSubscription : null;
    const membership = buildManualMembership(targetUid, tier, existing);
    transaction.set(subRef, membership);
    transaction.set(auditRef, {targetUid, ticketId, tier, action:'grant', previousEnd:existing?.currentPeriodEnd || 0, newEnd:membership.currentPeriodEnd, createdAt:serverTimestamp()});
  });
}

export async function revokeUserSubscription(targetUid: string) {
 const db=database(),subRef=doc(db,'subscriptions',targetUid),profileRef=doc(db,'global_profiles',targetUid);
 await runTransaction(db,async transaction=>{
  const [admin,profile,account]=await Promise.all([transaction.get(doc(db,'admins',targetUid)),transaction.get(profileRef),transaction.get(doc(db,'users',targetUid))]);
  if(admin.exists())throw new Error('Admin access includes Plus+. Remove the admin role to remove those privileges.');
  const now=Date.now(),settings=account.data()?.settings||{};
  transaction.update(subRef,{status:'cancelled',isPlus:false,cancelAtPeriodEnd:true,cancelledAt:now,updatedAt:now});
  if(profile.exists())transaction.update(profileRef,{publicStyle:{plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false,admin:false},avatarUrl:settings.avatarUrl||'',updatedAt:now});
  transaction.set(doc(db,'membership_audit',crypto.randomUUID()),{targetUid,action:'revoke',createdAt:serverTimestamp()});
 });
}

export function subscribeSubscriptions(
  callback: (v: Record<string, UserSubscription>) => void,
  error: (s: string) => void
) {
  return onSnapshot(
    query(collection(database(), 'subscriptions'), limit(1000)),
    (s) =>
      callback(
        Object.fromEntries(
          s.docs.map((d) => [d.id, { ...d.data(), uid: d.id } as UserSubscription])
        )
      ),
    e => error(cloudErrorMessage(e,'load memberships'))
  );
}

export interface AdminRole {uid:string;canManageAdmins?:boolean;grantedBy?:string;}
export function subscribeAdminRoles(callback:(roles:AdminRole[])=>void,error:(message:string)=>void){return onSnapshot(collection(database(),'admins'),s=>callback(s.docs.map(d=>({uid:d.id,...d.data()}))),e=>error(cloudErrorMessage(e,'load administrators')));}
export function subscribeAdminUids(callback:(adminUids:Set<string>)=>void,error?:(msg:string)=>void){const db=getCloudDatabase();if(!db){callback(new Set());return()=>{};}return onSnapshot(collection(db,'admins'),s=>callback(new Set(s.docs.map(d=>d.id))),err=>{if(error)error(cloudErrorMessage(err,'load admin status'));});}
export async function grantAdminAccess(actorUid:string,targetUid:string){
 if(!targetUid||actorUid===targetUid)throw new Error('Choose another registered account.');
 const db=database();await runTransaction(db,async tx=>{
  const profileRef=doc(db,'global_profiles',targetUid),snap=await tx.get(profileRef);
  tx.set(doc(db,'admins',targetUid),{enabled:true,canManageAdmins:false,grantedBy:actorUid,grantedAt:serverTimestamp()});
  if(snap.exists()){const style=snap.data().publicStyle||{plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false};tx.update(profileRef,{publicStyle:{...style,admin:true,plusUntil:Math.max(style.plusUntil||0,4102444800000)},updatedAt:Date.now()});}
 });
}
export async function revokeAdminAccess(targetUid:string){
  const db=database();
  await runTransaction(db,async transaction=>{
    const roleRef=doc(db,'admins',targetUid),profileRef=doc(db,'global_profiles',targetUid);
    const [profile,subscription,account]=await Promise.all([
      transaction.get(profileRef),transaction.get(doc(db,'subscriptions',targetUid)),transaction.get(doc(db,'users',targetUid))
    ]);
    const membership=subscription.exists()?subscription.data() as UserSubscription:null;
    const style=publicStyle(account.data()?.settings||{},membership ? {...membership,adminAccess:false} : null);
    transaction.delete(roleRef);
    if(profile.exists())transaction.update(profileRef,{publicStyle:style,avatarUrl:isEntitlementActive(membership)?account.data()?.settings?.plusAnimatedAvatarUrl||account.data()?.settings?.avatarUrl||profile.data().avatarUrl:account.data()?.settings?.avatarUrl||profile.data().avatarUrl,updatedAt:Date.now()});
  });
}
export async function grantTrialMembership(targetUid:string,value:number,unit:'minutes'|'hours'|'days'){
 const db=database();await runTransaction(db,async transaction=>{const ref=doc(db,'subscriptions',targetUid),snapshot=await transaction.get(ref),old=snapshot.exists()?snapshot.data() as UserSubscription:null;
 const membership=buildTrialMembership(targetUid,value,unit,old);
 transaction.set(ref,membership);transaction.set(doc(db,'membership_audit',crypto.randomUUID()),{targetUid,action:'trial',durationMs:membership.currentPeriodEnd-membership.currentPeriodStart,newEnd:membership.currentPeriodEnd,createdAt:serverTimestamp()});});
}

export function subscribeOpenTicketCount(callback:(count:number)=>void,error:(message:string)=>void){
 return onSnapshot(query(collection(database(),'support_tickets'),where('status','==','open')),snapshot=>callback(snapshot.size),e=>error(cloudErrorMessage(e,'load open ticket count')));
}
