/** Personal credentials never share the Firebase sign-in token namespace. */
export interface PersonalTokenRecord {hash:string;createdAt:string;revoked:boolean}
const encoder=new TextEncoder();
function base64url(bytes:Uint8Array):string {return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(raw:string):Uint8Array<ArrayBuffer> {
 if(!/^[A-Za-z0-9_-]+$/.test(raw))throw new Error('Invalid identity.');
 return Uint8Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
}
async function hash(raw:string):Promise<string> {return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(raw))));}
export async function issuePersonalToken():Promise<{token:string;record:PersonalTokenRecord}> {
 const token='sanctra_personal_'+base64url(crypto.getRandomValues(new Uint8Array(32)));
 return {token,record:{hash:await hash(token),createdAt:new Date().toISOString(),revoked:false}};
}
export async function matchesPersonalToken(token:string,record:PersonalTokenRecord|null):Promise<boolean> {
 if(!record||record.revoked||!/^sanctra_personal_[A-Za-z0-9_-]{43}$/.test(token))return false;
 const candidate=await hash(token),stored=record.hash;
 let difference=candidate.length^stored.length;
 for(let i=0;i<candidate.length;i++)difference|=candidate.charCodeAt(i)^(stored.charCodeAt(i)||0);
 return difference===0;
}
export interface OwnerIdentity {uid:string;authTime:number}
/** Validate every security claim AND RS256 signature; decoded UID alone is never authority. */
export async function verifyOwnerIdentity(token:string,project:string,owner:string,fetchKeys:typeof fetch=fetch):Promise<OwnerIdentity> {
 if(!owner)throw new Error('Invalid identity.');
 const identity=await verifyFirebaseIdentity(token,project,fetchKeys);
 if(identity.uid!==owner)throw new Error('Invalid identity.');
 return identity;
}
export async function verifyFirebaseIdentity(token:string,project:string,fetchKeys:typeof fetch=fetch):Promise<OwnerIdentity> {
 if(token.length>8192||!project)throw new Error('Invalid identity.');
 const parts=token.split('.');if(parts.length!==3)throw new Error('Invalid identity.');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 if(claims.firebase?.sign_in_provider==='anonymous')throw new Error('Invalid identity.');
 const now=Math.floor(Date.now()/1000);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.aud!==project||claims.iss!==`https://securetoken.google.com/${project}`||typeof claims.sub!=='string'||!claims.sub.length||claims.sub.length>128||!Number.isInteger(claims.exp)||claims.exp<=now||!Number.isInteger(claims.iat)||claims.iat>now+60||!Number.isInteger(claims.auth_time)||claims.auth_time>now+60)throw new Error('Invalid identity.');
 const response=await fetchKeys('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Identity unavailable.');
 const payload=await response.json() as {keys:Array<JsonWebKey&{kid:string}>};
 const jwk=payload.keys.find(key=>key.kid===header.kid);if(!jwk)throw new Error('Invalid identity.');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw new Error('Invalid identity.');
 return {uid:claims.sub,authTime:claims.auth_time};
}
