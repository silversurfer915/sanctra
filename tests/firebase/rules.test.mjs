import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, writeBatch, Timestamp, serverTimestamp, arrayRemove, onSnapshot } from 'firebase/firestore';
let env;
import { commitGroupMessage as sendCountedMessageWrite } from '../../src/utils/groupMessageWrite.ts';
function sendCountedMessage(db, groupId, id, message) {
 return sendCountedMessageWrite(db, groupId, message.senderUid, id, message);
}
const room = (id, owner, isPublic=true) => ({id,name:'Quiet room',description:'Study together',category:'General',activeCount:0,timerMode:'countup',badgeColor:'',isPublic,createdById:owner,createdByName:owner,createdAt:Date.now(),roomCode:'SANCT-ABCDEF12'});
const member = (uid, code) => ({uid,displayName:uid,avatarUrl:'',status:'focusing',currentSubject:'Physics',todaySeconds:120,streakDays:0,joinedAt:Date.now(),lastActiveAt:Date.now(),lastHeartbeat:Date.now(),...(code?{inviteCode:code}:{})});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-sanctra',firestore:{rules:await readFile(process.env.SANCTRA_RULES_FILE||'firestore.rules','utf8')}});});
after(async()=>{await env.cleanup();});
beforeEach(async()=>{await env.clearFirestore();});
test('study records remain owner-only, including empty arrays',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await assertSucceeds(setDoc(doc(a,'users','alice'),{sessions:[],subjects:[],tasks:[]}));
 await assertSucceeds(getDoc(doc(a,'users','alice')));
 await assertFails(getDoc(doc(b,'users','alice')));
 await assertFails(setDoc(doc(b,'users','alice'),{sessions:[]}));
 await assertFails(setDoc(doc(a,'users','alice'),{isAdmin:true}));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','alice')));
});
test('room listings enforce visibility and owners cannot be changed',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await assertSucceeds(setDoc(doc(a,'study_groups','public'),room('public','alice')));
 await assertSucceeds(setDoc(doc(a,'study_groups','private'),room('private','alice',false)));
 await assertSucceeds(getDocs(query(collection(b,'study_groups'),where('isPublic','==',true))));
 await assertSucceeds(getDocs(query(collection(a,'study_groups'),where('createdById','==','alice'))));
 await assertFails(getDocs(collection(b,'study_groups')));
 await assertFails(updateDoc(doc(b,'study_groups','public'),{name:'Changed'}));
 await assertFails(updateDoc(doc(a,'study_groups','public'),{createdById:'bob'}));
 await assertFails(updateDoc(doc(a,'study_groups','public'),{name:'x'.repeat(61)}));
});
test('private members need the invitation and may update only their presence',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','private'),room('private','alice',false));
 await assertFails(getDocs(collection(b,'study_groups','private','members')));
 await assertFails(setDoc(doc(b,'study_groups','private','members','bob'),member('bob','WRONG')));
 await assertSucceeds(setDoc(doc(b,'study_groups','private','members','bob'),member('bob','SANCT-ABCDEF12')));
 await assertSucceeds(getDocs(collection(b,'study_groups','private','members')));
 await assertFails(setDoc(doc(b,'study_groups','private','members','alice'),member('alice','SANCT-ABCDEF12')));
 await assertFails(updateDoc(doc(b,'study_groups','private','members','bob'),{todaySeconds:-1}));
 await assertSucceeds(updateDoc(doc(b,'study_groups','private','members','bob'),{status:'offline',lastHeartbeat:0}));
});
test('chat cannot impersonate another member or mutate sent messages',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','public'),room('public','alice'));
 await setDoc(doc(b,'study_groups','public','members','bob'),member('bob'));
 const message={groupId:'public',senderUid:'bob',senderName:'Bob',senderAvatar:'',text:'Hello',timestamp:Date.now(),type:'chat'};
 await assertSucceeds(sendCountedMessage(b,'public','one',message));
 await assertFails(setDoc(doc(b,'study_groups','public','messages','two'),{...message,senderUid:'alice'}));
 await assertFails(setDoc(doc(b,'study_groups','public','messages','long'),{...message,text:'x'.repeat(201)}));
 await assertFails(updateDoc(doc(b,'study_groups','public','messages','one'),{text:'changed'}));
});
test('invitation records are exact lookup only and cannot target another owner',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 const batch=writeBatch(a);batch.set(doc(a,'study_groups','private'),room('private','alice',false));batch.set(doc(a,'room_invites','SANCT-ABCDEF12'),{groupId:'private',createdById:'alice'});
 await assertSucceeds(batch.commit());
 await assertSucceeds(getDoc(doc(b,'room_invites','SANCT-ABCDEF12')));
 await assertFails(getDocs(collection(b,'room_invites')));
 await assertFails(setDoc(doc(b,'room_invites','STOLEN'),{groupId:'private',createdById:'bob'}));
});
test('leaving a private group revokes chat access; preferences are owner-only',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','private'),room('private','alice',false));
 await setDoc(doc(b,'study_groups','private','members','bob'),{...member('bob','SANCT-ABCDEF12'),joined:true});
 await assertSucceeds(getDocs(collection(b,'study_groups','private','messages')));
 await assertSucceeds(updateDoc(doc(b,'study_groups','private','members','bob'),{joined:false,status:'offline'}));
 await assertFails(getDocs(collection(b,'study_groups','private','messages')));
 const pref={joinedIds:['private'],primaryId:'private',mutedIds:[],readIds:[]};
 await assertSucceeds(setDoc(doc(b,'users','bob','community','preferences'),pref));
 await assertFails(getDoc(doc(a,'users','bob','community','preferences')));
 await assertFails(setDoc(doc(a,'users','bob','community','preferences'),pref));
});
test('only server-provisioned admins can publish announcements; roles cannot be self-assigned',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const notice={title:'Update',text:'New features',authorUid:'alice',timestamp:Date.now()};
 await assertFails(setDoc(doc(a,'admins','alice'),{enabled:true}));
 await assertFails(setDoc(doc(a,'announcements','one'),notice));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','alice'),{enabled:true}));
 await assertSucceeds(setDoc(doc(a,'announcements','one'),notice));
 await assertSucceeds(getDoc(doc(b,'announcements','one')));
 await assertFails(setDoc(doc(b,'announcements','two'),{...notice,authorUid:'alice'}));
 await assertFails(setDoc(doc(a,'announcements','three'),{...notice,authorUid:'bob'}));
});

