import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc} from 'firebase/firestore';
import {createFirestorePersonalStore,createPersonalApi} from '../../worker/personal-api.ts';
import {issuePersonalToken} from '../../worker/personal-auth.ts';
import {updateActiveSession,deleteActiveSession,startActiveSession} from '../../src/utils/activeSessionService.ts';

test('real Firestore: Mac start, web pause, Mac resume/finish, web start and Mac adoption',async()=>{
 assert.ok(process.env.FIRESTORE_EMULATOR_HOST,'Run only inside the Firestore emulator');
 const project='demo-bluey-personal';
 const environment=await initializeTestEnvironment({projectId:project,firestore:{rules:await readFile('firestore.rules','utf8')}});
 const store=createFirestorePersonalStore(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`,'owner');
 const issued=await issuePersonalToken();
 const api=createPersonalApi(store);
 const env={FIREBASE_PROJECT_ID:project,ALLOWED_ORIGIN:'https://sanctrastudy.live',PERSONAL_OWNER_UID:'personal-owner'};
 const request=async(path,method='GET',body)=>{
  const response=await api(new Request(`https://fixture/v1/personal/${path}`,{method,headers:{authorization:`Bearer ${issued.token}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
  assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);
  return response.json();
 };
 try {
  await store.write('users/personal-owner',{sessions:[],tasks:[],subjects:[{id:'physics',name:'Physics'}],settings:{timezone:'Asia/Kolkata'}});
  await store.write('personal_integrations/personal-owner',{...issued.record});
  const web=environment.authenticatedContext('personal-owner').firestore();
  const start=Date.now()-60000;
  await request('sessions','POST',{operationId:'start-mac',sessionId:'shared-focus',subjectId:'physics',subjectName:'Physics',startTime:start});
  assert.equal((await getDoc(doc(web,'activeSessions','personal-owner'))).data().sessionId,'shared-focus');
  await updateActiveSession(web,'personal-owner',{sessionId:'shared-focus',status:'paused',runningSince:null,accumulatedSeconds:60});
  const paused=await request('sync');assert.equal(paused.activeSession.isPaused,true);
  await request('sessions/shared-focus','PATCH',{operationId:'resume-mac',action:'resume',expectedRevision:paused.activeSession.revision});
  assert.equal((await getDoc(doc(web,'activeSessions','personal-owner'))).data().status,'running');
  await request('sessions/shared-focus','PATCH',{operationId:'finish-mac',action:'finish'});
  const history=(await getDoc(doc(web,'users','personal-owner'))).data().sessions;
  assert.equal(history.filter(s=>s.id==='shared-focus').length,1);
  assert.ok(history[0].durationSeconds>=60);
  const now=Date.now();
  const webStart=await startActiveSession(web,'personal-owner',{uid:'personal-owner',deviceId:'browser',sessionId:'web-focus',startTime:now,runningSince:now,accumulatedSeconds:0,mode:'countup',targetSeconds:1800,breakSeconds:0,status:'running'});
  assert.equal(webStart.success,true);
  const adopted=await request('sync');assert.equal(adopted.activeSession.id,'web-focus');
  await deleteActiveSession(web,'personal-owner','browser','web-focus');
  assert.equal((await request('sync')).activeSession,null);
 } finally {await environment.clearFirestore();await environment.cleanup();}
});
