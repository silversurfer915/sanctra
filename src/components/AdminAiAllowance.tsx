import {useEffect,useState} from 'react';
import {doc,onSnapshot,setDoc,serverTimestamp} from 'firebase/firestore';
import {getCloudDatabase,initFirebase} from '../utils/firebase.ts';
import {aiAccess,DEFAULT_AI_ACCESS,type AiUserAccess} from '../features/ai-admin/config.ts';
import '../features/ai-admin/admin-ai.css';
export function AdminAiAllowance({uid}:{uid:string}) {
 const [access,setAccess]=useState<AiUserAccess>(DEFAULT_AI_ACCESS),[status,setStatus]=useState(''),[saving,setSaving]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{setStatus('');setReady(false);const db=getCloudDatabase();if(!db){setStatus('Connect to Sanctra to manage AI access.');return;}return onSnapshot(doc(db,'ai_access',uid),s=>{setAccess(aiAccess(s.data()));setReady(true);},()=>setStatus('Could not load AI access. Try again.'));},[uid]);
 async function save(){const db=getCloudDatabase(),actor=initFirebase().auth?.currentUser;
 if(!db||!actor||!Number.isSafeInteger(access.extraDaily)||access.extraDaily<0||access.dailyLimit!==null&&(!Number.isSafeInteger(access.dailyLimit)||access.dailyLimit<0||access.dailyLimit>1000000)||access.requestsPerMinute!==null&&(!Number.isSafeInteger(access.requestsPerMinute)||access.requestsPerMinute<1||access.requestsPerMinute>60)){setStatus('Use whole numbers. Daily cap: 0–1,000,000. Rate limit: 1–60.');return;}
 setSaving(true);setStatus('');try{await setDoc(doc(db,'ai_access',uid),{...access,grantedBy:actor.uid,updatedAt:serverTimestamp()});setStatus('AI access saved.');}catch{setStatus('Could not save AI access. Your edits are kept; try again.');}finally{setSaving(false);}}
 return <section className="workspace-panel admin-ai-section"><h3>Member AI access</h3><p className="admin-ai-note">{uid}</p><form onSubmit={e=>{e.preventDefault();void save();}}>
 <label className="admin-ai-toggle"><span><strong>Allow AI access</strong><small>Applies to every AI feature for this account.</small></span><input type="checkbox" checked={access.enabled} onChange={e=>setAccess({...access,enabled:e.target.checked})}/></label>
 <div className="admin-ai-fields">
 <label>Extra daily messages<input className="inbox-input" type="number" min="0" step="1" value={access.extraDaily} onChange={e=>setAccess({...access,extraDaily:Number(e.target.value)})}/><small>Added to the Free 3 / Plus 12 allowance.</small></label>
 <label>Total daily cap<input className="inbox-input" type="number" min="0" max="1000000" step="1" placeholder="Standard allowance" value={access.dailyLimit??''} onChange={e=>setAccess({...access,dailyLimit:e.target.value===''?null:Number(e.target.value)})}/><small>Optional. Overrides the standard and extra allowance.</small></label>
 <label>Requests per minute<input className="inbox-input" type="number" min="1" max="60" step="1" placeholder="Global rate limit" value={access.requestsPerMinute??''} onChange={e=>setAccess({...access,requestsPerMinute:e.target.value===''?null:Number(e.target.value)})}/><small>Shared across tabs and AI features.</small></label>
 </div><p className="admin-ai-note">Admins have unlimited daily messages. Access switches and rate limits still apply.</p><button className="workspace-primary" disabled={saving||!ready}>{saving?'Saving…':'Save member access'}</button></form>{status&&<p role="status" className="admin-ai-note">{status}</p>}</section>;
}