async function seedAdmin(){await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'admins','admin'),{enabled:true});});}
test('daily chat limits are enforced across clients and cannot be reset or bypassed',async()=>{
 const a=env.authenticatedContext('alice').firestore(),day=Math.floor(Date.now()/86400000);
 await setDoc(doc(a,'study_groups','daily'),room('daily','alice'));await setDoc(doc(a,'study_groups','daily','members','alice'),member('alice'));
 const message={groupId:'daily',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Focus together',timestamp:Date.now(),type:'chat'};
 const usage={day,count:250,lastMessageId:'old',lastGroupId:'daily'};
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'users','alice','chat_days',String(day)),usage);});
 await assertFails(sendCountedMessage(a,'daily','free-over',message));
 await assertFails(setDoc(doc(a,'users','alice','chat_days',String(day)),{...usage,count:0}));
 await assertFails(setDoc(doc(a,'study_groups','daily','messages','uncounted'),message));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()+86400000});});
 await assertSucceeds(sendCountedMessage(a,'daily','vip-extra',message));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'users','alice','chat_days',String(day)),{...usage,count:500});});
 await assertFails(sendCountedMessage(a,'daily','vip-over',message));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()-1});await setDoc(doc(c.firestore(),'users','alice','chat_days',String(day)),usage);});
 await assertFails(sendCountedMessage(a,'daily','expired',message));
});
test('custom codes require active VIP and invitation ownership cannot be overwritten',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const custom={...room('custom','alice'),roomCode:'SANCT-CALM-SPACE',customCode:true};
 await assertFails(setDoc(doc(a,'study_groups','custom'),custom));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()+86400000});});
 const batch=writeBatch(a);batch.set(doc(a,'study_groups','custom'),custom);batch.set(doc(a,'room_invites','SANCT-CALM-SPACE'),{groupId:'custom',createdById:'alice'});await assertSucceeds(batch.commit());
 await assertFails(setDoc(doc(b,'room_invites','SANCT-CALM-SPACE'),{groupId:'other',createdById:'bob'}));
 await assertFails(updateDoc(doc(a,'study_groups','custom'),{roomCode:'SANCT-OTHER'}));
});
test('manual membership audit can be appended only by admins and cannot be rewritten',async()=>{
 await seedAdmin();const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore();
 const audit={targetUid:'alice',action:'grant',createdAt:serverTimestamp()};
 await assertFails(setDoc(doc(a,'membership_audit','self'),audit));await assertSucceeds(setDoc(doc(admin,'membership_audit','grant'),audit));
 await assertFails(updateDoc(doc(admin,'membership_audit','grant'),{targetUid:'bob'}));await assertFails(deleteDoc(doc(admin,'membership_audit','grant')));
});
test('announcements support admin edit/archive and preserve author and timestamp',async()=>{
 await seedAdmin();const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore(),ref=doc(a,'announcements','edit');
 await assertSucceeds(setDoc(ref,{title:'Update',text:'Original',authorUid:'admin',timestamp:Date.now()}));
 await assertSucceeds(updateDoc(ref,{text:'Edited',deleted:true}));
 await assertSucceeds(updateDoc(ref,{deleted:false}));
 await assertFails(updateDoc(doc(b,'announcements','edit'),{text:'Hijack'}));
 await assertFails(updateDoc(ref,{authorUid:'bob'}));
 await assertFails(updateDoc(ref,{title:''}));
});
test('platform directory is admin-only and presence uses own server timestamps',async()=>{
 await seedAdmin();const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore();
 const value={uid:'bob',displayName:'Bob',avatarUrl:'',isGuest:false,lastSeen:serverTimestamp()};
 await assertSucceeds(setDoc(doc(b,'platform_users','bob'),value));
 await assertSucceeds(getDocs(collection(a,'platform_users')));
 await assertFails(getDocs(collection(b,'platform_users')));
 await assertFails(setDoc(doc(b,'platform_users','admin'),{...value,uid:'admin'}));
 await assertFails(updateDoc(doc(b,'platform_users','bob'),{lastSeen:Date.now()}));
});
test('restrictions are admin-only, block cloud access, expire and cannot target admins',async()=>{
 await seedAdmin();const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore();
 const value={reason:'Spam',expiresAt:Date.now()+3600000,permanent:false,active:true,actorUid:'admin',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(a,'moderation','bob'),value));
 await assertSucceeds(getDoc(doc(b,'moderation','bob')));
 await assertFails(setDoc(doc(b,'users','bob'),{sessions:[]}));
 await assertFails(getDocs(collection(b,'announcements')));
 await assertFails(setDoc(doc(b,'moderation','bob'),{...value,active:false,actorUid:'bob'}));
 await assertFails(setDoc(doc(a,'moderation','admin'),value));
 await assertFails(setDoc(doc(a,'moderation','other'),{...value,reason:''}));
 await assertSucceeds(updateDoc(doc(a,'moderation','bob'),{active:false,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(b,'users','bob'),{sessions:[]}));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'moderation','bob'),{...value,expiresAt:Date.now()-1000});});
 await assertSucceeds(getDoc(doc(b,'users','bob')));
 await assertSucceeds(setDoc(doc(a,'moderation','bob'),{...value,permanent:true,expiresAt:0}));
 await assertFails(getDoc(doc(b,'users','bob')));
});
test('ticket threads are private and both owner/admin can reply and resolve',async()=>{
 await seedAdmin();const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore(),c=env.authenticatedContext('carol').firestore();
 const ticket={ownerUid:'bob',ownerName:'Bob',title:'Help',category:'issue',status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 const batch=writeBatch(b);batch.set(doc(b,'support_tickets','one'),ticket);batch.set(doc(b,'support_tickets','one','messages','first'),{senderUid:'bob',senderName:'Bob',text:'Issue',createdAt:serverTimestamp()});await assertSucceeds(batch.commit());
 await assertSucceeds(getDocs(query(collection(b,'support_tickets'),where('ownerUid','==','bob'))));
 await assertSucceeds(getDocs(collection(a,'support_tickets')));
 await assertFails(getDocs(collection(c,'support_tickets')));
 await assertFails(getDoc(doc(c,'support_tickets','one')));
 await assertFails(getDocs(collection(c,'support_tickets','one','messages')));
 await assertSucceeds(setDoc(doc(a,'support_tickets','one','messages','reply'),{senderUid:'admin',senderName:'Team',text:'Reply',createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(b,'support_tickets','one','messages','fake'),{senderUid:'admin',senderName:'Team',text:'Fake',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(b,'support_tickets','one'),{ownerUid:'carol',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(b,'support_tickets','missing','messages','orphan'),{senderUid:'bob',senderName:'Bob',text:'No parent',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(a,'support_tickets','one'),{status:'resolved',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(b,'support_tickets','one','messages','closed'),{senderUid:'bob',senderName:'Bob',text:'Closed',createdAt:serverTimestamp()}));
});
test('moderation audit is append-only and records atomic admin actions',async()=>{
 await seedAdmin();const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore();const value={reason:'Spam',expiresAt:0,permanent:true,active:true,actorUid:'admin',updatedAt:serverTimestamp()};
 const batch=writeBatch(a);batch.set(doc(a,'moderation','bob'),value);batch.set(doc(a,'moderation_audit','one'),{...value,targetUid:'bob'});await assertSucceeds(batch.commit());
 await assertSucceeds(getDocs(collection(a,'moderation_audit')));
 await assertFails(getDocs(collection(b,'moderation_audit')));
 await assertFails(updateDoc(doc(a,'moderation_audit','one'),{reason:'Rewrite'}));
});
test('atomic group creation includes owner membership; roles and deletion are owner protected',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),c=env.authenticatedContext('carol').firestore();
 const batch=writeBatch(a);batch.set(doc(a,'study_groups','circle'),{...room('circle','alice'),adminIds:[],deleted:false});batch.set(doc(a,'study_groups','circle','members','alice'),{...member('alice'),joined:true});batch.set(doc(a,'room_invites','SANCT-ABCDEF12'),{groupId:'circle',createdById:'alice'});await assertSucceeds(batch.commit());
 await assertSucceeds(setDoc(doc(b,'study_groups','circle','members','bob'),{...member('bob'),joined:true}));
 await assertFails(updateDoc(doc(b,'study_groups','circle'),{adminIds:['bob']}));
 await assertSucceeds(updateDoc(doc(a,'study_groups','circle'),{adminIds:['bob']}));
 await assertSucceeds(updateDoc(doc(b,'study_groups','circle'),{name:'Renamed by admin'}));
 await assertFails(updateDoc(doc(b,'study_groups','circle'),{deleted:true}));
 await assertFails(updateDoc(doc(b,'study_groups','circle'),{adminIds:['bob','carol']}));
 await assertFails(updateDoc(doc(c,'study_groups','circle'),{name:'Hijack'}));
 const message={groupId:'circle',senderUid:'bob',senderName:'Bob',senderAvatar:'',text:'Hello',timestamp:Date.now(),type:'chat'};
 await assertSucceeds(sendCountedMessage(b,'circle','one',message));
 await assertFails(deleteDoc(doc(c,'study_groups','circle','messages','one')));
 await assertSucceeds(deleteDoc(doc(b,'study_groups','circle','messages','one')));
 await assertSucceeds(updateDoc(doc(a,'study_groups','circle'),{deleted:true}));
 await assertFails(getDocs(collection(b,'study_groups','circle','messages')));
 await assertFails(updateDoc(doc(b,'study_groups','circle','members','bob'),{status:'focusing'}));
 await assertFails(setDoc(doc(c,'study_groups','circle','members','carol'),member('carol')));
 await assertFails(updateDoc(doc(a,'study_groups','circle'),{deleted:false}));
});
test('public group leave atomically revokes chat and own admin role without changing other roles',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','circle'),{...room('circle','alice'),adminIds:[],deleted:false});
 await setDoc(doc(b,'study_groups','circle','members','bob'),{...member('bob'),joined:true});
 await updateDoc(doc(a,'study_groups','circle'),{adminIds:['bob']});
 const batch=writeBatch(b);batch.update(doc(b,'study_groups','circle','members','bob'),{joined:false,status:'offline',lastHeartbeat:0});batch.update(doc(b,'study_groups','circle'),{adminIds:arrayRemove('bob')});await assertSucceeds(batch.commit());
 await assertFails(getDocs(collection(b,'study_groups','circle','messages')));
 await assertFails(updateDoc(doc(b,'study_groups','circle'),{name:'Old admin'}));
 await assertSucceeds(setDoc(doc(b,'study_groups','circle','members','bob'),{...member('bob'),joined:true}));
 await assertSucceeds(getDocs(collection(b,'study_groups','circle','messages')));
});
test('member presence and chat changes reach another client through live listeners',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','circle'),room('circle','alice'));
 await setDoc(doc(a,'study_groups','circle','members','alice'),{...member('alice'),joined:true});
 await setDoc(doc(b,'study_groups','circle','members','bob'),{...member('bob'),joined:true});
 const observed=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{off();reject(new Error('Live member update did not arrive'));},5000);const off=onSnapshot(doc(a,'study_groups','circle','members','bob'),snapshot=>{if(snapshot.data()?.statusMessage==='Working on mechanics'){clearTimeout(timeout);off();resolve();}},reject);});
 await updateDoc(doc(b,'study_groups','circle','members','bob'),{dailySeconds:{'2026-10-02':1800},liveSeconds:0,liveDate:'2026-10-02',focusStartedAt:Date.now(),statusMessage:'Working on mechanics'});await observed;
 const chatObserved=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{off();reject(new Error('Live chat did not arrive'));},5000);const off=onSnapshot(collection(a,'study_groups','circle','messages'),snapshot=>{if(snapshot.docs.some(d=>d.data().text==='Ready to focus')){clearTimeout(timeout);off();resolve();}},reject);});
 await sendCountedMessage(b,'circle','hello',{groupId:'circle',senderUid:'bob',senderName:'Bob',senderAvatar:'',text:'Ready to focus',timestamp:Date.now(),type:'chat'});await chatObserved;
 await assertFails(updateDoc(doc(a,'study_groups','circle','members','bob'),{todaySeconds:9999}));
});
test('platform owner can inspect private groups without joining and close them with an audit',async()=>{
 const a=env.authenticatedContext('alice').firestore(),admin=env.authenticatedContext('root').firestore(),b=env.authenticatedContext('bob').firestore();
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','root'),{enabled:true}));
 await setDoc(doc(a,'study_groups','private'),room('private','alice',false));await setDoc(doc(a,'study_groups','private','members','alice'),member('alice'));
 await sendCountedMessage(a,'private','one',{groupId:'private',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Private conversation',timestamp:Date.now(),type:'chat'});
 await assertSucceeds(getDocs(collection(admin,'study_groups')));await assertSucceeds(getDocs(collection(admin,'study_groups','private','members')));await assertSucceeds(getDocs(collection(admin,'study_groups','private','messages')));
 await assertFails(getDocs(collection(b,'study_groups','private','messages')));await assertFails(updateDoc(doc(b,'study_groups','private'),{deleted:true}));await assertFails(updateDoc(doc(admin,'study_groups','private'),{createdById:'root'}));
 const batch=writeBatch(admin);batch.update(doc(admin,'study_groups','private'),{deleted:true});batch.set(doc(admin,'group_moderation_audit','one'),{groupId:'private',groupName:'Quiet room',actorUid:'root',reason:'Community moderation',action:'delete',createdAt:serverTimestamp()});await assertSucceeds(batch.commit());
 await assertSucceeds(getDocs(collection(admin,'study_groups','private','messages')));await assertFails(getDocs(collection(a,'study_groups','private','messages')));await assertSucceeds(deleteDoc(doc(admin,'study_groups','private','messages','one')));await assertFails(updateDoc(doc(admin,'group_moderation_audit','one'),{reason:'Changed'}));
});
test('formatted announcements retain bounded fields and reject executable cover URLs',async()=>{
 const admin=env.authenticatedContext('root').firestore();await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','root'),{enabled:true}));
 const notice={title:'A new chapter',text:'## Focus\n**New tools**\n- Groups\n> A little room.',authorUid:'root',timestamp:Date.now(),category:'Product update',pinned:true,coverUrl:'/backgrounds/illustrated-study-desk.v2.webp'};
 await assertSucceeds(setDoc(doc(admin,'announcements','rich'),notice));await assertFails(setDoc(doc(admin,'announcements','bad'),{...notice,coverUrl:'javascript:alert(1)'}));await assertFails(setDoc(doc(admin,'announcements','extra'),{...notice,html:'<script>'}));await assertFails(updateDoc(doc(admin,'announcements','rich'),{authorUid:'bob'}));
});
test('retired competitive profile collection rejects client access',async()=>{
 const a=env.authenticatedContext('alice',{firebase:{sign_in_provider:'google.com'}}).firestore();
 await assertFails(setDoc(doc(a,'competitive_profiles','alice'),{uid:'alice'}));
 await assertFails(getDoc(doc(a,'competitive_profiles','alice')));
 await assertFails(deleteDoc(doc(a,'competitive_profiles','alice')));
});
test('new support categories create private live conversations without granting other users access',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 for(const category of ['account','report','partnership','premium']){const batch=writeBatch(a);batch.set(doc(a,'support_tickets',category),{ownerUid:'alice',ownerName:'Alice',title:'Help please',category,status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});batch.set(doc(a,'support_tickets',category,'messages','one'),{senderUid:'alice',senderName:'Alice',text:'My private request',createdAt:serverTimestamp()});await assertSucceeds(batch.commit());await assertFails(getDocs(collection(b,'support_tickets',category,'messages')));}
});
test('operational controls are owner-only and pause new conversations without losing existing tickets',async()=>{
 const admin=env.authenticatedContext('root').firestore(),a=env.authenticatedContext('alice').firestore();await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','root'),{enabled:true}));
 const ticket={ownerUid:'alice',ownerName:'Alice',title:'Question',category:'question',status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};await setDoc(doc(a,'support_tickets','old'),ticket);
 const controls={groupsEnabled:false,supportEnabled:false,rankingsEnabled:false,notice:'A little maintenance',actorUid:'root',updatedAt:serverTimestamp()};await assertFails(setDoc(doc(a,'platform','controls'),{...controls,actorUid:'alice'}));await assertSucceeds(setDoc(doc(admin,'platform','controls'),controls));await assertSucceeds(getDoc(doc(a,'platform','controls')));
 await assertFails(setDoc(doc(a,'study_groups','paused'),room('paused','alice')));await assertFails(setDoc(doc(a,'support_tickets','new'),ticket));await assertSucceeds(getDoc(doc(a,'support_tickets','old')));
 const reply=writeBatch(a);reply.set(doc(a,'support_tickets','old','messages','reply'),{senderUid:'alice',senderName:'Alice',text:'Still need help',createdAt:serverTimestamp()});reply.update(doc(a,'support_tickets','old'),{updatedAt:serverTimestamp()});await assertSucceeds(reply.commit());
 await assertFails(updateDoc(doc(admin,'platform','controls'),{isAdmin:true}));
});
test('subscriptions and invoices are server-managed only, readable by owner/admin, never client-writable',async()=>{
 await seedAdmin();
 const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const subData={uid:'alice',tier:'monthly',status:'active',isPlus:true,currentPeriodStart:Date.now(),currentPeriodEnd:Date.now()+2592000000,cancelAtPeriodEnd:false,createdAt:Date.now(),updatedAt:Date.now()};
 const invData={id:'inv_1',uid:'alice',amount:59,amountInPaise:5900,currency:'INR',status:'paid',tier:'monthly',periodStart:Date.now(),periodEnd:Date.now()+2592000000,paidAt:Date.now(),razorpayPaymentId:'pay_1',receiptNumber:'SANCTRA-1'};
 await assertFails(setDoc(doc(a,'subscriptions','alice'),subData));
 await assertFails(setDoc(doc(a,'subscriptions','alice','invoices','inv_1'),invData));
 await assertFails(setDoc(doc(b,'subscriptions','alice'),subData));
 // Admin can grant subscription and invoice directly
 await assertSucceeds(setDoc(doc(admin,'subscriptions','alice'),subData));
 await assertSucceeds(setDoc(doc(admin,'subscriptions','alice','invoices','inv_1'),invData));
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'payment_webhooks','evt_1'),{event:'payment.captured',processedAt:Date.now()});
 });
 await assertSucceeds(getDoc(doc(a,'subscriptions','alice')));
 await assertSucceeds(getDoc(doc(a,'subscriptions','alice','invoices','inv_1')));
 await assertFails(getDoc(doc(b,'subscriptions','alice')));
 await assertFails(getDoc(doc(b,'subscriptions','alice','invoices','inv_1')));
 await assertSucceeds(getDoc(doc(admin,'subscriptions','alice')));
 await assertSucceeds(getDoc(doc(admin,'subscriptions','alice','invoices','inv_1')));
 await assertFails(updateDoc(doc(a,'subscriptions','alice'),{isPlus:true}));
 await assertFails(deleteDoc(doc(a,'subscriptions','alice')));
 await assertFails(getDoc(doc(a,'payment_webhooks','evt_1')));
 await assertFails(setDoc(doc(a,'payment_webhooks','evt_2'),{event:'fake'}));
});

