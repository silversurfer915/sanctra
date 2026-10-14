// Uses isolated anonymous accounts and a private room against the configured project.
// Test IDs are recorded for scoped cleanup; no tokens are printed or saved.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, writeBatch, updateDoc, terminate } from 'firebase/firestore';
const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(line=>/^VITE_FIREBASE_/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const config={apiKey:env.VITE_FIREBASE_API_KEY,projectId:env.VITE_FIREBASE_PROJECT_ID,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,appId:env.VITE_FIREBASE_APP_ID};
const apps=[initializeApp(config,'smoke-a'),initializeApp(config,'smoke-b')];
const manifest={project:config.projectId,userIds:[],roomId:`smoke-${crypto.randomUUID()}`,roomCode:`SMOKE-${crypto.randomUUID()}`};
await mkdir('artifacts',{recursive:true});
const saveManifest=()=>writeFile('artifacts/cloud-smoke.local.json',JSON.stringify(manifest,null,2));
try {
 for(const app of apps) { const result=await signInAnonymously(getAuth(app));manifest.userIds.push(result.user.uid);await saveManifest(); }
 const [a,b]=apps.map(app=>getFirestore(app));const [uidA,uidB]=manifest.userIds;
 await setDoc(doc(a,'users',uidA),{sessions:[],subjects:[],tasks:[],examGoals:[]});
 assert.equal((await getDoc(doc(a,'users',uidA))).exists(),true);
 await assert.rejects(getDoc(doc(b,'users',uidA)),error=>error.code==='permission-denied');
 console.log('PASS: authenticated account write/read and cross-account denial');
 const room={id:manifest.roomId,name:'Private verification room',description:'Automated smoke test',category:'General',activeCount:0,targetExam:'General',timerMode:'countup',badgeColor:'',isPublic:false,createdById:uidA,createdByName:'Verification',createdAt:Date.now(),roomCode:manifest.roomCode};
 const batch=writeBatch(a);batch.set(doc(a,'study_groups',room.id),room);batch.set(doc(a,'room_invites',room.roomCode),{groupId:room.id,createdById:uidA});await batch.commit();
 assert.equal((await getDoc(doc(b,'room_invites',room.roomCode))).data().groupId,room.id);
 await assert.rejects(getDocs(collection(b,'study_groups',room.id,'members')),error=>error.code==='permission-denied');
 await setDoc(doc(b,'study_groups',room.id,'members',uidB),{uid:uidB,displayName:'Verification guest',avatarUrl:'',status:'focusing',currentSubject:'Physics',todaySeconds:120,streakDays:0,joinedAt:Date.now(),lastActiveAt:Date.now(),lastHeartbeat:Date.now(),inviteCode:room.roomCode});
 assert.equal((await getDocs(collection(b,'study_groups',room.id,'members'))).size,1);
 console.log('PASS: private invitation lookup and member presence');
 await setDoc(doc(b,'study_groups',room.id,'messages','smoke-message'),{groupId:room.id,senderUid:uidB,senderName:'Verification guest',senderAvatar:'',text:'Connection verification',timestamp:Date.now(),type:'chat',mentionUids:[uidA]});
 assert.equal((await getDocs(collection(b,'study_groups',room.id,'messages'))).size,1);
 assert.equal((await getDocs(query(collection(b,'study_groups'),where('isPublic','==',true)))).docs.some(d=>d.id===room.id),false);
 console.log('PASS: private chat and exclusion from public rooms');
 const prefs={joinedIds:[room.id],primaryId:room.id,mutedIds:[],readIds:[]};
 await setDoc(doc(b,'users',uidB,'community','preferences'),prefs);
 assert.equal((await getDoc(doc(b,'users',uidB,'community','preferences'))).data().primaryId,room.id);
 await assert.rejects(getDoc(doc(a,'users',uidB,'community','preferences')),error=>error.code==='permission-denied');
 assert.equal((await getDocs(query(collection(a,'study_groups',room.id,'messages'),where('mentionUids','array-contains',uidA)))).size,1);
 await updateDoc(doc(b,'study_groups',room.id,'members',uidB),{joined:false,status:'offline'});
 await assert.rejects(getDocs(collection(b,'study_groups',room.id,'messages')),error=>error.code==='permission-denied');
 console.log('PASS: persistent private membership preferences, mentions and leave access revocation');
 await assert.rejects(setDoc(doc(b,'admins',uidB),{enabled:true}),error=>error.code==='permission-denied');
 await assert.rejects(setDoc(doc(b,'announcements','smoke-announcement'),{title:'Test',text:'Not published',authorUid:uidB,timestamp:Date.now()}),error=>error.code==='permission-denied');
 console.log('PASS: non-admin cannot self-promote or publish announcements');
} finally { for(const app of apps){await terminate(getFirestore(app));await deleteApp(app);} }
