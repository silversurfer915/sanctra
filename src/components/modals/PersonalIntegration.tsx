import {useEffect,useState} from 'react';
import {GoogleAuthProvider,reauthenticateWithPopup} from 'firebase/auth';
import {getStoredSyllabus} from '../../utils/syllabusService.ts';
import {initFirebase} from '../../utils/firebase.ts';

const endpoint='https://api.sanctrastudy.live/v1/personal/token';
export function PersonalIntegration({uid}:{uid:string}) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('Checking personal integration…'),[eligible,setEligible]=useState(false),[configured,setConfigured]=useState(false),[revealed,setRevealed]=useState('');
 async function request(method:string,path='token',body?:unknown) {
  const user=initFirebase().auth?.currentUser;
  if(!user||user.uid!==uid)throw Error('Sign in to your Sanctra account first.');
  const result=await fetch(endpoint.replace(/token$/,path),{method,headers:{authorization:'Bearer '+await user.getIdToken(),...(body?{'content-type':'application/json'}:{})},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
  const data=await result.json();if(!result.ok)throw Error(data.message||'Personal integration is unavailable.');return data;
 }
 useEffect(()=>{let mounted=true;setRevealed('');setEligible(false);request('GET').then(data=>{if(mounted){setEligible(true);setConfigured(data.configured);setMessage(data.configured?'Token configured. Regenerating immediately disconnects the old token.':'Create a personal token to connect Bluey.');}}).catch(error=>{if(mounted)setMessage(error.message);});return()=>{mounted=false;};},[uid]);
 async function manage(method:string) {
  setBusy(true);setRevealed('');
  try {const data=await request(method);setRevealed(data.token||'');setConfigured(method==='POST');setMessage(method==='POST'?'Shown once. Paste this into Bluey → Settings → Sanctra. Keep it private.':'Personal token revoked. Bluey is disconnected.');}
  catch(error){setMessage(error instanceof Error?error.message:'Connection failed.');}finally{setBusy(false);}
 }
 async function signInAgain() {
  const user=initFirebase().auth?.currentUser;if(!user)return;
  if(!user.providerData.some(p=>p.providerId==='google.com')){setMessage('Sign out and sign back in, then reopen Settings to manage the token.');return;}
  setBusy(true);try{await reauthenticateWithPopup(user,new GoogleAuthProvider());setMessage('Sign-in refreshed. You can now generate or revoke your token.');}catch{setMessage('Sign-in was not refreshed.');}finally{setBusy(false);}
 }
 const syllabus=getStoredSyllabus();
 const topics=syllabus.courses.flatMap(course=>course.subjects.flatMap(subject=>subject.units.flatMap(unit=>unit.topics.map(topic=>({...topic,courseId:course.id,subjectId:subject.id,subjectTitle:subject.title,unitId:unit.id,unitTitle:unit.title})))));
 async function shareSyllabus(){setBusy(true);try{const data=await request('POST','syllabus',{topics});setMessage(`Shared ${data.sharedTopics} topics from this browser with Bluey. The local syllabus is unchanged.`);}catch(error){setMessage(error instanceof Error?error.message:'Sharing failed.');}finally{setBusy(false);}}
 return <section className="p-4 rounded-2xl glass-card border border-white/10 space-y-3" aria-label="Bluey personal integration">
  <h3 className="text-sm font-medium">Integrations · Bluey</h3>
  <p className="text-xs text-slate-400" role="status">{message}</p>
  {revealed&&<div className="space-y-2"><label className="text-xs block" htmlFor="bluey-personal-token">Personal API token — shown once</label><input id="bluey-personal-token" type="text" readOnly value={revealed} autoComplete="off" spellCheck={false} className="w-full rounded-lg p-2 text-xs bg-black/20"/><button type="button" onClick={()=>navigator.clipboard.writeText(revealed).then(()=>setMessage('Copied. Paste into Bluey Settings, then dismiss this token.')).catch(()=>setMessage('Select the token and copy it manually.'))}>Copy token</button><button type="button" onClick={()=>setRevealed('')}>Dismiss token</button></div>}
  {eligible&&<details><summary className="text-xs">Share this browser's syllabus with Bluey</summary><p className="text-xs text-slate-400">Review: {topics.length} topics across {syllabus.courses.length} courses. Includes topic notes and revision progress. This publishes a copy into your signed-in account.</p><button type="button" disabled={busy} onClick={shareSyllabus}>Share {topics.length} topics</button></details>}
  <div className="flex flex-wrap gap-3 text-xs">
   <button type="button" disabled={busy||!eligible} onClick={()=>manage('POST')}>{configured?'Regenerate token':'Generate personal token'}</button>
   {configured&&<button type="button" disabled={busy} onClick={()=>manage('DELETE')}>Revoke token</button>}
   {eligible&&<button type="button" disabled={busy} onClick={signInAgain}>Refresh sign-in</button>}
  </div>
 </section>;
}