test('priority support requires an active VIP membership',async()=>{
 const a=env.authenticatedContext('alice').firestore();
 const ticket={ownerUid:'alice',ownerName:'Alice',title:'Help please',category:'question',status:'open',isPriority:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 await assertFails(setDoc(doc(a,'support_tickets','priority-free'),ticket));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()+86400000}));
 await assertSucceeds(setDoc(doc(a,'support_tickets','priority-vip'),ticket));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()-86400000}));
 await assertFails(setDoc(doc(a,'support_tickets','priority-expired'),ticket));
});

test('latest maintenance controls save all bounded fields without granting member access',async()=>{
 await seedAdmin();const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore();
 const controls={maintenanceMode:true,groupsEnabled:false,supportEnabled:true,rankingsEnabled:false,syllabusEnabled:false,notice:'Scheduled care',noticeType:'maintenance',maintenanceMessage:'Improving synchronization',maintenanceEta:'Back this evening',actorUid:'admin',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(admin,'platform','controls'),controls));
 await assertFails(setDoc(doc(a,'platform','controls'),{...controls,actorUid:'alice'}));
 await assertFails(updateDoc(doc(admin,'platform','controls'),{noticeType:'bad'}));
 await assertFails(updateDoc(doc(admin,'platform','controls'),{maintenanceMessage:'x'.repeat(2001)}));
});
test('tickets work with partial legacy controls and preserve private lifecycle',async()=>{
 await seedAdmin();const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'platform','controls'),{notice:'Earlier release'}));
 const ticket={ownerUid:'alice',ownerName:'Alice',title:'Issue report',category:'issue',status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 const opening=writeBatch(a);opening.set(doc(a,'support_tickets','flow'),ticket);opening.set(doc(a,'support_tickets','flow','messages','first'),{senderUid:'alice',senderName:'Alice',text:'Please help',createdAt:serverTimestamp()});await assertSucceeds(opening.commit());
 await assertSucceeds(getDocs(query(collection(a,'support_tickets'),where('ownerUid','==','alice'))));await assertSucceeds(getDocs(collection(admin,'support_tickets')));await assertFails(getDocs(collection(b,'support_tickets')));
 await assertSucceeds(updateDoc(doc(admin,'support_tickets','flow'),{status:'resolved',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(a,'support_tickets','flow','messages','closed'),{senderUid:'alice',senderName:'Alice',text:'Reply',createdAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(doc(a,'support_tickets','flow'),{status:'open',updatedAt:serverTimestamp()}));
 const reply=writeBatch(admin);reply.update(doc(admin,'support_tickets','flow'),{updatedAt:serverTimestamp()});reply.set(doc(admin,'support_tickets','flow','messages','answer'),{senderUid:'admin',senderName:'Team',text:'A reply',createdAt:serverTimestamp()});await assertSucceeds(reply.commit());
 await assertFails(getDocs(collection(b,'support_tickets','flow','messages')));
});
test('global study totals are account-owned, private details cannot leak, and guests cannot publish',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),guest=env.authenticatedContext('guest',{firebase:{sign_in_provider:'anonymous'}}).firestore();
 await setDoc(doc(a,'users','alice'),{sessions:[],settings:{rankingOptIn:true}});
 const data={uid:'alice',displayName:'Alice',avatarUrl:'',updatedAt:Date.now(),dayKey:'2026-10-02',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:120,weekSeconds:120,monthSeconds:120};
 await assertSucceeds(setDoc(doc(a,'global_profiles','alice'),data));await assertSucceeds(getDoc(doc(b,'global_profiles','alice')));
 await assertFails(setDoc(doc(b,'global_profiles','alice'),data));await assertFails(updateDoc(doc(a,'global_profiles','alice'),{email:'private@example.com'}));
 await assertFails(setDoc(doc(guest,'global_profiles','guest'),{...data,uid:'guest'}));
 await assertSucceeds(deleteDoc(doc(a,'global_profiles','alice')));
});
test('guest presence can be removed on logout or by an admin only after an hour',async()=>{
 await seedAdmin();const a=env.authenticatedContext('alice').firestore(),admin=env.authenticatedContext('admin').firestore();
 await setDoc(doc(a,'platform_users','alice'),{uid:'alice',displayName:'Guest',avatarUrl:'',isGuest:true,lastSeen:serverTimestamp()});
 await assertFails(deleteDoc(doc(admin,'platform_users','alice')));await assertSucceeds(deleteDoc(doc(a,'platform_users','alice')));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'platform_users','old'),{uid:'old',isGuest:true,lastSeen:new Date(Date.now()-3601000)}));
 await assertSucceeds(deleteDoc(doc(admin,'platform_users','old')));
 await setDoc(doc(a,'platform_users','alice'),{uid:'alice',displayName:'Alice',avatarUrl:'',isGuest:false,lastSeen:serverTimestamp()});await assertFails(deleteDoc(doc(a,'platform_users','alice')));
});
test('automatic global profiles accept registered users without opt-in and reject forged badges',async()=>{
 const a=env.authenticatedContext('alice').firestore();
 const style={plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false,admin:false};
 const data={uid:'alice',displayName:'Alice',avatarUrl:'',updatedAt:Date.now(),dayKey:'2026-10-02',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:120,weekSeconds:120,monthSeconds:120,publicStyle:style};
 await assertSucceeds(setDoc(doc(a,'global_profiles','alice'),data));await assertFails(updateDoc(doc(a,'global_profiles','alice'),{publicStyle:{...style,admin:true}}));await assertFails(updateDoc(doc(a,'global_profiles','alice'),{publicStyle:{...style,plusUntil:Date.now()+60000,cover:'https://example.com/banner.webp'}}));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:Date.now()+3600000,isTrial:true}));
 const sub=await getDoc(doc(a,'subscriptions','alice'));await assertSucceeds(updateDoc(doc(a,'global_profiles','alice'),{publicStyle:{...style,plusUntil:sub.data().currentPeriodEnd,trial:true,cover:'https://example.com/banner.webp'}}));
});
test('trusted manager can delegate admin access; delegates cannot promote themselves or replace the manager',async()=>{
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'admins','manager'),{enabled:true,canManageAdmins:true}));
 const manager=env.authenticatedContext('manager').firestore(),delegate=env.authenticatedContext('delegate').firestore(),bob=env.authenticatedContext('bob').firestore();
 const role={enabled:true,canManageAdmins:false,grantedBy:'manager',grantedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(manager,'admins','delegate'),role));await assertFails(setDoc(doc(delegate,'admins','bob'),{...role,grantedBy:'delegate'}));await assertFails(updateDoc(doc(delegate,'admins','delegate'),{canManageAdmins:true}));await assertFails(deleteDoc(doc(manager,'admins','manager')));
 await setDoc(doc(bob,'users','bob'),{sessions:[],tasks:[]});await setDoc(doc(bob,'users','bob','community','preferences'),{joinedIds:[],primaryId:null,mutedIds:[],readIds:[]});
 await assertSucceeds(getDoc(doc(delegate,'users','bob')));await assertSucceeds(getDoc(doc(delegate,'users','bob','community','preferences')));await assertSucceeds(setDoc(doc(delegate,'subscriptions','bob'),{uid:'bob',isPlus:true,isTrial:true,currentPeriodEnd:Date.now()+60000,status:'active'}));
 await assertSucceeds(deleteDoc(doc(manager,'admins','delegate')));await assertFails(getDoc(doc(delegate,'users','bob')));
});

