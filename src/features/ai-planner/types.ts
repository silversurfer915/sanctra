import type {TaskItem,Subject,JeeSessionTag} from '../../types/index.ts';
export interface PlannerIdentity {userId:string;workspaceId:string;legacySpaceId:string}
export interface PlannerInput extends PlannerIdentity {instructions:string;now:Date;includeTasks:boolean;allowDeletes:boolean;tasks:TaskItem[];subjects:Subject[]}
export interface PlannerContext extends PlannerIdentity {jeeChapters?:{subject:JeeSessionTag['subject'];chapterId:number;name:string}[];fullAccess?:boolean;today:string;localTime:string;timezone:string;horizonEnd:string;instructions:string;includeTasks:boolean;allowDeletes:boolean;tasks:TaskItem[];subjects:Pick<Subject,'id'|'name'>[];truncated:boolean}
export interface TaskDraft {jee?:JeeSessionTag|null;text:string;dueDate:string|null;startTime:string|null;endTime:string|null;subjectId:string|null}
export interface PlannerOperation {kind:'create'|'update'|'delete';taskId:string|null;draft:TaskDraft|null}
export interface PlannerEnvelope {version:1;summary:string;question:string|null;operations:PlannerOperation[]}
export interface PlannerProposal extends PlannerOperation {id:string;before?:TaskItem}
export interface ProposalBatch {id:string;identity:PlannerIdentity;context:PlannerContext;summary:string;question:string|null;proposals:PlannerProposal[]}
export interface PlannerIssue {proposalId?:string;code:string;message:string}
export type PlannerValidation={ok:true;batch:ProposalBatch}|{ok:false;issues:PlannerIssue[]};
export interface UndoChange {proposalId:string;before:TaskItem|null;after:TaskItem|null}
export interface ApplyReceipt {batchId:string;identity:PlannerIdentity;changes:UndoChange[]}
export type ApplyResult={ok:true;tasks:TaskItem[];receipt:ApplyReceipt}|{ok:false;issues:PlannerIssue[]};
export type UndoResult={tasks:TaskItem[];revertedIds:string[];issues:PlannerIssue[]};
export type PlannerTransport=(prompt:string)=>Promise<string>;
