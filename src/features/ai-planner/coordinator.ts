import type {ApplyResult,UndoResult} from './types.ts';
import type {TaskItem} from '../../types/index.ts';
export function commitPlannerResult(result:ApplyResult|UndoResult,save:(tasks:TaskItem[])=>void):boolean{if('ok' in result){if(!result.ok||!result.receipt.changes.length)return false;}else if(!result.revertedIds.length)return false;save(result.tasks);return true;}