test('admin revocation clears offline public perks atomically without permission to change scores',async()=>{
 const future=Date.now()+3600000,paid={plusUntil:future,cover:'https://example.com/banner.webp',scene:'observatory',frame:'golden-thread',aura:'celestial',trial:true,admin:false},free={plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false,admin:false};
 const data={uid:'alice',displayName:'Alice',avatarUrl:'https://example.com/avatar.gif',updatedAt:Date.now(),dayKey:'2026-10-02',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:120,weekSeconds:120,monthSeconds:120,publicStyle:paid};
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,'admins','manager'),{enabled:true});await setDoc(doc(db,'subscriptions','alice'),{isPlus:true,status:'active',currentPeriodEnd:future});await setDoc(doc(db,'global_profiles','alice'),data);});
 const manager=env.authenticatedContext('manager').firestore(),alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore();
 const batch=writeBatch(manager);batch.update(doc(manager,'subscriptions','alice'),{isPlus:false,status:'cancelled'});batch.update(doc(manager,'global_profiles','alice'),{publicStyle:free,avatarUrl:'',updatedAt:Date.now()});await assertSucceeds(batch.commit());
 const result=(await getDoc(doc(bob,'global_profiles','alice'))).data();if(result.publicStyle.plusUntil!==0||result.daySeconds!==120)throw Error('Revocation failed to preserve score while clearing perks');
 await assertFails(updateDoc(doc(alice,'global_profiles','alice'),{publicStyle:paid}));await assertFails(updateDoc(doc(bob,'global_profiles','alice'),{publicStyle:free}));await assertFails(updateDoc(doc(manager,'global_profiles','alice'),{daySeconds:999}));
});
test('delegated admin removal preserves independently purchased Plus and public style',async()=>{
 const until=Date.now()+3600000;
 const style={plusUntil:until,cover:'https://example.com/cover.webp',scene:'observatory',frame:'golden-thread',aura:'celestial',trial:true,admin:true};
 const profile={uid:'delegate',displayName:'Delegate',avatarUrl:'',updatedAt:Date.now(),dayKey:'2026-10-03',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:60,weekSeconds:60,monthSeconds:60,publicStyle:style};
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  await setDoc(doc(db,'admins','manager'),{enabled:true,canManageAdmins:true});
  await setDoc(doc(db,'admins','delegate'),{enabled:true,canManageAdmins:false});
  await setDoc(doc(db,'subscriptions','delegate'),{isPlus:true,isTrial:true,status:'active',currentPeriodEnd:until});
  await setDoc(doc(db,'global_profiles','delegate'),profile);
 });
 const db=env.authenticatedContext('manager').firestore();
 const batch=writeBatch(db);batch.delete(doc(db,'admins','delegate'));batch.update(doc(db,'global_profiles','delegate'),{publicStyle:{...style,admin:false},updatedAt:Date.now()});
 await assertSucceeds(batch.commit());
 const sub=(await getDoc(doc(db,'subscriptions','delegate'))).data();
 if(!sub.isPlus||sub.currentPeriodEnd!==until)throw Error('Paid entitlement lost');
 const result=(await getDoc(doc(db,'global_profiles','delegate'))).data();
 if(result.publicStyle.admin||result.publicStyle.plusUntil!==until||result.daySeconds!==60)throw Error('Role revocation damaged membership projection');
});

test('image messages retain group privacy and reject unsafe or oversized payloads',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','images'),room('images','alice',false));
 await setDoc(doc(a,'study_groups','images','members','alice'),member('alice'));
 const message={groupId:'images',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Shared an image.',timestamp:Date.now(),type:'chat',image:{dataUrl:'data:image/jpeg;base64,/9j/AA==',width:40,height:30}};
 await assertSucceeds(sendCountedMessage(a,'images','image',message));
 await assertFails(getDoc(doc(b,'study_groups','images','messages','image')));
 for(const [id,image] of Object.entries({url:{...message.image,dataUrl:'https://example.com/image.jpg'},svg:{...message.image,dataUrl:'data:image/svg+xml;base64,AAAA'},large:{...message.image,dataUrl:'data:image/jpeg;base64,'+'A'.repeat(180000)},dimensions:{...message.image,width:1601}}))await assertFails(sendCountedMessage(a,'images',id,{...message,image}));
});
test('support image replies are visible only to the ticket participants',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'support_tickets','image'),{ownerUid:'alice',ownerName:'Alice',title:'Help',category:'issue',status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 const message={senderUid:'alice',senderName:'Alice',text:'Screenshot',createdAt:serverTimestamp(),image:{dataUrl:'data:image/jpeg;base64,/9j/AA==',width:40,height:30}};
 await assertSucceeds(setDoc(doc(a,'support_tickets','image','messages','one'),message));
 await assertFails(getDoc(doc(b,'support_tickets','image','messages','one')));
 await assertFails(setDoc(doc(a,'support_tickets','image','messages','invalid'),{...message,image:{...message.image,height:-1}}));
});

test('only admins can publish bounded popup delivery options',async()=>{
 await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'admins','admin'),{enabled:true});});
 const a=env.authenticatedContext('admin').firestore(),b=env.authenticatedContext('bob').firestore();
 const item={title:'What is new',text:'A clearer app',authorUid:'admin',timestamp:Date.now(),category:'Product update',popupMode:'refresh',expiresAt:Date.now()+86400000,autoCloseSeconds:30};
 await assertSucceeds(setDoc(doc(a,'announcements','popup'),item));
 await assertFails(setDoc(doc(b,'announcements','fake'),{...item,authorUid:'bob'}));
 await assertFails(updateDoc(doc(a,'announcements','popup'),{popupMode:'always'}));
 await assertFails(updateDoc(doc(a,'announcements','popup'),{autoCloseSeconds:3601}));
 await assertFails(updateDoc(doc(a,'announcements','popup'),{expiresAt:-1}));
 await assertSucceeds(updateDoc(doc(a,'announcements','popup'),{popupMode:'off'}));
});

function integrityFixture(uid='alice',patch={}) {
 const now=new Date(),day=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 return {uid,registered:true,dayStart:day,weekStart:day-((now.getUTCDay()+6)%7)*86400000,monthStart:Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),daySeconds:0,weekSeconds:0,monthSeconds:0,lastTick:serverTimestamp(),deviceId:'device-a',timerId:'timer',active:true,clientSeconds:0,credited:0,integrityStatus:'clear',reason:'',...patch};
}
const rankingOf=c=>Object.fromEntries(['uid','registered','dayStart','weekStart','monthStart','daySeconds','weekSeconds','monthSeconds','integrityStatus'].map(k=>[k,c[k]]));
async function setVerifiedClock(db,uid,value){const b=writeBatch(db);b.set(doc(db,'study_integrity',uid),value);if(value.registered)b.set(doc(db,'study_rankings',uid),rankingOf(value));return b.commit();}
async function updateVerifiedClock(ref,patch){const old=(await getDoc(ref)).data();if(patch.lastTick && patch.stretchStart===undefined)patch={...patch,stretchStart:old.active?(old.stretchStart??old.lastTick.toMillis()):Date.now()};const next={...old,...patch},b=writeBatch(ref.firestore);b.update(ref,patch);if(next.registered)b.set(doc(ref.firestore,'study_rankings',ref.id),rankingOf(next));return b.commit();}
test('verified clocks cannot be preloaded, backdated, forged for others or deleted',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const ref=doc(a,'study_integrity','alice');
 await assertFails(setVerifiedClock(a,'alice',integrityFixture('alice',{daySeconds:3600})));
 await assertFails(setVerifiedClock(a,'alice',integrityFixture('alice',{dayStart:0})));
 await assertFails(setDoc(doc(b,'study_integrity','alice'),integrityFixture()));
 await assertSucceeds(setVerifiedClock(a,'alice',integrityFixture()));
 await assertFails(updateVerifiedClock(ref,{daySeconds:3600,weekSeconds:3600,monthSeconds:3600,credited:90,lastTick:serverTimestamp()}));
 await assertFails(deleteDoc(ref));
});
test('server clock accepts bounded time and blocks parallel devices regardless of client display',async()=>{
 const a=env.authenticatedContext('alice').firestore(),ref=doc(a,'study_integrity','alice');
 const {Timestamp}=await import('firebase/firestore');
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture('alice',{lastTick:Timestamp.fromMillis(Date.now()-30000)})));
 await assertFails(updateVerifiedClock(ref,{deviceId:'device-b',timerId:'other',clientSeconds:20,credited:20,daySeconds:20,weekSeconds:20,monthSeconds:20,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:29,credited:29,daySeconds:29,weekSeconds:29,monthSeconds:29,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:9999,credited:0,integrityStatus:'clear',lastTick:serverTimestamp()}));
 await assertFails(updateVerifiedClock(ref,{clientSeconds:9999,credited:100,daySeconds:129,weekSeconds:129,monthSeconds:129,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{integrityStatus:'clear',reason:'',lastTick:serverTimestamp()}));
});
test('only admins can confirm or clear a flag with a private review note',async()=>{
 await seedAdmin();const a=env.authenticatedContext('alice').firestore(),admin=env.authenticatedContext('admin').firestore();
 await assertSucceeds(setVerifiedClock(a,'alice',integrityFixture()));
 await assertFails(updateDoc(doc(a,'study_integrity','alice'),{integrityStatus:'confirmed'}));
 await assertFails(updateDoc(doc(admin,'study_integrity','alice'),{integrityStatus:'confirmed'}));
 const batch=writeBatch(admin);batch.update(doc(admin,'study_integrity','alice'),{integrityStatus:'confirmed'});batch.set(doc(admin,'study_rankings','alice'),rankingOf({...integrityFixture(),integrityStatus:'confirmed'}));batch.set(doc(admin,'study_integrity_reviews','alice'),{actorUid:'admin',status:'confirmed',note:'Reviewed reproducible manipulation evidence.',updatedAt:serverTimestamp()});await assertSucceeds(batch.commit());
 await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'study_integrity_reviews','alice')));
 await assertSucceeds(getDoc(doc(a,'study_integrity_reviews','alice')));
});

test('restored historical credit stays intact while new increments remain server bounded',async()=>{
 const a=env.authenticatedContext('alice').firestore(),ref=doc(a,'study_integrity','alice');const {Timestamp}=await import('firebase/firestore');
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture('alice',{daySeconds:4500,weekSeconds:4500,monthSeconds:4500,lastTick:Timestamp.fromMillis(Date.now()-30000)})));
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:29,credited:29,daySeconds:4529,weekSeconds:4529,monthSeconds:4529,lastTick:serverTimestamp()}));
 await assertFails(updateVerifiedClock(ref,{daySeconds:9000,weekSeconds:9000,monthSeconds:9000,lastTick:serverTimestamp()}));
 await assertFails(setDoc(doc(a,'ranking_migrations','alice'),{daySeconds:99999}));
});

