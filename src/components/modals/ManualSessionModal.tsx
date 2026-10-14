import {JeeFocusPicker} from '../JeeFocusPicker.tsx';
import type {JeeSyllabus} from '../../types/jeetrack.ts';
import type {JeeSessionTag} from '../../types/index.ts';
import React, { useState, useEffect } from 'react';
import type { StudySession, Subject } from '../../types/index.ts';
import { getLocalDateString } from '../../utils/time.ts';
import { X, Clock, Calendar, Layers, FileText, Trash2, Check, PlusCircle } from 'lucide-react';

interface ManualSessionModalProps {
  jeeSyllabus?:JeeSyllabus;
  isOpen: boolean;
  editingSession: StudySession | null;
  subjects: Subject[];
  onSaveSession: (session: StudySession) => void;
  onDeleteSession?: (id: string) => void;
  onClose: () => void;
}

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  isOpen,
  jeeSyllabus,
  editingSession,
  subjects,
  onSaveSession,
  onDeleteSession,
  onClose,
}) => {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [sessionDate, setSessionDate] = useState(getLocalDateString());
  const [startTimeStr, setStartTimeStr] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>('');
  const [notes, setNotes] = useState('');
  const [questions,setQuestions]=useState('');
  const [jeeTag,setJeeTag]=useState<JeeSessionTag|undefined>();
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when editingSession changes
  useEffect(() => {
    setJeeTag(editingSession?.jee);
    if (editingSession) {
      const h = Math.floor(editingSession.durationSeconds / 3600);
      const m = Math.floor((editingSession.durationSeconds % 3600) / 60);
      setHours(h);
      setMinutes(m);
      setSessionDate(editingSession.date);
      setSelectedSubjectId(editingSession.subjectId || '');
      setNotes(editingSession.notes || '');setQuestions(editingSession.jee?.questions?.toString()||'');

      const dateObj = new Date(editingSession.startTime);
      const timeHours = dateObj.getHours().toString().padStart(2, '0');
      const timeMins = dateObj.getMinutes().toString().padStart(2, '0');
      setStartTimeStr(`${timeHours}:${timeMins}`);
    } else {
      setHours(1);
      setMinutes(0);
      setSessionDate(getLocalDateString());
      setSelectedSubjectId('');
      setNotes('');
      setStartTimeStr('');
    }
    setErrorMsg('');
  }, [editingSession]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalDurationSeconds = editingSession && hours===Math.floor(editingSession.durationSeconds/3600) && minutes===Math.floor((editingSession.durationSeconds%3600)/60) ? editingSession.durationSeconds : hours * 3600 + minutes * 60;
    if (totalDurationSeconds <= 0) {
      setErrorMsg('Duration must be greater than 0 minutes');
      return;
    }

    // Determine start and end timestamps
    let startTimestamp: number;
    let endTimestamp: number;

    if (startTimeStr) {
      const [h, m] = startTimeStr.split(':').map(Number);
      const dt = new Date(`${sessionDate}T00:00:00`);
      dt.setHours(h, m, 0, 0);
      const originalStart=editingSession?new Date(editingSession.startTime):null;
      const originalTime=originalStart?`${originalStart.getHours().toString().padStart(2,'0')}:${originalStart.getMinutes().toString().padStart(2,'0')}`:'';
      startTimestamp = editingSession&&sessionDate===editingSession.date&&startTimeStr===originalTime?editingSession.startTime:dt.getTime();
      endTimestamp = startTimestamp + totalDurationSeconds * 1000;
    } else {
      // Auto-calculate from current time minus duration (as defined in reference PDF page 12)
      endTimestamp = Date.now();
      startTimestamp = endTimestamp - totalDurationSeconds * 1000;
    }

    if(questions!==''&&(!Number.isInteger(Number(questions))||Number(questions)<0||Number(questions)>10000)){setErrorMsg('Enter a whole question count between 0 and 10,000.');return;}
    const matchedSub = subjects.find(s => s.id === (jeeTag?subjects.find(s=>s.name.toLowerCase()===({physics:'physics',chemistry:'chemistry',maths:'mathematics'}[jeeTag.subject])||(jeeTag.subject==='maths'&&s.name.toLowerCase()==='maths'))?.id:selectedSubjectId));

    const saved: StudySession = {
      ...editingSession,
      jee:jeeTag?{...jeeTag,questions:jeeTag.kind==='practice'&&questions!==''?Number(questions):undefined}:undefined,
      id: editingSession ? editingSession.id : `sess-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startTime: startTimestamp,
      endTime: endTimestamp,
      durationSeconds: totalDurationSeconds,
      mode: editingSession ? editingSession.mode : 'custom',
      subjectId: matchedSub?.id,
      subjectName: matchedSub?.name,
      subjectColor: matchedSub?.color,
      notes: notes.trim(),
      date: sessionDate,
    };

    onSaveSession(saved);
    onClose();
  };

  const isEditing = !!editingSession;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-7 relative border border-white/15 shadow-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-manual-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {isEditing ? <Clock className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="modal-manual-title" className="text-lg font-bold text-white tracking-tight">
                {isEditing ? 'Edit Study Session' : 'Add Past Session'}
              </h2>
              <p className="text-xs text-slate-400">
                Log missed focus hours or adjust session details
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Duration: Hours & Minutes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Study Duration
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-slate-900/80 border border-white/15 px-3 py-2 rounded-xl">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                  className="w-full bg-transparent text-white font-mono font-bold text-center focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-semibold">hours</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 border border-white/15 px-3 py-2 rounded-xl">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full bg-transparent text-white font-mono font-bold text-center focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-semibold">mins</span>
              </div>
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                placeholder="Auto-calc"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic -mt-2">
            Auto-calculated (Current Time - Study Time) if start time is left blank.
          </p>

          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Subject</span>
            </label>
            <select
              disabled={!!jeeTag}
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="">— Untagged (No Subject) —</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Reason / Notes (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. reading, project work, or forgot to start the timer..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>

          {jeeSyllabus&&<section className="session-jee-link"><h3>JEE chapter <span>Optional</span></h3><p>Link an older session to its chapter and activity. Its original study time is preserved.</p><JeeFocusPicker syllabus={jeeSyllabus} value={jeeTag} disabled={false} onChange={setJeeTag}/></section>}
          {jeeTag?.kind==='practice'&&<label className="block mt-4 text-sm text-slate-100">JEE questions solved<input className="block w-full mt-2 analytics-select" type="number" min="0" max="10000" step="1" value={questions} onChange={e=>setQuestions(e.target.value)}/></label>}
        {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
            {isEditing && onDeleteSession ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(editingSession.id);
                  onClose();
                }}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white glass-pill cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isEditing ? 'Save Changes' : 'Add Session'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
