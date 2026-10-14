import {useState} from 'react';
import {ArrowRight,Undo2} from 'lucide-react';
import {ProposalTimeline,type ProposalStatus} from './ProposalTimeline.tsx';
import type {ProposalBatch,PlannerIssue,ApplyResult,ApplyReceipt,UndoResult} from './types.ts';
interface Props {
 batch:ProposalBatch;
 onApply:(batch:ProposalBatch,ids:string[])=>ApplyResult;
 onUndo:(receipt:ApplyReceipt)=>UndoResult;
 onOpenTasks:()=>void;
 onChange:(batch:ProposalBatch,savedIds:string[])=>void;
}
export function ChatPlanReview({batch:initial,onApply,onUndo,onOpenTasks,onChange}:Props) {
 const [batch,setBatch]=useState(initial);
 const [selected,setSelected]=useState(initial.proposals.filter(p=>p.kind!=='delete').map(p=>p.id));
 const [statuses,setStatuses]=useState<Record<string,ProposalStatus>>({});
 const [issues,setIssues]=useState<PlannerIssue[]>([]);
 const [receipt,setReceipt]=useState<ApplyReceipt|null>(null);
 const savedIds=Object.keys(statuses).filter(id=>statuses[id]==='applied');
 const apply=()=>{
  if(!selected.length)return;
  const result=onApply(batch,selected);
  if(!result.ok){setIssues(result.issues);return;}
  setReceipt(previous=>({ ...result.receipt,changes:[...(previous?.changes||[]),...result.receipt.changes] }));
  setStatuses(previous=>({...previous,...Object.fromEntries(selected.map(id=>[id,'applied']))}));
  onChange(batch,[...savedIds,...selected]);setSelected([]);setIssues([]);
 };
 const undo=()=>{
  if(!receipt)return;
  const result=onUndo(receipt);setIssues(result.issues);
  setStatuses(previous=>({...previous,...Object.fromEntries(result.revertedIds.map(id=>[id,'pending']))}));
  setReceipt(result.issues.length?{...receipt,changes:receipt.changes.filter(change=>!result.revertedIds.includes(change.proposalId))}:null);
  onChange(batch,savedIds.filter(id=>!result.revertedIds.includes(id)));
 };
 return <section className="ai-chat-plan ai-planner" aria-label="Proposed tasks">
  <header><span className="workspace-eyebrow">Proposed tasks</span><p className="ai-plan-note">Review or edit, then add the tasks you want.</p></header>
  {issues.filter(issue=>!issue.proposalId).map((issue,index)=><p role="alert" className="ai-plan-error" key={index}>{issue.message}</p>)}
  <ProposalTimeline batch={batch} selectedIds={selected} issues={issues} statuses={statuses}
   onEdit={(id,draft)=>{const next={...batch,proposals:batch.proposals.map(p=>p.id===id?{...p,draft}:p)};setBatch(next);setIssues([]);onChange(next,savedIds);}}
   onSelect={(id,checked)=>setSelected(previous=>checked?[...previous,id]:previous.filter(value=>value!==id))}
   onDiscard={id=>{setSelected(previous=>previous.filter(value=>value!==id));const next={...batch,proposals:batch.proposals.filter(p=>p.id!==id)};setBatch(next);onChange(next,savedIds);}}/>
  <footer className="ai-plan-actions"><p>{selected.length?`${selected.length} selected · review before saving`:savedIds.length?`${savedIds.length} added to Tasks`:'Select tasks to add'}</p><button className="workspace-primary" disabled={!selected.length} onClick={apply}>Add to Tasks <ArrowRight size={15}/></button></footer>
  {receipt&&<div className="ai-plan-saved" role="status"><span>Added to Tasks</span><button className="analytics-button" onClick={onOpenTasks}>Open Tasks</button><button className="analytics-button" onClick={undo}><Undo2 size={14}/>Undo</button></div>}
 </section>;
}
