// Authorized one-time migration. Copies only public display identity and aggregate totals.
const fs=require('node:fs'),path=require('node:path');
const bin=process.env.PATH.split(path.delimiter).map(d=>path.join(d,'firebase')).find(f=>fs.existsSync(f));
const root=path.resolve(path.dirname(fs.realpathSync(bin)),'..');
const {getGlobalDefaultAccount}=require(path.join(root,'auth.js'));const {requireAuth}=require(path.join(root,'requireAuth.js'));const {Client}=require(path.join(root,'apiv2.js'));
function decode(v){if(!v)return undefined;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)]));return null;}
function encode(v){if(typeof v==='string')return {stringValue:v};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return {integerValue:String(Math.floor(v))};return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};}
(async()=>{
 const options={project:'studyapp-4137d',...getGlobalDefaultAccount()};await requireAuth(options);
 const auth=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v1'}),client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base='/projects/studyapp-4137d/databases/(default)/documents';
 const owner=(await auth.post('/projects/studyapp-4137d/accounts:lookup',{email:['ponhareeshn@gmail.com']})).body.users?.find(u=>u.emailVerified);
 if(!owner)throw new Error('Verified administrator not found.');await client.get(`${base}/admins/${owner.localId}`);
 await client.patch(`${base}/admins/${owner.localId}?updateMask.fieldPaths=canManageAdmins&updateMask.fieldPaths=enabled`,{fields:{canManageAdmins:{booleanValue:true},enabled:{booleanValue:true}}});
 let accounts=[],token;do{const result=(await auth.get('/projects/studyapp-4137d/accounts:batchGet',{queryParams:{maxResults:1000,...(token?{nextPageToken:token}:{})}})).body;accounts.push(...result.users||[]);token=result.nextPageToken;}while(token);
 const registered=accounts.filter(a=>a.email||a.providerUserInfo?.length),{recordedFocus,utcPeriodKey}=await import('../src/utils/competitiveRankings.ts');let migrated=0;
 for(const a of registered){let privateDoc;try{privateDoc=(await client.get(`${base}/users/${a.localId}`)).body;}catch(e){if(e.status!==404)throw e;privateDoc={};}
 const data=Object.fromEntries(Object.entries(privateDoc.fields||{}).map(([k,v])=>[k,decode(v)])),settings=data.settings||{};let subscription=null,isAdmin=false;
 try{subscription=Object.fromEntries(Object.entries((await client.get(`${base}/subscriptions/${a.localId}`)).body.fields||{}).map(([k,v])=>[k,decode(v)]));}catch(e){if(e.status!==404)throw e;}
 try{await client.get(`${base}/admins/${a.localId}`);isAdmin=true;}catch(e){if(e.status!==404)throw e;}
 const now=new Date(),active=isAdmin||subscription?.isPlus&&['active','cancelled'].includes(subscription.status)&&subscription.currentPeriodEnd>Date.now(),publicStyle={plusUntil:active?(isAdmin?4102444800000:subscription.currentPeriodEnd):0,cover:active?settings.plusProfileCoverUrl||'':'',scene:active?settings.plusProfileScene||'none':'none',frame:active?settings.plusProfileFrame||'none':'none',aura:active?settings.plusAvatarEffect||'none':'none',trial:!!active&&!!subscription?.isTrial,admin:isAdmin};
 const projection={uid:a.localId,displayName:(settings.customDisplayName||a.displayName||'Member').slice(0,200),avatarUrl:(active&&settings.plusAnimatedAvatarUrl?settings.plusAnimatedAvatarUrl:settings.avatarUrl||a.photoUrl||'').slice(0,2048),updatedAt:Date.now(),publicStyle,...Object.fromEntries(['day','week','month'].flatMap(period=>[[period+'Key',utcPeriodKey(now,period)],[period+'Seconds',recordedFocus(Array.isArray(data.sessions)?data.sessions:[],now,period)]]))};
 await client.patch(`${base}/global_profiles/${a.localId}`,{fields:Object.fromEntries(Object.entries(projection).map(([k,v])=>[k,encode(v)]))});
 try{await client.get(`${base}/platform_users/${a.localId}`);}catch(e){if(e.status!==404)throw e;await client.patch(`${base}/platform_users/${a.localId}`,{fields:{uid:encode(a.localId),displayName:encode(projection.displayName),avatarUrl:encode(projection.avatarUrl),isGuest:encode(false),lastSeen:{timestampValue:new Date(Number(a.lastLoginAt)||0).toISOString()}}});}
 migrated++;
 }
 const indexes=(await client.get('/projects/studyapp-4137d/databases/(default)/collectionGroups/global_profiles/indexes')).body.indexes||[];
 console.log(JSON.stringify({registeredAccountsMigrated:migrated,indexStates:indexes.map(i=>i.state),adminDelegationEnabled:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
