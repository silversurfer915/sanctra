import React from 'react';
import { Sparkles, Coffee, BookmarkCheck } from 'lucide-react';
import { formatDurationHuman } from '../../utils/time.ts';

interface PomodoroCompleteModalProps {
  isOpen: boolean;
  durationSeconds: number;
  breakDurationMinutes: number;
  onTakeBreak: () => void;
  onSaveSession: () => void;
}

export const PomodoroCompleteModal: React.FC<PomodoroCompleteModalProps> = ({
  isOpen,
  durationSeconds,
  breakDurationMinutes,
  onTakeBreak,
  onSaveSession,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTakeBreak();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onTakeBreak]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onTakeBreak(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
    >
      <div 
        className="w-full max-w-sm glass-modal rounded-3xl p-6 sm:p-7 relative border border-emerald-500/30 shadow-2xl text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pomodoro-title"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-3.5 shadow-lg shadow-emerald-500/20 animate-bounce">
          <Sparkles className="w-7 h-7" />
        </div>

        <h2 id="modal-pomodoro-title" className="text-xl font-bold text-white tracking-tight">
          Focus Session Complete!
        </h2>

        <p className="text-xs text-slate-300 mt-2 mb-1">
          Session finished: <span className="font-bold text-emerald-400">{formatDurationHuman(durationSeconds)}</span>
        </p>

        <p className="text-xs text-slate-400 mb-6">
          Great work! Your {breakDurationMinutes}-minute break is ready. Save your session now to record your study hours!
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onTakeBreak}
            className="w-full py-3 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Coffee className="w-4 h-4" />
            <span>Take {breakDurationMinutes}m Break</span>
          </button>

          <button
            type="button"
            onClick={onSaveSession}
            className="w-full py-3 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/15 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-300" />
            <span>Save & Finish Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
