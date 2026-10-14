import type {PlannerIdentity} from './types.ts';
export function createPlannerRequestGate(){let epoch=0,owner='';const key=(i:PlannerIdentity)=>`${i.userId}|${i.workspaceId}`;return {begin(i:PlannerIdentity){owner=key(i);return ++epoch;},invalidate(){epoch++;},isCurrent(id:number,i:PlannerIdentity){return id===epoch&&key(i)===owner;}};}
