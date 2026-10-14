import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[{name:'hermes-management-fixture',enforce:'pre',transform(_code,id){if(!id.endsWith('/src/utils/agentGrantService.ts'))return;return `
import {createGrantClient,APPROVED_AGENT_SCOPES,GrantError} from '/src/utils/agentGrantService.ts?fixture-client';
export {APPROVED_AGENT_SCOPES,GrantError};
const now=Date.now(),iso=time=>new Date(time).toISOString();let items=[{id:'active',label:'Hermes on my private remote server with a deliberately long descriptive label for wrapping checks',creatorUid:'fixture-owner',scopes:APPROVED_AGENT_SCOPES,createdAt:iso(now-1000),expiresAt:null,revokedAt:null,version:'1'},{id:'expired',label:'Previous laptop',creatorUid:'fixture-owner',scopes:['study:read'],createdAt:iso(now-1000),expiresAt:iso(now-1),revokedAt:null,version:'1'},{id:'revoked',label:'Retired host',creatorUid:'fixture-owner',scopes:['support:read'],createdAt:iso(now-1000),expiresAt:null,revokedAt:iso(now-1),version:'1'}];
const client=createGrantClient(async()=> 'fixture-firebase-token',async(url,options)=>{
 const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):{};
 const fail=(code,message,status=409)=>Response.json({apiVersion:'1',error:{code,message,retryable:false}},{status});
 if(options.method==='GET')return Response.json({apiVersion:'1',data:{grants:items}});
 if(path.endsWith('/revoke')){const id=path.split('/').at(-2);items=items.map(item=>item.id===id?{...item,revokedAt:iso(Date.now()),version:'2'}:item);return Response.json({apiVersion:'1',data:{grant:items.find(item=>item.id===id)}});}
 if(body.label==='conflict')return fail('conflict','This grant changed.');
 if(body.label==='stale')return fail('reauthentication_required','Sign in again before issuing a credential.',401);
 if(body.label==='forbidden')return fail('forbidden','Only the Sanctra owner can manage Hermes connections.',403);
 if(body.label==='malformed')return Response.json({apiVersion:'1',data:{}});
 if(body.label==='lost')throw new Error('Lost response');
 if(!body.label||body.label.length>100)return fail('validation','Label must be at most 100 characters.',400);
 if(path.endsWith('/rotate')){const id=path.split('/').at(-2);items=items.map(item=>item.id===id?{...item,revokedAt:iso(Date.now()),version:'2'}:item);}
 else if(items.some(item=>!item.revokedAt&&(item.expiresAt===null||Date.parse(item.expiresAt)>Date.now())))return fail('conflict','Revoke or rotate the existing Hermes connection first.');
 const grant={id:crypto.randomUUID(),label:body.label,creatorUid:'fixture-owner',scopes:body.scopes,createdAt:iso(Date.now()),expiresAt:null,revokedAt:null,version:'1'};items=[grant,...items];return Response.json({apiVersion:'1',data:body.label==='replay'?{grant,secretUnavailable:true}:{grant,token:'sanctra_agent_'+ 'F'.repeat(22)+'.'+'P'.repeat(43)}});
});
export const listAgentGrants=client.list,createAgentGrant=client.create,revokeAgentGrant=client.revoke,rotateAgentGrant=client.rotate;
export async function reauthenticateAgentAdmin(){throw new GrantError('auth/popup-closed-by-user','Sign-in was cancelled. Your selections are unchanged.');}
export async function watchAgentAdminIdentity(callback){callback('fixture-owner');return()=>{};}
`; }},react()]});
