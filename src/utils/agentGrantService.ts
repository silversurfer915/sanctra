export const APPROVED_AGENT_SCOPES=['users:read','users:write','study:read','study:write','study:delete','support:read','support:write','ai:read','ai:write','platform:read','platform:write','audit:read'] as const;
export interface AgentGrant {id:string;label:string;creatorUid:string;scopes:string[];createdAt:number;expiresAt:number|null;revokedAt:number|null;version:string}
export interface GrantInput {label:string;scopes:string[];operationId:string;reason:string}
export interface GrantIssue {grant:AgentGrant;token?:string;secretUnavailable?:boolean}
export class GrantError extends Error {code:string;retryable:boolean;constructor(code:string,message:string,retryable=false){super(message);this.code=code;this.retryable=retryable;}}
const endpoint='https://api.sanctrastudy.live/v1/agent/grants';
const uncertainMessage='The issuance response could not be verified. Reload your grants, revoke any new grant, then issue again. Do not retry this issuance.';
function malformed(issuance=false):GrantError{return new GrantError(issuance?'issuance_uncertain':'unavailable',issuance?uncertainMessage:'The grant response could not be verified. Reload to check the latest state.');}
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function timestamp(value:unknown):number {
 const time=typeof value==='number'?value:typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)?Date.parse(value):NaN;
 if(!Number.isFinite(time)||time<0)throw malformed();return time;
}
function project(value:unknown):AgentGrant {
 if(!record(value)||typeof value.id!=='string'||!value.id||typeof value.label!=='string'||!value.label||value.label.length>100||typeof value.creatorUid!=='string'||!value.creatorUid||typeof value.version!=='string'||!value.version||!Array.isArray(value.scopes)||!value.scopes.every(scope=>typeof scope==='string'&&APPROVED_AGENT_SCOPES.includes(scope as typeof APPROVED_AGENT_SCOPES[number])))throw malformed();
 return {id:value.id,label:value.label,creatorUid:value.creatorUid,scopes:[...value.scopes] as string[],createdAt:timestamp(value.createdAt),expiresAt:value.expiresAt===null?null:timestamp(value.expiresAt),revokedAt:value.revokedAt===null?null:timestamp(value.revokedAt),version:value.version};
}
export function createGrantClient(getToken:(uid:string)=>Promise<string>,fetchImpl:typeof fetch=fetch){
 async function request(uid:string,method:string,path='',body?:unknown){
  const token=await getToken(uid);if(!token||token.startsWith('sanctra_agent_'))throw new GrantError('unauthorized','Sign in to your administrator account.');
  let response:Response;
  try{response=await fetchImpl(endpoint+path,{method,cache:'no-store',redirect:'error',headers:{authorization:`Bearer ${token}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw new GrantError(method==='POST'&&!path.endsWith('/revoke')?'issuance_uncertain':'unavailable',method==='POST'&&!path.endsWith('/revoke')?'The response was lost. Reload your grants, revoke any new grant, then issue again. Do not retry this issuance.':'Connection failed. Reload to check the latest state.');}
  const issuance=method==='POST'&&!path.endsWith('/revoke');
  let envelope;try{envelope=await response.json();}catch{throw malformed(issuance);}
  if(!record(envelope))throw malformed(issuance);
  if(!response.ok||envelope.error){const error=record(envelope.error)?envelope.error:{};throw new GrantError(typeof error.code==='string'?error.code:'unavailable',typeof error.message==='string'?error.message:'Grant management is unavailable.',error.retryable===true);}
  if(envelope.apiVersion!=='1'||!record(envelope.data))throw malformed(issuance);return {data:envelope.data,nextCursor:envelope.nextCursor};
 }
 async function issue(uid:string,path:string,input:GrantInput&{expectedVersions?:{grant:string}}):Promise<GrantIssue>{if(!input.label.trim()||input.label.length>100)throw new GrantError('validation','Enter a grant label between 1 and 100 characters.');const {data}=await request(uid,'POST',path,input);try{const grant=project(data.grant);if(data.secretUnavailable===true&&data.token===undefined)return {grant,secretUnavailable:true};if(typeof data.token==='string'&&/^sanctra_agent_[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(data.token)&&data.secretUnavailable===undefined)return {grant,token:data.token};throw malformed(true);}catch{throw malformed(true);}}
 return {
  async list(uid:string,cursor?:string):Promise<{grants:AgentGrant[];nextCursor?:string}>{const result=await request(uid,'GET',cursor?`?cursor=${encodeURIComponent(cursor)}`:'');if(!Array.isArray(result.data.grants)||(result.nextCursor!==undefined&&result.nextCursor!==null&&typeof result.nextCursor!=='string'))throw malformed();return {grants:result.data.grants.map(project),...(typeof result.nextCursor==='string'&&result.nextCursor?{nextCursor:result.nextCursor}:{})};},
  create:(uid:string,input:GrantInput)=>issue(uid,'',input),
  rotate:(uid:string,grant:AgentGrant,input:GrantInput)=>issue(uid,`/${encodeURIComponent(grant.id)}/rotate`,{...input,expectedVersions:{grant:grant.version}}),
  async revoke(uid:string,grant:AgentGrant,operationId:string,reason:string):Promise<AgentGrant>{const {data}=await request(uid,'POST',`/${encodeURIComponent(grant.id)}/revoke`,{operationId,reason,expectedVersions:{grant:grant.version}});return project(data.grant);},
 };
}
const client=createGrantClient(async uid=>{const {initFirebase}=await import('./firebase.ts');const user=initFirebase().auth?.currentUser;if(!user||user.uid!==uid)throw new GrantError('unauthorized','Sign in to your administrator account.');return user.getIdToken();});
export const listAgentGrants=client.list,createAgentGrant=client.create,revokeAgentGrant=client.revoke,rotateAgentGrant=client.rotate;
export async function reauthenticateAgentAdmin(uid:string){
 const [{initFirebase},{GoogleAuthProvider,reauthenticateWithPopup}]=await Promise.all([import('./firebase.ts'),import('firebase/auth')]);
 const user=initFirebase().auth?.currentUser;if(!user||user.uid!==uid)throw new GrantError('unauthorized','Sign in to your administrator account.');
 if(!user.providerData.some(provider=>provider.providerId==='google.com'))throw new GrantError('password_sign_in_required','Sign out and sign back in, then return to Integrations. No password is collected here.');
 await reauthenticateWithPopup(user,new GoogleAuthProvider());
}
export async function watchAgentAdminIdentity(callback:(uid:string|null)=>void){const [{initFirebase},{onAuthStateChanged}]=await Promise.all([import('./firebase.ts'),import('firebase/auth')]);const auth=initFirebase().auth;return auth?onAuthStateChanged(auth,user=>callback(user?.uid??null)):()=>{};}
