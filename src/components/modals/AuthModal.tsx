import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import type {AuthUser} from '../../types/index.ts';
import {loginWithGoogle,loginWithEmail,registerWithEmail,logoutUser,hasGoogleSignIn} from '../../utils/firebase.ts';
import {AccountPassword} from '../AccountPassword.tsx';
import {THEME_PALETTES,getThemeName,DEFAULT_USER_SETTINGS} from '../../utils/storage.ts';
import {Brand} from '../Brand.tsx';
import {X,ArrowRight,Mail,Cloud,LogOut,LoaderCircle} from 'lucide-react';
interface AuthModalProps {
 isOpen:boolean;currentUser:AuthUser|null;onUserChange:(user:AuthUser|null)=>void;onClose:()=>void;
 initialMode?:'signin';activeWallpaperId?:string;
}
export function AuthModal({isOpen,currentUser,onUserChange,onClose,activeWallpaperId}:AuthModalProps){
 const palette=THEME_PALETTES[getThemeName(activeWallpaperId||DEFAULT_USER_SETTINGS.activeWallpaperId)];
 const style={'--sanctra-ink':palette.ink,'--sanctra-surface':palette.surface,'--sanctra-sage':palette.accent,'--sanctra-accent':palette.accent,'--sanctra-muted':palette.muted} as CSSProperties;
 const [emailOpen,setEmailOpen]=useState(false),[register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmSignout,setConfirmSignout]=useState(false);
 const inFlight=useRef(false);
 const attempt=useRef(0);
 const dialog=useRef<HTMLDivElement>(null);
 const actions=useRef({busy,onClose});actions.current={busy,onClose};
 useEffect(()=>{if(!isOpen)return;setError('');setPassword('');setConfirmSignout(false);const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!actions.current.busy){e.preventDefault();actions.current.onClose();}if(e.key==='Tab'){const nodes=[...dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')||[]].filter(e=>e.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
 },[isOpen]);
 if(!isOpen)return null;
 const cancelConnection=()=>{attempt.current++;inFlight.current=false;setBusy(false);setError('Sign-in was cancelled. You can try again.');};
 const authenticate=async(action:()=>Promise<AuthUser>)=>{
  if(inFlight.current)return;
  inFlight.current=true;const token=++attempt.current;setBusy(true);setError('');
  const timeout=window.setTimeout(()=>{if(attempt.current===token)cancelConnection();},30000);
  try{const user=await action();if(attempt.current!==token)return;onUserChange(user);onClose();}
  catch(e){if(attempt.current!==token)return;const code=(e as {code?:string}).code;setError(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'?'The sign-in window was closed. You can try again.':code==='auth/invalid-credential'?'That email and password didn’t match. Check them and try again.':'Unable to sign in. Please try again.');}
  finally{window.clearTimeout(timeout);if(attempt.current===token){inFlight.current=false;setBusy(false);}}
 };

 const submit=(e:FormEvent)=>{e.preventDefault();void authenticate(()=>register?registerWithEmail(email.trim(),password,name.trim()):loginWithEmail(email.trim(),password));};
 return <div className="auth-overlay account-access" style={style} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><div className="auth-modal account-access-card" style={style} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="modal-auth-title" aria-describedby="modal-auth-description">
 <button type="button" className="account-access-close" aria-label="Close sign-in" disabled={busy} onClick={onClose}><X size={20}/></button>
 <div className="account-access-brand"><Brand/></div>
 <header><p className="account-access-eyebrow">{currentUser?'YOUR ACCOUNT':'YOUR QUIET PLACE TO BEGIN'}</p><h2 id="modal-auth-title">{currentUser?'Your study account.':'Welcome to your desk.'}</h2><p id="modal-auth-description">{currentUser?'Your sessions and plans stay connected to you.':'Sign in to keep your sessions, plans and progress together.'}</p></header>
 {error&&<p className="account-access-error" role="alert">{error}</p>}
 {currentUser && hasGoogleSignIn() && <div style={{marginBottom:20}}><AccountPassword/></div>}
 {currentUser?<><div className="account-access-summary"><strong>{currentUser.displayName||'Member'}</strong><span>{currentUser.email}</span><small><Cloud size={15}/> Connected account</small></div>{confirmSignout?<div className="account-access-confirm"><p>Your saved work remains connected to your account.</p><button type="button" onClick={()=>setConfirmSignout(false)}>Stay signed in</button><button type="button" onClick={async()=>{try{await logoutUser();onUserChange(null);onClose();}catch{setError('Could not finish account cleanup. Close other Sanctra tabs and try again.');}}}>Sign out</button></div>:<button type="button" className="account-access-secondary" onClick={()=>setConfirmSignout(true)}><LogOut size={18}/> Sign out</button>}</>:<>
 <button type="button" className="account-access-google" disabled={busy} onClick={()=>void authenticate(()=>loginWithGoogle())}>{busy?<LoaderCircle className="account-access-spinner" size={19}/>:<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>}<span>{busy?'Connecting…':'Continue with Google'}</span><ArrowRight size={18}/></button>
 {busy&&<button type="button" className="account-access-link" onClick={cancelConnection}>Cancel sign-in</button>}
 <div className="account-access-divider"><span>or</span></div>
 <button type="button" className="account-access-secondary" aria-expanded={emailOpen} disabled={busy} onClick={()=>{setEmailOpen(!emailOpen);setError('');}}><Mail size={18}/>{emailOpen?'Hide email sign-in':'Continue with email'}</button>
 {emailOpen&&<form className="account-access-form" onSubmit={submit}>{register&&<label htmlFor="account-name">Display name<input id="account-name" autoComplete="name" maxLength={100} required value={name} onChange={e=>setName(e.target.value)}/></label>}<label htmlFor="account-email">Email address<input id="account-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label htmlFor="account-password">Password<input id="account-password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?6:undefined} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="account-access-submit" disabled={busy}>{busy?'Connecting…':register?'Create your account':'Sign in'}<ArrowRight size={18}/></button><button type="button" className="account-access-link" disabled={busy} onClick={()=>{setRegister(!register);setError('');setPassword('');}}>{register?'Already have an account? Sign in':'New here? Create a free account'}</button></form>}
 <p className="account-access-footnote">Free study tools. Your own account. A place to return to.</p></>}
 </div></div>;
}
