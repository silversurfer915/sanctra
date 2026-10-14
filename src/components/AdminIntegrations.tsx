import {useEffect,useRef,useState} from 'react';
import type {AuthUser} from '../types/index.ts';
import {APPROVED_AGENT_SCOPES,GrantError,createAgentGrant,listAgentGrants,revokeAgentGrant,rotateAgentGrant,reauthenticateAgentAdmin,watchAgentAdminIdentity,type AgentGrant,type GrantIssue} from '../utils/agentGrantService.ts';
import './agent-integrations.css';

export function AdminIntegrations({user}:{user:AuthUser}){
 const [label,setLabel]=useState('Hermes'),[scopes,setScopes]=useState<string[]>([]),[grants,setGrants]=useState<AgentGrant[]>([]),[cursor,setCursor]=useState<string>(),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<GrantError|null>(null),[message,setMessage]=useState(''),[secret,setSecret]=useState<{uid:string;id:string;token:string}|null>(null);
 const generation=useRef(0),locked=useRef(false);
 const visibleSecret=secret?.uid===user.uid?secret:null;
 async function load(append=false,epoch=generation.current){setLoading(true);try{const page=await listAgentGrants(user.uid,append?cursor:undefined);if(epoch!==generation.current)return;setGrants(previous=>append?[...previous,...page.grants]:page.grants);setCursor(page.nextCursor);}catch(cause){if(epoch===generation.current)setError(asError(cause));}finally{if(epoch===generation.current)setLoading(false);}}
 // This effect resets account-private state and invalidates asynchronous work at the identity boundary.
 // The generation is a request fence, not a DOM ref; load is intentionally bound to this identity only.
 // eslint-disable-next-line react/set-state-in-effect, react-hooks/exhaustive-deps
 useEffect(()=>{const epoch=++generation.current;locked.current=false;setBusy(false);setSecret(null);setGrants([]);setCursor(undefined);setError(null);setMessage('');setLabel('Hermes');setScopes([]);void load(false,epoch);let unsubscribe:(()=>void)|undefined;let active=true;void watchAgentAdminIdentity(uid=>{if(active&&uid!==user.uid){generation.current++;setSecret(null);setGrants([]);setCursor(undefined);setBusy(false);setLoading(false);setError(new GrantError('unauthorized','Your account changed. Sign in and reopen Integrations.'));}}).then(stop=>{if(active)unsubscribe=stop;else stop();}).catch(cause=>{if(active){setSecret(null);setError(asError(cause));}});return()=>{active=false;generation.current++;unsubscribe?.();};},[user.uid]);
 function asError(cause:unknown){return cause instanceof GrantError?cause:new GrantError('unavailable',cause instanceof Error?cause.message:'Could not complete this action.');}
 async function action(kind:'create'|'rotate'|'revoke',grant?:AgentGrant){
  if(locked.current||(kind!=='revoke'&&visibleSecret)||(error?.code==='owner_only'||error?.code==='forbidden')||(kind==='create'&&grants.some(grant=>!grant.revokedAt&&(grant.expiresAt===null||grant.expiresAt>Date.now()))))return;
  locked.current=true;setBusy(true);setError(null);setMessage('');setSecret(null);const epoch=generation.current;
  const input={label:label.trim(),scopes,operationId:crypto.randomUUID(),reason:kind==='create'?'Connect Hermes from administrator Integrations':`${kind==='rotate'?'Rotate':'Revoke'} Hermes access from administrator Integrations`};
  try{
   if(kind==='revoke'&&grant){await revokeAgentGrant(user.uid,grant,input.operationId,input.reason);if(epoch===generation.current)setMessage('Grant revoked. Hermes can no longer use it.');}
   else{const result:GrantIssue=kind==='rotate'&&grant?await rotateAgentGrant(user.uid,grant,{...input,label:grant.label,scopes:grant.scopes}):await createAgentGrant(user.uid,input);if(epoch!==generation.current)return;if(result.token)setSecret({uid:user.uid,id:result.grant.id,token:result.token});else setMessage('This grant was issued previously and its secret is unavailable. Revoke it and issue a new grant.');}
   if(epoch===generation.current)await load(false,epoch);
  }catch(cause){if(epoch!==generation.current)return;const failure=asError(cause);setError(failure);if(failure.code==='conflict'||failure.code==='active_connection_exists'||failure.code==='issuance_uncertain')await load(false,epoch);}
  finally{if(epoch===generation.current){locked.current=false;setBusy(false);}}
 }
 async function reauthenticate(){const epoch=generation.current;setBusy(true);try{await reauthenticateAgentAdmin(user.uid);if(epoch!==generation.current)return;setError(null);setMessage('Sign-in verified. Review your selections and issue when ready.');}catch(cause){if(epoch===generation.current)setError(asError(cause));}finally{if(epoch===generation.current)setBusy(false);}}
 const activeConnection=grants.some(grant=>!grant.revokedAt&&(grant.expiresAt===null||grant.expiresAt>Date.now()));
 const ownerDenied=(error?.code==='owner_only'||error?.code==='forbidden');
 const blocked=busy||!!visibleSecret||ownerDenied;
 const stale=!!error&&['reauthentication_required','recent_auth_required','reauth_required','requires_recent_login','stale_sign_in'].includes(error.code);
 return <section className="agent-integrations" aria-label="Hermes integrations">
  <header><h2>Connect Hermes</h2><p>Connect your personal assistant with the access you choose. The Sanctra owner can have one active Hermes connection. It never expires; revoke or rotate it here whenever needed.</p></header>
  {error&&<div className="agent-feedback agent-error" role="alert"><p>{error.message}</p>{error.code==='conflict'&&<p>The grant list has been reloaded. Review the latest state before trying again.</p>}{stale&&<><p>Issuing access requires a sign-in within the last five minutes.</p><button type="button" disabled={busy} onClick={()=>void reauthenticate()}>Verify Google sign-in</button><p>Using a password account? Sign out and sign back in, then return here.</p></>}{!stale&&<button type="button" disabled={busy||loading} onClick={()=>{setError(null);void load();}}>Reload grants</button>}</div>}
  {message&&<p className="agent-feedback" role="status">{message}</p>}
  {visibleSecret&&<div className="agent-secret" role="region" aria-label="New Hermes credential"><h3>Save your credential</h3><p>Shown once. Store it privately on your Hermes host as SANCTRA_AGENT_TOKEN. Closing this panel clears the displayed copy.</p><label htmlFor="hermes-credential">Hermes credential</label><textarea id="hermes-credential" readOnly value={visibleSecret.token} rows={3}/><div className="agent-actions"><button type="button" onClick={()=>void navigator.clipboard.writeText(visibleSecret.token).then(()=>setMessage('Credential copied.')).catch(()=>setMessage('Copy was unavailable. Select and copy the credential manually.'))}>Copy credential</button><button type="button" onClick={()=>{setSecret(null);setMessage('Displayed credential cleared.');}}>I've saved it</button><button type="button" onClick={()=>setSecret(null)}>Dismiss credential</button></div></div>}
  <form onSubmit={event=>{event.preventDefault();void action('create');}}>
   <div className="agent-fields"><label>Grant label<input value={label} maxLength={100} required disabled={blocked} onChange={event=>setLabel(event.target.value)} placeholder="Hermes on my private host"/></label><p>Non-expiring owner connection<br/>Access continues until revoked or rotated.</p></div>
   <fieldset disabled={blocked}><legend>Approved access scopes</legend><p>Start with only the access Hermes needs. Write scopes allow changes across accounts.</p><button type="button" onClick={()=>setScopes([...APPROVED_AGENT_SCOPES])}>Select all approved scopes</button><div className="agent-scopes">{APPROVED_AGENT_SCOPES.map(scope=><label key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={event=>setScopes(current=>event.target.checked?[...current,scope]:current.filter(value=>value!==scope))}/><span>{scope}</span></label>)}</div></fieldset>
   <button className="agent-primary" type="submit" disabled={blocked||activeConnection||loading||scopes.length===0||!label.trim()}>{busy?'Saving…':'Issue Hermes credential'}</button>{activeConnection&&<p>A connection is already active. Rotate its credential or revoke it below before issuing another.</p>}{visibleSecret&&<p>Save or dismiss the displayed credential before issuing another.</p>}
  </form>
  <section className="agent-grant-list" aria-label="Your agent grants"><div className="agent-list-heading"><h3>Your grants</h3><button type="button" disabled={loading||busy} onClick={()=>void load()}>Refresh</button></div><p>Only grants created by your account are listed. Rotating immediately revokes the previous credential.</p>
   {loading&&<p role="status">Loading grants…</p>}{!loading&&!error&&grants.length===0&&<p>No grants yet. Choose scopes above to connect Hermes.</p>}
   {grants.map(grant=>{const state=grant.revokedAt?'Revoked':grant.expiresAt!==null&&grant.expiresAt<=Date.now()?'Expired':'Active';return <article key={grant.id}><div><h4>{grant.label}</h4><span className={`agent-state agent-state-${state.toLowerCase()}`}>{state}</span><p>{grant.expiresAt===null?'Never expires':`Expires ${new Date(grant.expiresAt).toLocaleDateString()}`} · {grant.scopes.join(', ')}</p></div><div className="agent-actions"><button type="button" disabled={blocked||state!=='Active'} onClick={()=>void action('rotate',grant)} aria-label={`Rotate ${grant.label}`}>Rotate</button><button type="button" disabled={busy||ownerDenied||state==='Revoked'} onClick={()=>void action('revoke',grant)} aria-label={`Revoke ${grant.label}`}>Revoke</button></div></article>;})}
   {cursor&&<button type="button" disabled={loading||busy} onClick={()=>void load(true)}>Load more grants</button>}
  </section>
 </section>;
}
