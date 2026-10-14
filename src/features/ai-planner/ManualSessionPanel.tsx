import {validateManualSession} from './validateManualSession.ts';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Loader2,Check} from 'lucide-react';
import type {StudySession,Subject} from '../../types/index.ts';
import {callAiGateway} from './gateway.ts';
import {parseManualSession} from './manualSession.ts';
import {SessionDetails} from '../../components/analytics/SessionDetails.tsx';
import './ai-planner.css';
export function ManualSessionPanel({subjects,workspaceId,onSave,generate=callAiGateway}:{subjects:Subject[];workspaceId:string;onSave:(s:StudySession)=>void|Promise<void>;generate?:typeof callAiGateway}) {
 const [description,setDescription]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[question,setQuestion]=useState(''),[session,setSession]=useState<StudySession|null>(null),[saved,setSaved]=useState(false);
 const inFlight=useRef(false),epoch=useRef(0),saving=useRef(false);
 useEffect(()=>()=>{epoch.current++;},[workspaceId]);
 const run=async()=>{
  if(inFlight.current||!description.trim())return;
  inFlight.current=true;setBusy(true);setError('');setQuestion('');setSession(null);setSaved(false);saving.current=false;
  const request=++epoch.current,now=new Date();
  try {
   const raw=await generate('manual-session',description,{today:now.toLocaleDateString('en-CA'),localTime:now.toLocaleTimeString('en-GB'),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,subjects:subjects.map(({id,name})=>({id,name}))});
   if(request!==epoch.current)return;
   const result=parseManualSession(raw,{now:new Date(),subjects,workspaceId});setSession(result.session);setQuestion(result.question||'');
  }catch(e){if(request===epoch.current)setError(e instanceof Error?e.message:'The session could not be read. Try again.');}
  finally{inFlight.current=false;if(request===epoch.current)setBusy(false);}
 };
 const save=async()=>{
  if(!session||saving.current||saved)return;
  saving.current=true;setBusy(true);setError('');
  try{await onSave(session);setSaved(true);try{await validateManualSession(session);}catch{setError('Saved to history. Validation is pending; retry from the history entry.');}}
  catch(e){saving.current=false;setError(e instanceof Error?e.message:'Could not save this session. Try again.');}
  finally{setBusy(false);}
 };
 return <div className="ai-planner"><div className="ai-plan-intro"><span className="workspace-eyebrow">Past study, recorded</span><h3>What did you study?</h3><p>Include when, how long and what you studied. Review before saving to history.</p></div><form onSubmit={e=>{e.preventDefault();void run();}}><label className="ai-instructions">Describe a finished session<textarea aria-label="Describe a past study session" rows={4} maxLength={2000} disabled={busy||saved} value={description} placeholder="Yesterday at 6 pm I studied physics for 50 minutes — ray optics practice." onChange={e=>{setDescription(e.target.value);setSession(null);setQuestion('');}}/></label><button type="submit" className="workspace-primary ai-plan-generate" disabled={busy||!description.trim()||saved}>{busy?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>} {busy?'Reading your session…':'Review session'}</button></form>{question&&<p role="status" className="ai-plan-note">{question} Add the detail above and try again.</p>}{error&&<p role="alert" className="ai-plan-error">{error}</p>}{session&&<section className="ai-plan-review"><SessionDetails session={session} allowValidation={saved}/><p className="ai-plan-note">Manual entries stay separate from verified live time. AI checks plausibility after saving; approved time counts toward rankings.</p><button className="workspace-primary" disabled={saved||busy} onClick={()=>void save()}><Check size={16}/>{busy?(saved?'Checking validation…':'Saving…'):saved?'Saved to history':'Save to history'}</button></section>}{saved&&<button className="analytics-button" onClick={()=>{setSaved(false);setSession(null);setDescription('');saving.current=false;}}>Log another session</button>}</div>;
}
