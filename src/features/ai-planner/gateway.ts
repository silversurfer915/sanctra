import {initFirebase} from '../../utils/firebase.ts';
import {AiGatewayError} from './errors.ts';
export const aiGatewayReady=()=>Boolean(import.meta.env?.VITE_AI_GATEWAY_URL);
export interface AiImage {mimeType:'image/jpeg'|'image/png'|'image/webp';data:string}
export async function callAiGateway(mode:'plan'|'chat'|'assistant'|'manual-session'|'validate-session',instructions:string,context:unknown,image?:AiImage):Promise<string>{
 const url=import.meta.env?.VITE_AI_GATEWAY_URL;if(!url)throw new Error('AI connection is awaiting configuration.');
 const {auth}=initFirebase();const token=await auth?.currentUser?.getIdToken();if(!token)throw new Error('Reconnect to Sanctra before using AI.');
 const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({mode,instructions,context,...(image?{image}:{})}),signal:AbortSignal.timeout(40000)});
 const data=await r.json();if(!r.ok)throw new AiGatewayError(typeof data.message==='string'?data.message:'Sanctra AI is unavailable.');if(typeof data.text!=='string')throw new Error('AI response could not be checked.');return data.text;
}
