import {aiAccess,aiConfig,DEFAULT_AI_ACCESS,DEFAULT_AI_CONFIG} from '../features/ai-admin/config.ts';
import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {getCloudDatabase} from '../utils/firebase.ts';
import {AI_FREE_DAILY_LIMIT,AI_PLUS_DAILY_LIMIT} from '../features/ai-planner/policy.ts';
export function AiAllowance({uid,plus,active=true}:{uid:string;plus:boolean;active?:boolean}) {
 const [day,setDay]=useState(Math.floor(Date.now()/86400000)),[count,setCount]=useState<number|null>(null),[admin,setAdmin]=useState(false),[access,setAccess]=useState(DEFAULT_AI_ACCESS),[config,setConfig]=useState(DEFAULT_AI_CONFIG);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setDay(Math.floor(Date.now()/86400000)),60000);return()=>clearInterval(timer);},[active]);
 useEffect(()=>{if(!active)return;setCount(null);setAdmin(false);setAccess(DEFAULT_AI_ACCESS);const db=getCloudDatabase();if(!db)return;
 const offCount=onSnapshot(doc(db,'users',uid,'ai_days',String(day)),s=>setCount(typeof s.data()?.count==='number'?s.data()!.count:0),()=>setCount(null));
 const offAdmin=onSnapshot(doc(db,'admins',uid),s=>setAdmin(s.exists()),()=>setAdmin(false));
 const offExtra=onSnapshot(doc(db,'ai_access',uid),s=>setAccess(aiAccess(s.data())),()=>setAccess(DEFAULT_AI_ACCESS));
 const offConfig=onSnapshot(doc(db,'ai_config','global'),s=>setConfig(aiConfig(s.data())),()=>setConfig(DEFAULT_AI_CONFIG));
 return()=>{offCount();offAdmin();offExtra();offConfig();};},[uid,day,active]);
 const limit=access.dailyLimit??((plus?AI_PLUS_DAILY_LIMIT:AI_FREE_DAILY_LIMIT)+access.extraDaily);
 const paused=!config.enabled||!access.enabled;
 return <span className="ai-allowance" aria-live="polite">{paused?'AI paused':admin?'Unlimited AI · Admin':count===null?'Checking allowance':`${Math.max(0,limit-count)} / ${limit} left today`}<small>{paused?(!config.enabled?config.maintenanceMessage:'Access paused for this account'):admin?'Shared across AI features':'All AI features · resets midnight UTC'}</small></span>;
}
