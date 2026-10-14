import {validatePlannerResponse} from './validation.ts';
import type {PlannerContext,PlannerIssue,ProposalBatch} from './types.ts';
export type AssistantReply={ok:true;text:string;batch:ProposalBatch|null}|{ok:false;issues:PlannerIssue[]};
export function parseAssistantReply(raw:string,context:PlannerContext,ids:{batchId:string;proposalIds:string[]}):AssistantReply {
 let data:unknown;
 try {data=JSON.parse(raw);}catch{return {ok:false,issues:[{code:'response',message:'AI could not finish its reply. Please try again.'}]};}
 if(!data||typeof data!=='object'||Array.isArray(data))return {ok:false,issues:[{code:'response',message:'AI returned an unsupported reply.'}]};
 const result=data as Record<string,unknown>;
 if(typeof result.reply!=='string'||!Object.keys(result).every(k=>['reply','plan','sessions'].includes(k)))return {ok:false,issues:[{code:'response',message:'AI returned an unsupported reply.'}]};
 if(result.plan===null)return {ok:true,text:result.reply,batch:null};
 const validated=validatePlannerResponse(result.plan,context,ids);
 return validated.ok?{ok:true,text:result.reply,batch:validated.batch}:validated;
}
