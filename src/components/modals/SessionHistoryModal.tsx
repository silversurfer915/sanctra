import { useState, useEffect } from 'react';
import type { StudySession } from '../../types/index.ts';
import { formatDurationHuman, getLocalDateString } from '../../utils/time.ts';
import { sessionEnd } from '../../utils/analytics.ts';
import { SessionDetails } from '../analytics/SessionDetails.tsx';
import { X, Trash2 } from 'lucide-react';
interface SessionHistoryModalProps { isOpen: boolean; sessions: StudySession[]; onDeleteSession: (id: string) => void; onClose: () => void; }
export function SessionHistoryModal({ isOpen, sessions, onDeleteSession, onClose }: SessionHistoryModalProps) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20), [candidate, setCandidate] = useState<string|null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const start = from ? +new Date(`${from}T00:00:00`) : -Infinity;
  const end = to ? (()=>{const d=new Date(`${to}T00:00:00`);d.setDate(d.getDate()+1);return +d;})() : Infinity;
  const invalid = from && to && from>to;
  const history = sessions.filter(s=>!invalid&&sessionEnd(s)>start&&s.startTime<end&&`${s.subjectName||''} ${s.notes||''} ${s.mode}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.startTime-a.startTime);
  return <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"><section className="w-full max-w-2xl glass-modal rounded-3xl p-5 sm:p-7 max-h-[85vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="modal-history-title">
    <header className="flex items-start justify-between gap-3 pb-4 border-b border-white/10"><div><h2 id="modal-history-title" className="text-xl font-display">Your session history</h2><p className="text-xs text-slate-300 mt-2">{history.length} sessions · {formatDurationHuman(history.reduce((sum,s)=>sum+s.durationSeconds,0))} focused · Local time</p></div><button className="analytics-icon" aria-label="Close modal" onClick={onClose}><X size={18}/></button></header>
    <div className="py-4 space-y-3"><div className="flex flex-wrap gap-3"><label className="text-xs flex-1">From<input type="date" aria-label="History start date" className="analytics-select block mt-1 w-full" value={from} onChange={e=>{setFrom(e.target.value);setLimit(20);}}/></label><label className="text-xs flex-1">Through<input type="date" aria-label="History end date" className="analytics-select block mt-1 w-full" value={to} onChange={e=>{setTo(e.target.value);setLimit(20);}}/></label></div><div className="flex flex-wrap gap-2"><button className="analytics-button" onClick={()=>{setFrom(getLocalDateString());setTo(getLocalDateString());setLimit(20);}}>Today</button><button className="analytics-button" onClick={()=>{setFrom('');setTo('');setQuery('');setLimit(20);}}>All dates</button><input aria-label="Search session history" placeholder="Search subjects, modes, or notes" className="analytics-select flex-1 min-w-0" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20);}}/></div>{invalid&&<p role="alert" className="text-xs text-rose-300">Choose an end date on or after the start date.</p>}</div>
    <div className="flex-1 overflow-y-auto space-y-3 pr-1">{history.length?history.slice(0,limit).map(s=><article key={s.id} className="rounded-2xl p-4 border border-white/10 bg-white/5"><div className="flex gap-3 items-start"><div className="flex-1 min-w-0"><SessionDetails session={s}/></div><button className="analytics-icon shrink-0" aria-label={`Delete session from ${new Date(s.startTime).toLocaleDateString()}`} onClick={()=>setCandidate(s.id)}><Trash2 size={16}/></button></div>{candidate===s.id&&<div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs">Delete this saved session?</span><button className="analytics-button" onClick={()=>setCandidate(null)}>Keep</button><button className="analytics-button" onClick={()=>{onDeleteSession(s.id);setCandidate(null);}}>Delete</button></div>}</article>):<p className="text-sm text-slate-300 text-center py-8">No sessions match these dates or search.</p>}{history.length>limit&&<button className="analytics-button" onClick={()=>setLimit(v=>v+20)}>Show more sessions</button>}</div>
    <footer className="pt-4 mt-4 border-t border-white/10 text-xs text-slate-300">Focused duration excludes pauses and breaks. Sessions spanning dates show both dates.</footer>
  </section></div>;
}