test('session removal can only lower own scores and preserves the verification clock and flags',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture('alice',{daySeconds:4500,weekSeconds:4500,monthSeconds:4500,integrityStatus:'review',reason:'timer_jump'})));
 const ref=doc(a,'study_integrity','alice');
 await assertSucceeds(updateVerifiedClock(ref,{daySeconds:900,weekSeconds:900,monthSeconds:900}));
 await assertFails(updateVerifiedClock(ref,{daySeconds:4500,weekSeconds:4500,monthSeconds:4500}));
 await assertFails(updateVerifiedClock(ref,{daySeconds:-1}));
 await assertFails(updateVerifiedClock(ref,{daySeconds:0,integrityStatus:'clear',reason:''}));
 await assertFails(updateVerifiedClock(ref,{daySeconds:0,clientSeconds:0,lastTick:serverTimestamp()}));
 await assertFails(updateDoc(doc(b,'study_integrity','alice'),{daySeconds:0}));
 const receipt=doc(a,'study_integrity','alice','deleted_sessions','session-a');
 await assertSucceeds(setDoc(receipt,{sessionId:'session-a',deletedAt:serverTimestamp()}));
 await assertFails(setDoc(receipt,{sessionId:'session-a',deletedAt:serverTimestamp()}));
 await assertFails(deleteDoc(receipt));
});

const emptyStyle={plusUntil:0,cover:'',scene:'none',frame:'none',aura:'none',trial:false,admin:false};
const profileFixture=(uid)=>({uid,displayName:'Member',avatarUrl:'',updatedAt:Date.now(),dayKey:'2026-10-03',weekKey:'2026-09-28',monthKey:'2026-10-01',daySeconds:0,weekSeconds:0,monthSeconds:0,publicStyle:emptyStyle});
test('audit: standalone admin avatar and banner rewrites are rejected',async()=>{
 await seedAdmin();const a=env.authenticatedContext('alice').firestore(),admin=env.authenticatedContext('admin').firestore();
 await assertSucceeds(setDoc(doc(a,'global_profiles','alice'),profileFixture('alice')));
 await assertFails(updateDoc(doc(admin,'global_profiles','alice'),{avatarUrl:'https://tracker.example/x.gif',updatedAt:Date.now()}));
 await assertFails(updateDoc(doc(admin,'global_profiles','alice'),{publicStyle:{...emptyStyle,cover:'https://tracker.example/banner.webp'},updatedAt:Date.now()}));
});
test('audit: trusted admin grant and public badge are atomic; grant cannot change identity',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'admins','manager'),{enabled:true,canManageAdmins:true}));
 const a=env.authenticatedContext('alice').firestore(),manager=env.authenticatedContext('manager').firestore();await setDoc(doc(a,'global_profiles','alice'),profileFixture('alice'));
 const batch=writeBatch(manager);batch.set(doc(manager,'admins','alice'),{enabled:true,canManageAdmins:false,grantedBy:'manager',grantedAt:serverTimestamp()});batch.update(doc(manager,'global_profiles','alice'),{publicStyle:{...emptyStyle,admin:true,plusUntil:4102444800000},updatedAt:Date.now()});await assertSucceeds(batch.commit());
 const bob=env.authenticatedContext('bob').firestore();await setDoc(doc(bob,'global_profiles','bob'),profileFixture('bob'));
 const malicious=writeBatch(manager);malicious.set(doc(manager,'admins','bob'),{enabled:true,canManageAdmins:false,grantedBy:'manager',grantedAt:serverTimestamp()});malicious.update(doc(manager,'global_profiles','bob'),{publicStyle:{...emptyStyle,admin:true,plusUntil:4102444800000},avatarUrl:'https://tracker.example/x.gif',updatedAt:Date.now()});await assertFails(malicious.commit());
});
test('audit: public profile media rejects unsafe protocols, credentials and invalid presets',async()=>{
 const a=env.authenticatedContext('alice').firestore(),ref=doc(a,'global_profiles','alice');await setDoc(ref,profileFixture('alice'));
 for(const avatarUrl of ['javascript:alert(1)','data:image/svg+xml,hi','http://insecure.example/avatar.png','https://user:pass@example.com/x.png','/private/x.png'])await assertFails(updateDoc(ref,{avatarUrl,updatedAt:Date.now()}));
 await assertSucceeds(updateDoc(ref,{avatarUrl:'/avatars/identity-moonstone.svg',updatedAt:Date.now()}));
});
test('audit: private clock diagnostics are inaccessible to guests and other members',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture()));
 const guest=env.authenticatedContext('guest',{firebase:{sign_in_provider:'anonymous'}}).firestore(),bob=env.authenticatedContext('bob').firestore(),a=env.authenticatedContext('alice').firestore();
 for(const db of [guest,bob]){await assertFails(getDoc(doc(db,'study_integrity','alice')));await assertFails(getDocs(collection(db,'study_integrity')));}
 await assertSucceeds(getDoc(doc(a,'study_integrity','alice')));
});
test('audit: public ranking projection is exact, readable and cannot contain private fields or forged totals',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();await setVerifiedClock(a,'alice',integrityFixture());
 await assertSucceeds(getDocs(query(collection(b,'study_rankings'),where('registered','==',true))));
 const ref=doc(a,'study_rankings','alice');await assertFails(updateDoc(ref,{daySeconds:999}));await assertFails(updateDoc(ref,{deviceId:'leak'}));
 await assertFails(updateDoc(doc(b,'study_rankings','alice'),{daySeconds:0}));
 await assertFails(updateDoc(doc(a,'study_integrity','alice'),{daySeconds:0,weekSeconds:0,monthSeconds:0,integrityStatus:'review',reason:'timer_jump'}));
});

test('login-only: anonymous sessions cannot access workspace data or create records',async()=>{
 const g=env.authenticatedContext('retired-session',{firebase:{sign_in_provider:'anonymous'}}).firestore();
 for(const collectionName of ['study_groups','study_rankings','global_profiles','announcements'])await assertFails(getDocs(collection(g,collectionName)));
 await assertFails(setDoc(doc(g,'users','retired-session'),{sessions:[],settings:{}}));
 await assertFails(getDoc(doc(g,'users','retired-session')));
 await assertFails(setDoc(doc(g,'platform_users','retired-session'),{uid:'retired-session',displayName:'Visitor',avatarUrl:'',isGuest:true,lastSeen:serverTimestamp()}));
});

test('AI allowance increments atomically and cannot be reset, skipped or borrowed',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();const day=Math.floor(Date.now()/86400000),ref=doc(a,'users','alice','ai_days',String(day));
 for(let count=1;count<=3;count++)await assertSucceeds(setDoc(ref,{day,count,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{day,count:4,updatedAt:serverTimestamp()}));await assertFails(setDoc(ref,{day,count:0,updatedAt:serverTimestamp()}));await assertFails(deleteDoc(ref));await assertFails(getDoc(doc(b,'users','alice','ai_days',String(day))));
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'admins','alice'),{enabled:true,canManageAdmins:false});});
 for(let count=4;count<=12;count++)await assertSucceeds(setDoc(ref,{day,count,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(ref,{day,count:13,updatedAt:serverTimestamp()}));
});

test('only admins can grant extra daily AI messages and grants extend the shared limit',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),day=Math.floor(Date.now()/86400000);
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'admins','alice'),{enabled:true});});
 const grant=doc(a,'ai_access','bob');
 await assertFails(setDoc(doc(b,'ai_access','bob'),{extraDaily:100,grantedBy:'bob',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(grant,{extraDaily:-1,grantedBy:'alice',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(grant,{extraDaily:2,grantedBy:'alice',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(b,'ai_access','bob')));
 const ref=doc(b,'users','bob','ai_days',String(day));
 for(let count=1;count<=5;count++)await assertSucceeds(setDoc(ref,{day,count,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{day,count:6,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(grant,{extraDaily:0,grantedBy:'alice',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{day,count:6,updatedAt:serverTimestamp()}));
});
test('calendar events are owner-only and sync secrets are server-only',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 await assertSucceeds(setDoc(doc(a,'users','alice'),{calendarEvents:[]}));
 await assertFails(updateDoc(doc(b,'users','alice'),{calendarEvents:[]}));
 await assertFails(setDoc(doc(a,'users','alice'),{calendarEvents:'invalid'}));
 await assertFails(setDoc(doc(a,'calendar_credentials','alice'),{token:'test'}));
 await assertFails(getDoc(doc(a,'calendar_credentials','alice')));
});

test('Bug 12, 15, 23: long continuous sessions, server-authoritative elapsed without drift penalty, and local timezone rollovers',async()=>{
 const a=env.authenticatedContext('alice').firestore();
 const ref=doc(a,'study_integrity','alice');
 const {Timestamp}=await import('firebase/firestore');

 // Bug 23: Local timezone period rollover within 24h of request.time
 const localDay=Date.now()-18000000; // 5 hours ago
 const localWeek=localDay-2*86400000; // 2 days ago
 const localMonth=localDay-4*86400000; // 4 days ago
 await assertSucceeds(setVerifiedClock(a,'alice',integrityFixture('alice',{dayStart:localDay,weekStart:localWeek,monthStart:localMonth})));

 // Reject dayStart older than 24 hours
 await assertFails(setVerifiedClock(a,'alice-stale',integrityFixture('alice-stale',{dayStart:Date.now()-86400000-1000})));
 // Reject weekStart older than 6 days
 await assertFails(setVerifiedClock(a,'alice-week',integrityFixture('alice-week',{dayStart:localDay,weekStart:localDay-7*86400000})));
 // Reject monthStart older than 31 days
 await assertFails(setVerifiedClock(a,'alice-month',integrityFixture('alice-month',{dayStart:localDay,monthStart:localDay-32*86400000})));

 // Bug 12: Credit > 90 seconds (up to 57600s / 16h) for continuous sessions
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture('alice',{dayStart:localDay,weekStart:localWeek,monthStart:localMonth,lastTick:Timestamp.fromMillis(Date.now()-1800000)})));
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:1800,credited:1800,daySeconds:1800,weekSeconds:1800,monthSeconds:1800,lastTick:serverTimestamp()}));

 // Credited > 57600 must fail
 await assertFails(updateVerifiedClock(ref,{credited:57601,lastTick:serverTimestamp()}));

 // Bug 15: Minor client drift (e.g. clientSeconds differs from elapsed by small amount) does NOT flag review
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'study_integrity','alice'),integrityFixture('alice',{dayStart:localDay,weekStart:localWeek,monthStart:localMonth,clientSeconds:1800,daySeconds:1800,weekSeconds:1800,monthSeconds:1800,lastTick:Timestamp.fromMillis(Date.now()-60000)})));
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:1870,credited:50,daySeconds:1850,weekSeconds:1850,monthSeconds:1850,lastTick:serverTimestamp()}));

 // Client display jumps neither create credit nor impose a second clock check.
 await assertSucceeds(updateVerifiedClock(ref,{clientSeconds:8000,credited:0,integrityStatus:'clear',lastTick:serverTimestamp()}));
 await assertFails(updateVerifiedClock(ref,{clientSeconds:8000,credited:0,integrityStatus:'review',reason:'impossible_elapsed',lastTick:serverTimestamp()}));
});

