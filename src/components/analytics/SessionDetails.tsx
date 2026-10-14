import {ManualValidationStatus} from '../../features/ai-planner/ManualValidationStatus.tsx';
import type { StudySession } from '../../types/index.ts';
import { sessionEnd } from '../../utils/analytics.ts';
import { formatDurationHuman } from '../../utils/time.ts';
export function SessionDetails({ session, allowValidation=true }: { session: StudySession; allowValidation?:boolean }) {
  const start = new Date(session.startTime), end = new Date(sessionEnd(session));
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();
  const elapsed = Math.round((+end - +start) / 1000);
  return <div className="space-y-1.5 min-w-0">
    <p className="text-sm font-semibold">{session.subjectName || 'Untagged session'} <span className="text-xs font-normal opacity-80">· {session.mode.replaceAll('-', ' ')}</span></p>
    {session.strictMode !== undefined && <p className="text-xs text-slate-300">{session.strictMode ? 'Strict Mode · foreground only' : 'Standard Mode · background time counts'}</p>}
    {session.rankingCapped && <p className="text-xs text-slate-300">Ranking cap applied · uninterrupted stretches earn at most 3 hours. Full duration shown below.</p>}
    {session.source === 'ai-manual' && <ManualValidationStatus session={session} allowValidation={allowValidation}/>}
    {session.workspaceName&&<p className="text-xs text-slate-300">{session.workspaceName}</p>}
    {session.timeOfDayUnknown?<p className="text-xs text-slate-300">{session.date} · Time of day not recorded</p>:<p className="text-xs text-slate-300">{start.toLocaleDateString(undefined,dateOptions)} · {start.toLocaleTimeString(undefined,timeOptions)} → {sameDay ? '' : `${end.toLocaleDateString(undefined,dateOptions)} · `}{end.toLocaleTimeString(undefined,timeOptions)}</p>}
    <p className="text-xs text-slate-300"><strong>{formatDurationHuman(session.durationSeconds)} focused</strong>{elapsed !== session.durationSeconds && ` · ${formatDurationHuman(elapsed)} elapsed (includes pauses / breaks)`}</p>
    {session.notes && <p className="text-sm text-slate-200 whitespace-pre-wrap break-words rounded-lg bg-white/5 p-3 mt-2"><span className="block text-[10px] uppercase tracking-wider opacity-70 mb-1">Session notes</span>{session.notes}</p>}
  </div>;
}
