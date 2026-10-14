import { belongsToWorkspace } from '../../utils/workspaces.ts';
import type {TaskItem} from '../../types/index.ts';
import type {ProposalBatch,PlannerIdentity,ApplyResult,ApplyReceipt,UndoResult} from './types.ts';
import {draftTask,validatePlannerSelection,taskFingerprint} from './validation.ts';
export function applyPlannerBatch(current:TaskItem[],batch:ProposalBatch,selectedIds:string[],o:{identity:PlannerIdentity;today:string;now:number;alreadyAppliedIds:string[]}):ApplyResult {
 if(o.identity.userId!==batch.identity.userId||o.identity.workspaceId!==batch.identity.workspaceId||selectedIds.some(id=>o.alreadyAppliedIds.includes(id)))return {ok:false,issues:[{code:'owner',message:'This plan is no longer available. Generate a fresh plan.'}]};
 const issues=validatePlannerSelection(batch,selectedIds,current,o.today);if(issues.length)return {ok:false,issues};
 let tasks=[...current];const receipt:ApplyReceipt={batchId:batch.id,identity:batch.identity,changes:[]};
 for(const p of batch.proposals.filter(p=>selectedIds.includes(p.id))){const before=tasks.find(t=>t.id===p.taskId)??null;const after=p.kind==='delete'?null:draftTask(p,batch,o.today,o.now);tasks=tasks.filter(t=>t.id!==p.taskId);if(after)tasks.push(after);receipt.changes.push({proposalId:p.id,before,after});}
 return {ok:true,tasks,receipt};
}
export function undoPlannerBatch(current:TaskItem[],receipt:ApplyReceipt,identity:PlannerIdentity):UndoResult {
 const result:UndoResult={tasks:[...current],revertedIds:[],issues:[]};if(identity.userId!==receipt.identity.userId||identity.workspaceId!==receipt.identity.workspaceId){result.issues.push({code:'owner',message:'Undo belongs to another account or workspace.'});return result;}
 for(const ch of [...receipt.changes].reverse()){const id=(ch.after??ch.before)!.id,t=result.tasks.find(t=>t.id===id);if(ch.after?(!t||taskFingerprint(t)!==taskFingerprint(ch.after)):!!t){result.issues.push({proposalId:ch.proposalId,code:'stale',message:'A later edit was preserved.'});continue;}
  const remaining=result.tasks.filter(t=>t.id!==id);
  if(ch.before&&ch.before.startTime&&remaining.some(o=>belongsToWorkspace(o,identity.workspaceId,identity.legacySpaceId)&&o.dueDate===ch.before!.dueDate&&o.startTime&&o.endTime&&ch.before!.endTime&&o.startTime<ch.before!.endTime&&ch.before!.startTime!<o.endTime&&!o.completed)){result.issues.push({proposalId:ch.proposalId,code:'overlap',message:'Undo would overlap a newer task.'});continue;}
  result.tasks=ch.before?[...remaining,ch.before]:remaining;result.revertedIds.push(ch.proposalId);
 }
 return result;
}