test('group owner and admins can kick members, admins cannot kick owner, non-admins cannot kick',async()=>{
 const a=env.authenticatedContext('alice').firestore(),
       b=env.authenticatedContext('bob').firestore(),
       c=env.authenticatedContext('carol').firestore(),
       d=env.authenticatedContext('dave').firestore();
 const batch=writeBatch(a);
 batch.set(doc(a,'study_groups','circle'),{...room('circle','alice'),adminIds:[],deleted:false});
 batch.set(doc(a,'study_groups','circle','members','alice'),{...member('alice'),joined:true});
 await assertSucceeds(batch.commit());

 await assertSucceeds(setDoc(doc(b,'study_groups','circle','members','bob'),{...member('bob'),joined:true}));
 await assertSucceeds(setDoc(doc(c,'study_groups','circle','members','carol'),{...member('carol'),joined:true}));
 await assertSucceeds(setDoc(doc(d,'study_groups','circle','members','dave'),{...member('dave'),joined:true}));
 await assertSucceeds(updateDoc(doc(a,'study_groups','circle'),{adminIds:['bob']}));

 // 1. Carol (regular member) CANNOT kick Dave
 await assertFails(updateDoc(doc(c,'study_groups','circle','members','dave'),{joined:false,status:'offline',lastHeartbeat:0}));
 await assertFails(deleteDoc(doc(c,'study_groups','circle','members','dave')));

 // 2. Bob (admin) CANNOT kick Alice (owner)
 await assertFails(updateDoc(doc(b,'study_groups','circle','members','alice'),{joined:false,status:'offline',lastHeartbeat:0}));
 await assertFails(deleteDoc(doc(b,'study_groups','circle','members','alice')));

 // 3. Bob (admin) CAN kick Dave (regular member)
 await assertSucceeds(updateDoc(doc(b,'study_groups','circle','members','dave'),{joined:false,status:'offline',lastHeartbeat:0}));

 // 4. Alice (owner) CAN kick Bob (admin)
 await assertSucceeds(updateDoc(doc(a,'study_groups','circle','members','bob'),{joined:false,status:'offline',lastHeartbeat:0}));

 // 5. Alice (owner) can also delete kicked member document
 await assertSucceeds(deleteDoc(doc(a,'study_groups','circle','members','carol')));
});

test('existing groups can be made public or private by group owners alone',async()=>{
 const a=env.authenticatedContext('alice').firestore(),
       b=env.authenticatedContext('bob').firestore(),
       c=env.authenticatedContext('carol').firestore();
 const batch=writeBatch(a);
 batch.set(doc(a,'study_groups','pub-priv'),{...room('pub-priv','alice',true),adminIds:[],deleted:false});
 batch.set(doc(a,'study_groups','pub-priv','members','alice'),{...member('alice'),joined:true});
 await assertSucceeds(batch.commit());

 await assertSucceeds(setDoc(doc(b,'study_groups','pub-priv','members','bob'),{...member('bob'),joined:true}));
 await assertSucceeds(updateDoc(doc(a,'study_groups','pub-priv'),{adminIds:['bob']}));

 // Bob (admin) can change name/description, but CANNOT change isPublic
 await assertSucceeds(updateDoc(doc(b,'study_groups','pub-priv'),{name:'Renamed by Bob'}));
 await assertFails(updateDoc(doc(b,'study_groups','pub-priv'),{isPublic:false}));

 // Carol (regular member) cannot change anything
 await assertFails(updateDoc(doc(c,'study_groups','pub-priv'),{isPublic:false}));

 // Alice (owner) CAN make public group private
 await assertSucceeds(updateDoc(doc(a,'study_groups','pub-priv'),{isPublic:false}));

 // Alice (owner) CAN make private group public again
 await assertSucceeds(updateDoc(doc(a,'study_groups','pub-priv'),{isPublic:true}));
});

const activeSessionFixture = (uid, overrides = {}) => ({
 uid,
 deviceId: 'device-test-123',
 sessionId: 'session-test-456',
 status: 'running',
 mode: 'pomodoro',
 targetSeconds: 1500,
 breakSeconds: 300,
 accumulatedSeconds: 600,
 startTime: Date.now(),
 lastHeartbeat: Date.now(),
 updatedAt: Date.now(),
 ...overrides,
});

test('activeSessions: enforces one active session per account model and strict validation', async () => {
 const a = env.authenticatedContext('alice').firestore();
 const b = env.authenticatedContext('bob').firestore();
 const unauth = env.unauthenticatedContext().firestore();
 const guest = env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore();

 // 1. Owner can create their own active session with valid data
 await assertSucceeds(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice')));

 // Optional valid fields
 await assertSucceeds(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', {
  runningSince: Date.now(),
  workspaceId: 'ws-1',
  workspaceName: 'Work',
  subjectId: 'subj-1',
  subjectName: 'Math',
  subjectColor: '#3b82f6',
  notes: 'Focusing on calculus',
  date: '2026-10-05',
 })));

 // Null runningSince is also valid
 await assertSucceeds(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', {
  runningSince: null,
 })));

 // 2. Owner cannot create active session with invalid data
 // Invalid status
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { status: 'idle' })));
 // Negative accumulatedSeconds
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { accumulatedSeconds: -1 })));
 // Negative targetSeconds / breakSeconds
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { targetSeconds: -1 })));
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { breakSeconds: -1 })));
 // Out of bound accumulatedSeconds (> 86400)
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { accumulatedSeconds: 86401 })));
 // Empty deviceId or sessionId
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { deviceId: '' })));
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { sessionId: '' })));
 // Invalid date format
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { date: '2026/10/05' })));
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { date: 'invalid-date' })));
 // Disallowed extra fields
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice', { injectedField: 'malicious' })));
 // Missing required field
 const { deviceId, ...missingDeviceId } = activeSessionFixture('alice');
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), missingDeviceId));

 // 3. User cannot create active session doc for another user (/activeSessions/bob with alice auth)
 await assertFails(setDoc(doc(a, 'activeSessions', 'bob'), activeSessionFixture('bob')));
 await assertFails(setDoc(doc(a, 'activeSessions', 'bob'), activeSessionFixture('alice')));

 // 4. User cannot create active session where data.uid != uid
 await assertFails(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('bob')));

 // Reset alice session for cross-user tests
 await assertSucceeds(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice')));

 // 5. User cannot read or delete another user's active session doc
 await assertFails(getDoc(doc(b, 'activeSessions', 'alice')));
 await assertFails(deleteDoc(doc(b, 'activeSessions', 'alice')));
 await assertFails(updateDoc(doc(b, 'activeSessions', 'alice'), { status: 'paused' }));
 await assertFails(getDocs(collection(b, 'activeSessions')));

 // 6. Owner can update and delete their own active session doc
 // Valid update
 await assertSucceeds(updateDoc(doc(a, 'activeSessions', 'alice'), {
  accumulatedSeconds: 900,
  status: 'paused',
  updatedAt: Date.now(),
 }));
 // Owner cannot update to invalid data (e.g. invalid status or negative accumulatedSeconds)
 await assertFails(updateDoc(doc(a, 'activeSessions', 'alice'), { status: 'invalid-status' }));
 await assertFails(updateDoc(doc(a, 'activeSessions', 'alice'), { accumulatedSeconds: -5 }));
 // Owner can delete
 await assertSucceeds(deleteDoc(doc(a, 'activeSessions', 'alice')));

 // 7. Anonymous and unauthenticated users cannot read, write, or delete active sessions
 // Seed an active session for alice
 await assertSucceeds(setDoc(doc(a, 'activeSessions', 'alice'), activeSessionFixture('alice')));

 // Unauthenticated user
 await assertFails(getDoc(doc(unauth, 'activeSessions', 'alice')));
 await assertFails(getDocs(collection(unauth, 'activeSessions')));
 await assertFails(setDoc(doc(unauth, 'activeSessions', 'alice'), activeSessionFixture('alice')));
 await assertFails(setDoc(doc(unauth, 'activeSessions', 'unauth-user'), activeSessionFixture('unauth-user')));
 await assertFails(updateDoc(doc(unauth, 'activeSessions', 'alice'), { status: 'paused' }));
 await assertFails(deleteDoc(doc(unauth, 'activeSessions', 'alice')));

 // Anonymous user
 await assertFails(getDoc(doc(guest, 'activeSessions', 'alice')));
 await assertFails(getDocs(collection(guest, 'activeSessions')));
 await assertFails(setDoc(doc(guest, 'activeSessions', 'alice'), activeSessionFixture('alice')));
 await assertFails(setDoc(doc(guest, 'activeSessions', 'guest'), activeSessionFixture('guest')));
 await assertFails(updateDoc(doc(guest, 'activeSessions', 'alice'), { status: 'paused' }));
 await assertFails(deleteDoc(doc(guest, 'activeSessions', 'alice')));
 await assertFails(deleteDoc(doc(guest, 'activeSessions', 'guest')));
});



test('strict session metadata remains owner-only and boolean', async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 const ref=doc(a,'activeSessions','alice');
 await assertSucceeds(setDoc(ref,{...activeSessionFixture('alice'),strictMode:true}));
 await assertFails(updateDoc(ref,{strictMode:'yes'}));
 await assertFails(updateDoc(doc(b,'activeSessions','alice'),{strictMode:false}));
});

