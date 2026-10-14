import {validateManualSession} from './validateManualSession.ts';
import {useEffect,useState,useRef} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {getCloudDatabase,initFirebase} from '../../utils/firebase.ts';
import type {StudySession} from '../../types/index.ts';
export function ManualValidationStatus({session,allowValidation=true}:{session:StudySession;allowValidation?:boolean}) {
 const [verdict,setVerdict]=useState<{status:string;reason:string;capped?:boolean;creditedSeconds?:number}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const running=useRef(false);
 const uid=initFirebase().auth?.currentUser?.uid;
 useEffect(()=>{setVerdict(null);const db=getCloudDatabase();if(!db||!uid)return;return onSnapshot(doc(db,'manual_validations',uid,'sessions',session.id),s=>{setVerdict(s.exists()?s.data() as {status:string;reason:string;capped?:boolean;creditedSeconds?:number}:null);setError('');},()=>setError('Reconnect to check validation.'));},[uid,session.id]);
 const validate=async()=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{const text=await validateManualSession(session);setVerdict(JSON.parse(text));}catch(e){setError(e instanceof Error?e.message:'Validation is pending. Try again.');}finally{running.current=false;setBusy(false);}};
 return <div className="text-xs text-slate-300 space-y-1"><p>AI-added · Manual session · {verdict?.status==='approved'?'Approved for rankings':verdict?.status==='rejected'?'Not ranked':allowValidation?'Validation pending':'Not saved yet'}</p>{verdict&&<p>{verdict.reason}</p>}{verdict?.capped&&<p>Daily manual cap reached (UTC) · {Math.floor((verdict.creditedSeconds||0)/60)} minutes credited. Full study time remains in history.</p>}{!verdict&&allowValidation&&<button className="analytics-button" disabled={busy||!uid} onClick={()=>void validate()}>{busy?'Checking…':'Validate for rankings'}</button>}{error&&<p role="alert">{error}</p>}</div>;
}
