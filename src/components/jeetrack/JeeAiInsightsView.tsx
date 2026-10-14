import { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, ArrowUpRight } from 'lucide-react';
import type { JeeTrackState, JeeAiInsightsResult } from '../../types/jeetrack.ts';
import type { StudySession, TaskItem } from '../../types/index.ts';
import { AiAllowance } from '../AiAllowance.tsx';
import { aiGatewayReady, callAiGateway } from '../../features/ai-planner/gateway.ts';
import { aiErrorMessage } from '../../features/ai-planner/errors.ts';
import { buildJeeAIContext, requestJeeCoach, type JeeCoachResult } from '../../utils/jeeAI.ts';

interface JeeAiInsightsViewProps {
  state: JeeTrackState;
  onUpdateInsights?: (insights: JeeAiInsightsResult) => void;
  userId?: string;
  plus?: boolean;
  sessions?: StudySession[];
  tasks?: TaskItem[];
  onReviewPlan?: (instructions: string) => void;
}

export function JeeAiInsightsView({state,userId,plus=false,sessions=[],tasks=[],onReviewPlan}:JeeAiInsightsViewProps) {
  const [result,setResult] = useState<JeeCoachResult|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const request = useRef(0), inFlight=useRef(false);
  const context=buildJeeAIContext(state,sessions,tasks);
  const ready=aiGatewayReady()&&Boolean(userId);
  useEffect(()=>{request.current++;inFlight.current=false;setResult(null);setBusy(false);setError('');return()=>{request.current++;};},[userId]);
  const refresh=async()=>{
    if(inFlight.current||!ready||!context.hasRecordedProgress)return;
    const token=++request.current;inFlight.current=true;setBusy(true);setError('');
    try {
      const next=await requestJeeCoach(context,callAiGateway);
      if(token===request.current)setResult(next);
    } catch(e) {
      if(token===request.current)setError(e instanceof Error&&/coach|Reconnect|configuration/.test(e.message)?e.message:aiErrorMessage(e));
    } finally {if(token===request.current){inFlight.current=false;setBusy(false);}}
  };
  return <div className="space-y-5 pb-8">
    <section className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={19}/>JEE preparation coach</h2><p className="text-sm text-slate-300 mt-1">Sanctra AI reviews your recorded preparation and suggests what to work on next.</p></div>
        <button type="button" className="analytics-button" disabled={busy||!ready||!context.hasRecordedProgress} onClick={()=>void refresh()}><RefreshCw size={16} className={busy?'animate-spin':''}/>{busy?'Reviewing your records…':result?'Refresh coaching':'Review my preparation'}</button>
      </div>
      {userId&&<AiAllowance uid={userId} plus={plus}/>}
      <p className="text-xs text-slate-400">Uses up to 90 days of mocks, chapter progress, practice, hours, backlogs and recent Sanctra focus sessions. Each review uses your shared AI allowance. No rank or percentile prediction.</p>
      {!ready&&<p role="status" className="text-sm text-slate-300">{userId?'Sanctra AI is waiting for its connection to be configured.':'Sign in to use the preparation coach.'}</p>}
      {!context.hasRecordedProgress&&<p className="text-sm text-slate-300">Save a focus session or record a mock, practice log, study hours or completed chapter first. The coach cannot assess an empty preparation record.</p>}
      {busy&&<p role="status" className="text-sm text-slate-300">Sending your recorded preparation to Sanctra AI. This may take a moment.</p>}
      {error&&<p role="alert" className="text-sm text-rose-200">{error} Use “{result?'Refresh coaching':'Review my preparation'}” to retry.</p>}
    </section>
    {result&&<>
      <section className="glass-card rounded-2xl p-5 space-y-2"><h3 className="font-semibold">Your preparation review</h3><p className="text-sm text-slate-200 leading-relaxed">{result.summary}</p><small className="text-slate-400">Generated {new Date(result.generatedAt).toLocaleString()} · Coaching suggestion, based on records available at the time.</small></section>
      <div className="grid gap-4 md:grid-cols-2">
        {[{title:'Strengths to build on',items:result.strengths},{title:'Gaps and unknowns',items:result.gaps}].map(group=><section key={group.title} className="glass-card rounded-2xl p-5 space-y-3"><h3 className="font-semibold">{group.title}</h3>{!group.items.length&&<p className="text-sm text-slate-400">No evidence-backed findings returned for this category.</p>}{group.items.map((finding,i)=><article key={i} className="border-t border-white/10 pt-3 space-y-1"><h4 className="text-sm font-semibold">{finding.title}</h4><p className="text-xs text-slate-400">Evidence: {finding.evidence}</p><p className="text-sm text-slate-200">{finding.advice}</p></article>)}</section>)}
      </div>
      <section className="glass-card rounded-2xl p-5 space-y-3"><h3 className="font-semibold">Suggested next seven days</h3><p className="text-xs text-slate-400">Nothing is added automatically. Review the tasks and choose times in Sanctra AI.</p>{result.actions.map(action=><article key={action.day} className="border-t border-white/10 pt-3"><h4 className="text-sm font-semibold">Day {action.day} · {action.task}</h4><p className="text-xs text-slate-400 mt-1">{action.reason}</p></article>)}{onReviewPlan&&result.actions.length>0&&<button type="button" className="analytics-button" onClick={()=>onReviewPlan(`Help me schedule these JEE coaching suggestions. Ask me for suitable dates, available times and durations before proposing tasks. Do not save anything without my review.\n${result.actions.map(a=>`Day ${a.day}: ${a.task}`).join('\n')}`)}>Review in Sanctra AI<ArrowUpRight size={16}/></button>}</section>
    </>}
  </div>;
}
