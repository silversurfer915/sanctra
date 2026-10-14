// Disposable account only: never reads or modifies an existing member's timer.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import https from 'node:https';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,createUserWithEmailAndPassword,deleteUser} from 'firebase/auth';
import {getFirestore,doc,setDoc,getDoc,terminate} from 'firebase/firestore';
const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(l=>/^VITE_/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
// Optional routing diagnostic: same hostname and TLS validation, different Cloudflare edge.
const fetchTimer = process.env.SANCTRA_SMOKE_EDGE_IP ? (url, options) => new Promise((resolve,reject)=>{
 const req=https.request(url,{method:options.method,headers:options.headers,lookup:(_host,options,callback)=>options.all?callback(null,[{address:process.env.SANCTRA_SMOKE_EDGE_IP,family:4}]):callback(null,process.env.SANCTRA_SMOKE_EDGE_IP,4)},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(text)}));});
 req.on('error',reject);req.setTimeout(25000,()=>req.destroy(new Error('Routing diagnostic timed out')));req.end(options.body);
}) : fetch;
const app=initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,projectId:env.VITE_FIREBASE_PROJECT_ID,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,appId:env.VITE_FIREBASE_APP_ID},'timer-connection-smoke');
const db=getFirestore(app);let account;
try {
 account=(await createUserWithEmailAndPassword(getAuth(app),`sanctra-timer-check-${randomUUID()}@example.invalid`,randomUUID()+randomUUID())).user;
 const uid=account.uid,deviceId='isolated-connection-check',now=Date.now();
 await setDoc(doc(db,'activeSessions',uid),{uid,deviceId,sessionId:randomUUID(),status:'running',mode:'free',targetSeconds:0,breakSeconds:0,accumulatedSeconds:0,startTime:now,runningSince:now,lastHeartbeat:now,updatedAt:now,strictMode:false});
 const token=await account.getIdToken();
 const sync=async(status)=>{
  console.log('Checking server timer:',status);
  for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetchTimer(`${env.VITE_AI_GATEWAY_URL}/timer`,{method:'POST',headers:{origin:'https://sanctrastudy.live','content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({deviceId,sessionStart:now,status,timezone:'Asia/Kolkata'}),signal:AbortSignal.timeout(25000)});
  const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result;
  }catch(error){if(attempt===2||!(error instanceof TypeError || error.name==='TimeoutError'))throw error;console.log('Transient connection failure; retrying');}
  }
 };
 await sync('running');
 await new Promise(r=>setTimeout(r,2200));
 const stopped=await sync('paused');
 assert.equal(stopped.integrityStatus,'clear');
 const ranking=(await getDoc(doc(db,'study_rankings',uid))).data();
 assert.ok(ranking.daySeconds>=2);
 console.log('PASS: authenticated server start, paused settlement and ranking credit are clear; credited seconds:',ranking.daySeconds);
} finally {
 if(account){
  const require=createRequire(import.meta.url),root=process.env.HOME+'/.nvm/versions/node/v24.21.0/lib/node_modules/firebase-tools/lib/';
  const {Client}=require(root+'apiv2.js'),{getGlobalDefaultAccount}=require(root+'auth.js'),{requireAuth}=require(root+'requireAuth.js');
  await requireAuth({project:env.VITE_FIREBASE_PROJECT_ID,...getGlobalDefaultAccount()});
  const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
  for(const collection of ['activeSessions','study_integrity','study_rankings']){
   try{await client.delete(`/projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${account.uid}`);}catch(e){if(e.status!==404)throw e;}
  }
  await deleteUser(account);
  console.log('PASS: disposable timer, ranking and account removed.');
 }
 await terminate(db);await deleteApp(app);
}