test('manual validation verdicts are server-only, private and cannot be self-approved',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const ref=doc(a,'manual_validations','alice','sessions','sess-manual-ai-one');
 await assertFails(setDoc(ref,{status:'approved',creditedSeconds:3600}));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'manual_validations','alice','sessions','sess-manual-ai-one'),{status:'approved',creditedSeconds:3600}));
 await assertSucceeds(getDoc(ref));await assertFails(getDoc(doc(b,'manual_validations','alice','sessions','sess-manual-ai-one')));
 await assertFails(updateDoc(ref,{creditedSeconds:90000}));await assertFails(deleteDoc(ref));
 await assertFails(setDoc(doc(a,'manual_credit_receipts','alice','entries','copy'),{sessionId:'copied'}));
});
test('three-hour live cap cannot be reset while active or bypassed by another timer',async()=>{
 const db=env.authenticatedContext('alice',{firebase:{sign_in_provider:'google.com'}}).firestore(),ref=doc(db,'study_integrity','alice');
 const tick=Date.now()-60000;
 await env.withSecurityRulesDisabled(c=>setVerifiedClock(c.firestore(),'alice',integrityFixture('alice',{lastTick:Timestamp.fromMillis(tick),stretchStart:tick-10800000,daySeconds:10800,weekSeconds:10800,monthSeconds:10800})));
 await assertFails(updateVerifiedClock(ref,{credited:1,daySeconds:10801,weekSeconds:10801,monthSeconds:10801,lastTick:serverTimestamp()}));
 await assertFails(updateVerifiedClock(ref,{stretchStart:Date.now(),timerId:'fresh',credited:1,daySeconds:10801,weekSeconds:10801,monthSeconds:10801,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{credited:0,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{active:false,credited:0,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{active:true,stretchStart:Date.now(),credited:0,lastTick:serverTimestamp()}));
 await assertFails(setDoc(doc(db,'manual_daily_credit','alice','days','2026-10-07'),{seconds:0}));
});
test('AI controls are admin-only; user toggles and total daily caps are enforced',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'admins','admin'),{enabled:true}));
 const adminDb=env.authenticatedContext('admin').firestore(),alice=env.authenticatedContext('alice').firestore();
 const config={enabled:true,maintenanceMessage:'Back soon',model:'gemini-3.1-flash-lite',chatEnabled:true,manualEnabled:true,validationEnabled:true,requestsPerMinute:6,inputPricePerMillion:0,outputPricePerMillion:0,updatedAt:serverTimestamp(),updatedBy:'admin'};
 await assertSucceeds(setDoc(doc(adminDb,'ai_config','global'),config));
 await assertFails(setDoc(doc(alice,'ai_config','global'),{...config,updatedBy:'alice'}));
 const access={extraDaily:0,enabled:true,dailyLimit:1,requestsPerMinute:2,grantedBy:'admin',updatedAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(adminDb,'ai_access','alice'),access));
 const day=Math.floor(Date.now()/86400000),ref=doc(alice,'users','alice','ai_days',String(day));
 await assertSucceeds(setDoc(ref,{day,count:1,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{day,count:2,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(alice,'ai_access','alice'),{...access,dailyLimit:999,grantedBy:'alice'}));
 await assertSucceeds(updateDoc(doc(adminDb,'ai_access','alice'),{enabled:false,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(ref,{day,count:2,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(alice,'ai_usage_days',String(day),'users','alice'),{requests:999,costMicros:0}));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'ai_usage_days',String(day),'users','alice'),{uid:'alice',requests:1}));
 await assertSucceeds(getDocs(collection(adminDb,'ai_usage_days',String(day),'users')));
 await assertFails(getDocs(collection(alice,'ai_usage_days',String(day),'users')));
 await assertSucceeds(updateDoc(doc(adminDb,'ai_config','global'),{enabled:false,updatedAt:serverTimestamp()}));
 const bob=env.authenticatedContext('bob').firestore();await assertFails(setDoc(doc(bob,'users','bob','ai_days',String(day)),{day,count:1,updatedAt:serverTimestamp()}));
});

test('public streak projection allows bounded metadata and rejects partial or invalid values',async()=>{
 const alice=env.authenticatedContext('alice').firestore();
 const ref=doc(alice,'global_profiles','alice');
 await assertSucceeds(setDoc(ref,{...profileFixture('alice'),streakDays:2,streakDate:'2026-10-07',streakUtcOffset:330}));
 await assertFails(setDoc(ref,{...profileFixture('alice'),streakDays:2}));
 await assertFails(setDoc(ref,{...profileFixture('alice'),streakDays:-1,streakDate:'2026-10-07',streakUtcOffset:330}));
 await assertFails(setDoc(ref,{...profileFixture('alice'),streakDays:2,streakDate:'2026-10-07',streakUtcOffset:999}));
});
test('server-managed clocks reject client advances and marker stripping but allow score removal and admin review',async()=>{
 await seedAdmin();const a=env.authenticatedContext('alice').firestore(),admin=env.authenticatedContext('admin').firestore();
 const value=integrityFixture('alice',{serverManaged:true,sessionStart:123,creditUntil:0,stretchStart:Date.now()-30000,lastTick:Timestamp.fromMillis(Date.now()-30000),daySeconds:600,weekSeconds:600,monthSeconds:600});
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setVerifiedClock(db,'alice',value);});
 const ref=doc(a,'study_integrity','alice');
 await assertFails(updateVerifiedClock(ref,{credited:10,daySeconds:610,weekSeconds:610,monthSeconds:610,lastTick:serverTimestamp()}));
 const {serverManaged,sessionStart,creditUntil,...legacy}=value;
 await assertFails(setVerifiedClock(a,'alice',{...legacy,credited:10,daySeconds:610,weekSeconds:610,monthSeconds:610,lastTick:serverTimestamp()}));
 await assertSucceeds(updateVerifiedClock(ref,{daySeconds:500,weekSeconds:500,monthSeconds:500}));
 const next={...value,daySeconds:500,weekSeconds:500,monthSeconds:500,integrityStatus:'review'};
 const batch=writeBatch(admin);batch.update(doc(admin,'study_integrity','alice'),{integrityStatus:'review'});batch.set(doc(admin,'study_rankings','alice'),rankingOf(next));batch.set(doc(admin,'study_integrity_reviews','alice'),{actorUid:'admin',status:'review',note:'Admin review remains supported.',updatedAt:serverTimestamp()});await assertSucceeds(batch.commit());
});

test('categorized support supports admin progress, live replies, reopen and private inbox delivery',async()=>{
 const owner=env.authenticatedContext('support-owner').firestore(), admin=env.authenticatedContext('support-admin').firestore(), stranger=env.authenticatedContext('stranger').firestore();
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'admins','support-admin'),{enabled:true}));
 for(const category of ['issue','suggestion','account','timer','appeal','other']){
  const ticketRef=doc(owner,'support_tickets',category), opening=writeBatch(owner);
  opening.set(ticketRef,{ownerUid:'support-owner',ownerName:'Member',title:'Please review',category,status:'open',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  opening.set(doc(ticketRef,'messages','initial'),{senderUid:'support-owner',senderName:'Member',text:'Session details\nOct 8, Physics',createdAt:serverTimestamp()});
  await assertSucceeds(opening.commit());
  await assertFails(updateDoc(ticketRef,{status:'in_progress',updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(admin,'support_tickets',category),{status:'in_progress',updatedAt:serverTimestamp()}));
  const reply=writeBatch(admin);
  reply.set(doc(admin,'support_tickets',category,'messages','answer'),{senderUid:'support-admin',senderName:'Team',text:'We are reviewing this.',createdAt:serverTimestamp()});
  reply.update(doc(admin,'support_tickets',category),{updatedAt:serverTimestamp()});
  await assertSucceeds(reply.commit());
  await assertSucceeds(getDoc(doc(owner,'support_tickets',category,'messages','answer')));
  await assertFails(getDoc(doc(stranger,'support_tickets',category,'messages','answer')));
  await assertSucceeds(setDoc(doc(owner,'support_tickets',category,'messages','followup'),{senderUid:'support-owner',senderName:'Member',text:'Thank you',createdAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(admin,'support_tickets',category),{status:'resolved',updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(owner,'support_tickets',category,'messages','closed'),{senderUid:'support-owner',senderName:'Member',text:'Closed',createdAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(ticketRef,{status:'open',updatedAt:serverTimestamp()}));
 }
 const inbox=await assertSucceeds(getDocs(query(collection(owner,'support_tickets'),where('ownerUid','==','support-owner'))));
 if(inbox.size!==6)throw new Error('All six tickets must be visible in the owner inbox.');
});


test('atomic sends reach another member live and concurrent clients cannot lose usage',async()=>{
 const a=env.authenticatedContext('alice').firestore(), a2=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','realtime'),room('realtime','alice'));
 await setDoc(doc(a,'study_groups','realtime','members','alice'),member('alice'));
 await setDoc(doc(b,'study_groups','realtime','members','bob'),member('bob'));
 const message={groupId:'realtime',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Live delivery',timestamp:Date.now(),type:'chat'};
 let off;
 const received=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{off?.();reject(new Error('Receiver did not receive both committed messages'));},5000);
  off=onSnapshot(collection(b,'study_groups','realtime','messages'),snapshot=>{
   if(snapshot.size===2){clearTimeout(timeout);resolve(snapshot.docs.map(d=>d.id));}
  },error=>{clearTimeout(timeout);reject(error);});
 });
 try {
  await Promise.all([sendCountedMessage(a,'realtime','one',message),sendCountedMessage(a2,'realtime','two',message)]);
  const ids=await received;
  if(!ids.includes('one')||!ids.includes('two'))throw new Error('Messages missing on receiver');
  const usage=await getDoc(doc(a,'users','alice','chat_days',String(Math.floor(Date.now()/86400000))));
  if(usage.data().count!==2)throw new Error('Concurrent sends lost usage');
 }finally{off?.();}
});

test('simultaneous atomic sends at the free cap accept exactly one message',async()=>{
 const a=env.authenticatedContext('alice').firestore(),a2=env.authenticatedContext('alice').firestore(),day=Math.floor(Date.now()/86400000);
 await setDoc(doc(a,'study_groups','last'),room('last','alice'));
 await setDoc(doc(a,'study_groups','last','members','alice'),member('alice'));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'users','alice','chat_days',String(day)),{day,count:249,lastMessageId:'previous',lastGroupId:'last'}));
 const message={groupId:'last',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Last allowed',timestamp:Date.now(),type:'chat'};
 const results=await Promise.allSettled([sendCountedMessage(a,'last','one',message),sendCountedMessage(a2,'last','two',message)]);
 if(results.filter(r=>r.status==='fulfilled').length!==1)throw new Error('Daily cap not atomic');
 const usage=await getDoc(doc(a,'users','alice','chat_days',String(day)));
 const messages=await getDocs(collection(a,'study_groups','last','messages'));
 if(usage.data().count!==250||messages.size!==1)throw new Error('Rejected message or usage was persisted');
});

test('inbox badge receives mentions off-page and follows read, mute and membership changes',async()=>{
 const {subscribeInboxUnread,mentionNoticeId}=await import('../../src/utils/inboxUnread.ts');
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 await setDoc(doc(a,'study_groups','badge'),room('badge','alice'));
 await setDoc(doc(a,'study_groups','badge','members','alice'),member('alice'));
 await setDoc(doc(b,'study_groups','badge','members','bob'),member('bob'));
 const prefRef=doc(a,'users','alice','community','preferences');
 let pref={joinedIds:['badge'],primaryId:'badge',mutedIds:[],readIds:[]};
 await setDoc(prefRef,pref);
 let count=-1, waiter;
 const off=subscribeInboxUnread(a,{uid:'alice',displayName:'Alice'},value=>{count=value;waiter?.();});
 const waitCount=expected=>new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{waiter=undefined;reject(new Error(`Expected inbox count ${expected}, got ${count}`));},5000);
  waiter=()=>{if(count===expected){clearTimeout(timeout);waiter=undefined;resolve();}};waiter();
 });
 const message={groupId:'badge',senderUid:'bob',senderName:'Bob',senderAvatar:'',text:'@Alice hello',timestamp:Date.now(),type:'chat',mentionUids:['alice']};
 try{
  await waitCount(0);
  await sendCountedMessage(b,'badge','one',message);await waitCount(1);
  pref={...pref,readIds:[mentionNoticeId('badge','one')]};await setDoc(prefRef,pref);await waitCount(0);
  await sendCountedMessage(b,'badge','two',message);await waitCount(1);
  pref={...pref,mutedIds:['badge']};await setDoc(prefRef,pref);await waitCount(0);
  pref={...pref,mutedIds:[]};await setDoc(prefRef,pref);await waitCount(1);
  pref={...pref,joinedIds:[],primaryId:null};await setDoc(prefRef,pref);await waitCount(0);
 }finally{off();}
});

