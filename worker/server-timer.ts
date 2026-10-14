import {Temporal} from '@js-temporal/polyfill';
import {liveStretchCredit,periodCredit} from '../src/utils/studyCaps.ts';
import type {IntegrityClock} from '../src/utils/studyIntegrity.ts';
import {serverAccess} from './manual-validation.ts';
interface TimerRequest {deviceId:string;sessionStart:number;status:string;timezone?:string}
type ServerClock=Omit<IntegrityClock,'lastTick'> & {lastTick:string;creditUntil:number;sessionStart:number;stretchStart:number;serverManaged:true};
const statuses=new Set(['idle','running','paused','break-ready','break-running','break-paused','break-complete']);
export function advanceServerTimer(previous:any,session:any,request:TimerRequest,now:number,timezone:string,adminReviewed:boolean):ServerClock|null{
 const running=request.status==='running';
 if(session&&session.deviceId!==request.deviceId){if(running)throw new Error('This account has a timer on another device.');return null;}
 if(session&&session.startTime!==request.sessionStart)return null;
 if(!session&&running)throw new Error('Start or resume your synced timer before ranking verification.');
 if(!session&&previous?.active&&previous.sessionStart!==undefined&&previous.sessionStart!==request.sessionStart)return null;
 if(!running&&(!previous||previous.deviceId!==request.deviceId))return null;
 if(!running&&!previous.active&&(adminReviewed||previous.integrityStatus!=='review'))return null;
 const local=Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(timezone),day=local.startOfDay();
 const periods={dayStart:day.epochMilliseconds,weekStart:day.subtract({days:local.dayOfWeek-1}).epochMilliseconds,monthStart:day.with({day:1}).epochMilliseconds};
 const tick=previous?Date.parse(previous.lastTick):now;
 const creditEnd=previous?.creditUntil>0?Math.min(now,previous.creditUntil):now;
 const stretch=liveStretchCredit(previous||{active:false},tick,Math.max(tick,creditEnd));
 // Keep sub-second remainder in the server anchor so repeated refreshes do not lose time.
 const settledTick=previous?.active&&running?tick+Math.floor(Math.max(0,now-tick)/1000)*1000:now;
 const totals=Object.fromEntries(['day','week','month'].map(period=>{const start=periods[`${period}Start` as keyof typeof periods];return [`${period}Seconds`,(previous?.[`${period}Start`]===start?Number(previous[`${period}Seconds`])||0:0)+periodCredit(tick,stretch.credited,start)];})) as Pick<IntegrityClock,'daySeconds'|'weekSeconds'|'monthSeconds'>;
 const keepReview=previous?.integrityStatus==='confirmed'||adminReviewed;
 const sameRun=previous?.active&&previous.deviceId===request.deviceId&&previous.timerId===session?.sessionId;
 const remaining=session?.targetSeconds>0?Math.max(0,session.targetSeconds-(session.accumulatedSeconds||0)):0;
 const creditUntil=running?(sameRun&&previous.creditUntil!==undefined?previous.creditUntil:session?.targetSeconds>0?now+remaining*1000:0):0;
 return {uid:previous?.uid||'',registered:previous?.registered??true,...periods,...totals,deviceId:request.deviceId,timerId:session?.sessionId||previous?.timerId||'stopped',sessionStart:request.sessionStart,active:running,clientSeconds:0,credited:stretch.credited,stretchStart:running&&!previous?.active?now:stretch.stretchStart,creditUntil,serverManaged:true,integrityStatus:keepReview?previous.integrityStatus:'clear',reason:keepReview?previous.reason||'':'',lastTick:new Date(settledTick).toISOString()};
}
const unpack=(d:any)=>Object.fromEntries(Object.entries(d?.fields||{}).map(([k,v]:[string,any])=>[k,v.integerValue!==undefined?Number(v.integerValue):v.stringValue??v.booleanValue??v.timestampValue]));
const pack=(value:Record<string,any>)=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='lastTick'?{timestampValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{stringValue:v}]));
export async function handleServerTimer(request:Request,env:{FIREBASE_PROJECT_ID:string;FIREBASE_SERVICE_ACCOUNT?:string},origin:string){
 const reply=(status:number,body:object)=>Response.json(body,{status,headers:{'access-control-allow-origin':origin,'vary':'Origin'}});
 try{
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return reply(401,{message:'Sign in to Sanctra.'});
 const raw=await request.text();if(raw.length>2000)return reply(413,{message:'Invalid timer request.'});
 const body=JSON.parse(raw) as TimerRequest;
 if(!body||!statuses.has(body.status)||typeof body.deviceId!=='string'||!body.deviceId.length||body.deviceId.length>80||!Number.isSafeInteger(body.sessionStart)||body.sessionStart<0)return reply(400,{message:'Invalid timer request.'});
 let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{return reply(401,{message:'Sign in to Sanctra.'});}const uid=claims.user_id||claims.sub;
 if(typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))return reply(401,{message:'Sign in to Sanctra.'});
 const base=`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
 // The owner-only Firestore read verifies the Firebase token and UID before privileged writes.
 const identity=await fetch(`${base}/users/${uid}`,{headers:{authorization:`Bearer ${token}`}});if(!identity.ok&&identity.status!==404)return reply(401,{message:'Reconnect to Sanctra.'});
 if(!env.FIREBASE_SERVICE_ACCOUNT)return reply(503,{message:'Server timer verification is temporarily unavailable.'});
 const timezone=body.timezone||'UTC';try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{return reply(400,{message:'Choose a valid timezone.'});}
 const access=await serverAccess(env.FIREBASE_SERVICE_ACCOUNT),headers={authorization:`Bearer ${access}`,'content-type':'application/json'};
 const name=(path:string)=>`${base.split('/v1/')[1]}/${path}`;
 for(let attempt=0;attempt<4;attempt++){
 const begin=await fetch(`${base}:beginTransaction`,{method:'POST',headers,body:JSON.stringify({options:{readWrite:{}}})});if(!begin.ok)throw Error('begin');const transaction=(await begin.json() as any).transaction;
 const read=async(path:string)=>{const r=await fetch(`${base}/${path}?transaction=${encodeURIComponent(transaction)}`,{headers});if(r.status===404)return null;if(!r.ok)throw Error('read');return await r.json() as any;};
 const [clock,active,review]=await Promise.all([read(`study_integrity/${uid}`),read(`activeSessions/${uid}`),read(`study_integrity_reviews/${uid}`)]);
 const previous=clock?unpack(clock):null;
 let next;try{next=advanceServerTimer(previous,active?unpack(active):null,body,Date.now(),timezone,review?unpack(review).status!=='clear':false);}catch(error){await fetch(`${base}:rollback`,{method:'POST',headers,body:JSON.stringify({transaction})});return reply(409,{message:error instanceof Error?error.message:'Timer changed on another device.'});}
 if(!next){await fetch(`${base}:rollback`,{method:'POST',headers,body:JSON.stringify({transaction})});return reply(200,{ignored:true});}
 next.uid=uid;next.registered=claims.firebase?.sign_in_provider!=='anonymous';
 const writes:any[]=[{update:{name:name(`study_integrity/${uid}`),fields:pack(next)}}];
 if(next.registered){const keys=['uid','registered','dayStart','weekStart','monthStart','daySeconds','weekSeconds','monthSeconds','integrityStatus'];writes.push({update:{name:name(`study_rankings/${uid}`),fields:pack(Object.fromEntries(keys.map(k=>[k,(next as any)[k]])))}});}
 const commit=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({transaction,writes})});
 if(commit.ok)return reply(200,{capped:previous?.active===true&&Date.now()-next.stretchStart>=10800000,credited:next.credited,integrityStatus:next.integrityStatus});
 if(![409,412].includes(commit.status))throw Error('commit');
 }
 throw Error('conflict');
 }catch{return reply(503,{message:'Server timer verification is waiting for a connection. Your personal session is kept.'});}
}
