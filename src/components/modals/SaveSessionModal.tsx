import type {JeeSessionTag} from '../../types/index.ts';
import type {JeeSyllabus} from '../../types/jeetrack.ts';
import {JeeFocusPicker} from '../JeeFocusPicker.tsx';
import {callAiGateway} from '../../features/ai-planner/gateway.ts';
import {jeeChapterCatalog,parseJeeChapterSuggestion,JEE_CHAPTER_REQUEST} from '../../utils/jeeChapterSuggestion.ts';
import React, { useState, useEffect } from 'react';
import type { Subject, TimerMode } from '../../types/index.ts';
import { formatSecondsToHMS } from '../../utils/time.ts';
import { X, BookmarkCheck, Layers, FileText, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SaveSessionModalProps {
  jeeSyllabus?:JeeSyllabus;
  initialJeeTag?:JeeSessionTag;
  jeePractice?: boolean;
  jeeLabel?: string;
  isOpen: boolean;
  secondsStudied: number;
  mode: TimerMode;
  subjects: Subject[];
  initialSubjectId?: string;
  onSaveSession: (subjectId: string | undefined, notes: string, questions?: number, tag?:JeeSessionTag|null) => boolean;
  onClose: () => void;
}

export const SaveSessionModal: React.FC<SaveSessionModalProps> = ({
  isOpen,
  jeeSyllabus,
  initialJeeTag,
  jeeLabel,
  secondsStudied,
  subjects,
  initialSubjectId,
  onSaveSession,
  onClose,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(initialSubjectId);
  const [notes, setNotes] = useState('');
  const [tag,setTag]=useState<JeeSessionTag|undefined>(initialJeeTag);
  const [suggesting,setSuggesting]=useState(false);
  const [suggestion,setSuggestion]=useState('');
  const [error,setError]=useState('');
  const request=React.useRef(0);
  const practice=tag?.kind==='practice';
  useEffect(()=>{request.current++;setTag(initialJeeTag);setSuggesting(false);setSuggestion('');setError('');},[isOpen,initialJeeTag]);
  const [questions, setQuestions] = useState('');

  useEffect(() => { if (isOpen) { setSelectedSubjectId(initialSubjectId); setNotes(''); setQuestions(''); } }, [isOpen, initialSubjectId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (secondsStudied <= 0 || (questions !== '' && (!Number.isInteger(Number(questions)) || Number(questions)<0 || Number(questions)>10000))) return;
    if(suggesting)return;
    if (!onSaveSession(selectedSubjectId, notes.trim(), practice && questions !== '' ? Number(questions) : undefined, tag||null)) return;
    // Fire celebratory milestone confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [getComputedStyle(document.documentElement.querySelector('.sanctra-app') || document.documentElement).getPropertyValue('--sanctra-sage').trim() || '#b7cdea', '#f3f1e7'],
      });
    } catch (err) {
      // Non-blocking
    }

    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-7 relative border border-white/15 shadow-2xl max-h-[90dvh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-save-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-save-title" className="text-lg font-bold text-white tracking-tight">
                Keep this moment?
              </h2>
              <p className="text-xs text-slate-400">
                Keep a record of your focused time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studied Time Card */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/10 to-slate-900/40 border border-emerald-500/25 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            Focused time this session
          </span>
          <div className="text-3xl font-semibold text-white tracking-tight my-1 tabular-nums">
            {formatSecondsToHMS(secondsStudied)}
          </div>
          <div className="text-xs text-slate-300">
            Your focused time will be added to your history.
          </div>
        </div>

        {/* Subject Chooser */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Select Subject</span>
          </label>

          <select
            disabled={!!tag}
            value={tag?(subjects.find(s=>s.name.toLowerCase()==={physics:'physics',chemistry:'chemistry',maths:'mathematics'}[tag.subject]||tag.subject==='maths'&&s.name.toLowerCase()==='maths')?.id||'jee-auto'):(selectedSubjectId||'')}
            onChange={(e) => setSelectedSubjectId(e.target.value || undefined)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-sm text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            {tag&&<option value="jee-auto">{{physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[tag.subject]} · linked to chapter</option>}
            <option value="">— Untagged (No Subject) —</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {jeeLabel && tag?.chapterId===initialJeeTag?.chapterId && tag?.subject===initialJeeTag?.subject && <p className="mt-3 text-sm text-sky-100">{jeeLabel}</p>}
        {practice && <label className="mt-3 block text-sm text-slate-200">Questions solved (optional)
          <input className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2" type="number" min="0" max="10000" step="1" value={questions} onChange={e=>setQuestions(e.target.value)}/>
          <small className="block mt-1">Added to your practice log with this session.</small>
        </label>}
        {/* Notes / Reason */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Session Notes / Topic (Optional)</span>
          </label>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Chapter 5 practice questions, research notes, essay outline..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {jeeSyllabus && <section className="session-jee-link"><h3>Link this session to JEE Track <span>Optional</span></h3><p>Describe what you studied above — you can choose the chapter after focusing.</p><button type="button" className="analytics-button" disabled={suggesting||!notes.trim()} onClick={async()=>{
          const token=++request.current;setSuggesting(true);setError('');setSuggestion('');
          try{const raw=await callAiGateway('chat',JEE_CHAPTER_REQUEST,{description:notes.trim().slice(0,2000),subject:subjects.find(s=>s.id===selectedSubjectId)?.name,chapters:jeeChapterCatalog(jeeSyllabus)});if(token!==request.current)return;const result=parseJeeChapterSuggestion(raw,jeeSyllabus);if(result.tag)setTag(result.tag);setSuggestion(result.reason);}
          catch(e){if(token===request.current)setError(e instanceof Error?e.message:'Could not suggest a chapter. Select it below or save without a chapter.');}
          finally{if(token===request.current)setSuggesting(false);}
        }}>{suggesting?'Finding a chapter…':'Suggest chapter with AI'}</button><small>Uses one request from your shared AI allowance. Check the chapter before saving.</small>{suggestion&&<p role="status">{suggestion}</p>}{error&&<p role="alert" className="text-rose-200">{error}</p>}<JeeFocusPicker syllabus={jeeSyllabus} value={tag} disabled={suggesting} onChange={next=>{request.current++;setTag(next);setSuggestion('');}}/></section>}
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white glass-pill cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={suggesting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
