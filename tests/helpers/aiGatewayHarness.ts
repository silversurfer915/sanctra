// Local-only service account key for mocked OAuth/Firestore requests; never a real credential.
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const bytes=new Uint8Array(await crypto.subtle.exportKey('pkcs8',pair.privateKey));
export const testServiceAccount=JSON.stringify({client_email:'ai-test@example.invalid',private_key:`-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...bytes))}\n-----END PRIVATE KEY-----`});
export function gatewayHarness(handler:typeof fetch):typeof fetch {
 return (async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'local-mock-token',expires_in:3600});
  if(url.includes('/ai_usage_days/'))return new Response('{}',{status:404});
  if(url.endsWith(':commit')&&JSON.parse(String(init?.body)).writes[0]?.update?.name?.includes('/ai_usage_days/'))return Response.json({});
  return handler(input,init);
 }) as typeof fetch;
}
