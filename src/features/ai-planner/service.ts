import {callAiGateway,aiGatewayReady} from './gateway.ts';
import {isSanctraAiRequest,AI_SCOPE_MESSAGE} from './policy.ts';
import type {PlannerContext,PlannerTransport,PlannerValidation} from './types.ts';
import {validatePlannerResponse} from './validation.ts';
import {aiErrorMessage} from './errors.ts';
export function plannerAvailability():{ready:boolean;reason?:'configuration'}{return aiGatewayReady()?{ready:true}:{ready:false,reason:'configuration'};}
export const plannerErrorMessage=aiErrorMessage;
export async function generatePlannerBatch(context:PlannerContext,ids:{batchId:string;proposalIds:string[]},transport?:PlannerTransport):Promise<PlannerValidation>{
 if(!isSanctraAiRequest(context.instructions))return {ok:false,issues:[{code:'scope',message:AI_SCOPE_MESSAGE}]};

 try {const send=transport??(()=>callAiGateway('plan',context.instructions,{...context,userId:undefined,workspaceId:undefined,legacySpaceId:undefined}));const raw=await send(JSON.stringify(context));const envelope=JSON.parse(raw);envelope.summary='Review these times before adding them to Tasks.';return validatePlannerResponse(envelope,context,ids);}catch(e){return {ok:false,issues:[{code:'provider',message:plannerErrorMessage(e)}]};}
}
