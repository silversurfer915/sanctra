import React, { useEffect } from 'react';
import { Flame, X, ShieldCheck } from 'lucide-react';

interface StreakHelpModalProps {
  isOpen: boolean;
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
  onClose: () => void;
}

export const StreakHelpModal: React.FC<StreakHelpModalProps> = ({
  isOpen,
  currentStreak,
  bestStreak,
  activeDays,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-7 relative border border-white/15 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-streak-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-streak-title" className="text-lg font-bold text-white tracking-tight">
                Streak Consistency
              </h2>
              <p className="text-xs text-slate-400">
                A simple guide to your focus rhythm
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

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 text-center">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em] block">
              Current
            </span>
            <span className="text-xl font-semibold text-white mt-0.5 block">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 text-center">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em] block">
              Best
            </span>
            <span className="text-xl font-semibold text-[var(--sanctra-sage)] mt-0.5 block">
              {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 text-center">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.14em] block">
              Active
            </span>
            <span className="text-xl font-semibold text-emerald-400 mt-0.5 block">
              {activeDays} {activeDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Official Rules Box */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Streak Rules</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            Focus for a <span className="font-semibold text-white">minimum of 1 hour per day</span> to maintain your streak. Missing a day resets your streak back to 0. A missed day is a fresh start, not a failure.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