test('site and chat operation gates preserve reads while rejecting paused writes',async()=>{
 await seedAdmin();const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore();
 await setDoc(doc(a,'study_groups','ops'),room('ops','alice'));
 await setDoc(doc(a,'study_groups','ops','members','alice'),member('alice'));
 const message={groupId:'ops',senderUid:'alice',senderName:'Alice',senderAvatar:'',text:'Hello',timestamp:Date.now(),type:'chat'};
 await assertSucceeds(sendCountedMessage(a,'ops','before',message));
 await assertSucceeds(setDoc(doc(admin,'platform','controls'),{groupsEnabled:true,supportEnabled:true,rankingsEnabled:true,notice:'',chatEnabled:false,actorUid:'admin',updatedAt:serverTimestamp()}));
 await assertFails(sendCountedMessage(a,'ops','paused',message));
 await assertSucceeds(getDoc(doc(a,'study_groups','ops','messages','before')));
 await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(),'platform','controls')));
 await assertSucceeds(updateDoc(doc(admin,'platform','controls'),{chatEnabled:true,sitePaused:true,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(a,'study_groups','new'),room('new','alice')));
 await assertFails(sendCountedMessage(a,'ops','site-paused',message));
 await assertSucceeds(updateDoc(doc(admin,'platform','controls'),{pauseEndsAt:Date.now()-1000,updatedAt:serverTimestamp()}));
 await assertSucceeds(sendCountedMessage(a,'ops','resumed',message));
});
test('announcement schedules, audiences and immutable operations history are admin-only',async()=>{
 await seedAdmin();const admin=env.authenticatedContext('admin').firestore(),a=env.authenticatedContext('alice').firestore();
 const item={title:'New release',text:'A useful update',authorUid:'admin',timestamp:Date.now(),status:'draft',audience:'plus',startsAt:Date.now()+10000,expiresAt:Date.now()+20000,actionLabel:'See changes',actionUrl:'https://sanctrastudy.live'};
 await assertSucceeds(setDoc(doc(admin,'announcements','scheduled'),item));
 await assertFails(updateDoc(doc(admin,'announcements','scheduled'),{audience:'unknown'}));
 await assertFails(updateDoc(doc(admin,'announcements','scheduled'),{status:'invalid'}));
 await assertFails(setDoc(doc(a,'announcements','forged'),{...item,authorUid:'alice'}));
 const record={actorUid:'admin',createdAt:serverTimestamp(),changed:['sitePaused'],sitePaused:false,notice:'Test'};
 await assertSucceeds(setDoc(doc(admin,'platform_operations_audit','test'),record));
 await assertFails(updateDoc(doc(admin,'platform_operations_audit','test'),{notice:'Altered'}));
 await assertFails(getDoc(doc(a,'platform_operations_audit','test')));
});

test('JEE Track pause controls accept only admin boolean changes',async()=>{
 await seedAdmin();
 const admin=env.authenticatedContext('admin').firestore(),member=env.authenticatedContext('alice').firestore();
 const ref=doc(admin,'platform','controls');
 await assertSucceeds(setDoc(ref,{groupsEnabled:true,supportEnabled:true,rankingsEnabled:true,notice:'',actorUid:'admin',updatedAt:serverTimestamp(),jeeTrackEnabled:false}));
 await assertSucceeds(updateDoc(ref,{jeeTrackEnabled:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(updateDoc(ref,{jeeTrackEnabled:false,updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(ref,{jeeTrackEnabled:'true',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(member,'platform','controls'),{jeeTrackEnabled:true,actorUid:'alice',updatedAt:serverTimestamp()}));
});

test('JEE Track records are private, validated and preserve independently saved records',async()=>{
 const a=env.authenticatedContext('alice').firestore(), b=env.authenticatedContext('bob').firestore();
 const testRecord={kind:'tests',value:{id:'real-1',exam:'mains',type:'full',date:'2026-10-11',max:300,total:180,physics:60,chemistry:60,maths:60}};
 const ref=doc(a,'users','alice','jeetrack','tests_real-1');
 await assertSucceeds(setDoc(ref,testRecord));
 await assertSucceeds(setDoc(doc(a,'users','alice','jeetrack','preference_targetYear'),{kind:'preference',value:{key:'targetYear',value:'2028'}}));
 await assertSucceeds(getDocs(collection(a,'users','alice','jeetrack')));
 await assertFails(getDoc(doc(b,'users','alice','jeetrack','tests_real-1')));
 await assertFails(setDoc(doc(b,'users','alice','jeetrack','tests_real-1'),testRecord));
 await assertFails(setDoc(ref,{...testRecord,value:{...testRecord.value,total:301}}));
 await assertFails(setDoc(ref,{...testRecord,value:{...testRecord.value,notes:'x'.repeat(2001)}}));
 await assertFails(setDoc(doc(a,'users','alice','jeetrack','unknown'),{kind:'unknown',value:{}}));
 await assertSucceeds(deleteDoc(ref));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','alice','jeetrack','tests_real-1')));
});

test('JEE Track validates chapters, study hours, practice, backlogs and personal targets',async()=>{
 const a=env.authenticatedContext('alice').firestore();
 const valid=[
 ['chapter_physics_101',{kind:'chapter',value:{subject:'physics',id:101,name:'Units',class:'11',unit:'Mechanics',theory:false,practice:true,revisions:2}}],
 ['hours_manual',{kind:'hours',value:{id:'manual',date:'2026-10-11',subject:'physics',lecture:0,practice:0.5,revision:0,mockAnalysis:0,total:0.5,source:'manual',chapterId:101}}],
 ['practiceLogs_practice',{kind:'practiceLogs',value:{id:'practice',subject:'maths',chapterId:301,chapterName:'Quadratics',questions:20,date:'2026-10-11',loggedAt:1}}],
 ['backlogs_work',{kind:'backlogs',value:{id:'work',title:'Review errors',subject:'chemistry',priority:'high',done:false,addedDate:'2026-10-11'}}],
 ['upcoming_mock',{kind:'upcoming',value:{id:'mock',exam:'advanced',session:'Own mock',type:'partial',date:'2026-10-15'}}],
 ['preference_profile',{kind:'preference',value:{key:'profile',value:{classLevel:'12',studyMode:'self',coaching:'',targetMainsMarks:200}}}],
 ['preference_examDates',{kind:'preference',value:{key:'examDates',value:{mainsJan:'2027-01-01'}}}],
 ];
 for(const [id,value] of valid)await assertSucceeds(setDoc(doc(a,'users','alice','jeetrack',id),value));
 await assertFails(setDoc(doc(a,'users','alice','jeetrack','bad_hours'),{kind:'hours',value:{...valid[1][1].value,total:25}}));
 await assertFails(setDoc(doc(a,'users','alice','jeetrack','bad_practice'),{kind:'practiceLogs',value:{...valid[2][1].value,questions:-1}}));
 await assertFails(setDoc(doc(a,'users','alice','jeetrack','bad_profile'),{kind:'preference',value:{key:'profile',value:{classLevel:'12',studyMode:'self',coaching:'',isAdmin:true}}}));
});

test('JEE Track active timer metadata and opt-in settings are validated and owner scoped',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const active={uid:'alice',deviceId:'device-a',sessionId:'session-a',status:'running',mode:'countup',targetSeconds:0,breakSeconds:300,accumulatedSeconds:0,startTime:1,runningSince:1,lastHeartbeat:1,updatedAt:1,jee:{subject:'physics',chapterId:101,kind:'practice'}};
 const ref=doc(a,'activeSessions','alice');
 await assertSucceeds(setDoc(ref,active));
 await assertFails(setDoc(ref,{...active,jee:{...active.jee,kind:'guesswork'}}));
 await assertFails(setDoc(ref,{...active,jee:{...active.jee,subject:'biology'}}));
 await assertFails(setDoc(ref,{...active,jee:{...active.jee,chapterId:0}}));
 await assertFails(setDoc(ref,{...active,jee:{...active.jee,isAdmin:true}}));
 await assertSucceeds(setDoc(doc(a,'users','alice'),{settings:{jeeTrackOptIn:true},sessions:[]}));
 await assertSucceeds(updateDoc(doc(a,'users','alice'),{settings:{jeeTrackOptIn:false}}));
 await assertFails(updateDoc(doc(b,'users','alice'),{settings:{jeeTrackOptIn:true}}));
});

test('JEE mock analysis fields remain private and reject malformed chapter mistakes',async()=>{
 const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore();
 const value={id:'analysis',exam:'mains',type:'full',date:'2026-10-12',max:300,total:180,physics:60,chemistry:60,maths:60,durationMinutes:180,attempted:60,unattempted:15,chapterMistakes:[{subject:'chemistry',chapterId:205,mistakes:3,reason:'Concept'}]};
 const ref=doc(a,'users','alice','jeetrack','tests_analysis');
 await assertSucceeds(setDoc(ref,{kind:'tests',value}));
 await assertFails(getDoc(doc(b,'users','alice','jeetrack','tests_analysis')));
 await assertFails(setDoc(ref,{kind:'tests',value:{...value,attempted:1.5}}));
 await assertFails(setDoc(ref,{kind:'tests',value:{...value,chapterMistakes:[{...value.chapterMistakes[0],mistakes:-1}]}}));
 await assertFails(setDoc(ref,{kind:'tests',value:{...value,chapterMistakes:Array(9).fill(value.chapterMistakes[0])}}));
});

test('background settings replacement clears uploaded media while preserving study records',async()=>{
 const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users','alice');
 await assertSucceeds(setDoc(ref,{sessions:[],tasks:[],settings:{activeWallpaperId:'wp-art-rain',customWallpaperUrl:'data:image/jpeg;base64,aGVsbG8=',updatedAt:1}}));
 await assertSucceeds(setDoc(ref,{settings:{activeWallpaperId:'wp-art-lavender-lake',updatedAt:2},lastSyncedAt:2},{mergeFields:['settings','lastSyncedAt']}));
 const data=(await getDoc(ref)).data();
 if(data.settings.customWallpaperUrl!==undefined||data.settings.activeWallpaperId!=='wp-art-lavender-lake'||!Array.isArray(data.sessions))throw new Error('Cleared background was resurrected or unrelated data changed.');
});
