import React, { useEffect, useState } from 'react';
import { Laptop, Play, X, Loader2 } from 'lucide-react';
import type { ActiveSession } from '../../utils/activeSessionService.ts';
import { calculateElapsedSeconds } from '../../utils/activeSessionService.ts';
import { formatDurationHuman } from '../../utils/time.ts';

interface TakeOverModalProps {
  isOpen: boolean;
  activeSession: ActiveSession | null;
  isTakingOver: boolean;
  onTakeOver: () => void;
  onClose: () => void;
}

export const TakeOverModal: React.FC<TakeOverModalProps> = ({
  isOpen,
  activeSession,
  isTakingOver,
  onTakeOver,
  onClose,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTakingOver) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTakingOver, onClose]);

  // Keep elapsed time live while modal is open
  useEffect(() => {
    if (!isOpen || !activeSession || (activeSession.status !== 'running' && activeSession.status !== 'break-running')) return;
    const interval = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, activeSession]);

  if (!isOpen) return null;

  const elapsed = activeSession ? calculateElapsedSeconds(activeSession) : 0;
  const elapsedFormatted = formatDurationHuman(elapsed);
  const subjectName = activeSession?.subjectName || 'Focus session';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isTakingOver) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="takeover-modal w-full max-w-sm sm:max-w-md glass-modal rounded-3xl p-6 sm:p-8 relative border border-white/15 shadow-2xl text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-takeover-title"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isTakingOver}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="takeover-icon mx-auto mb-4 w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--sanctra-sage)_12%,transparent)] border border-[color-mix(in_srgb,var(--sanctra-sage)_24%,transparent)] flex items-center justify-center text-[var(--sanctra-sage)] shadow-sm">
          <Laptop className="w-6 h-6" />
        </div>

        <h2 id="modal-takeover-title" className="text-xl sm:text-2xl font-serif text-white tracking-tight">
          A timer is already running on another device
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 mt-2 mb-4 leading-relaxed">
          Sanctra keeps one active timer per account. Taking over will cleanly save its elapsed time to your history and start your session on this device.
        </p>

        {activeSession && (
          <div className="takeover-session-card mb-5 p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs sm:text-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400 card-row">
              <span className="card-label">Current session:</span>
              <span className="text-white font-medium card-value truncate max-w-[200px]" title={subjectName}>
                {subjectName}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 card-row">
              <span className="card-label">Elapsed time:</span>
              <span className="text-[var(--sanctra-sage)] font-semibold font-mono tabular-nums card-elapsed">
                {elapsedFormatted}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isTakingOver}
            className="flex-1 py-2.5 px-4 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold text-slate-300 hover:text-white glass-pill cursor-pointer disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onTakeOver}
            disabled={isTakingOver}
            className="takeover-primary flex-1 py-2.5 px-4 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold text-[var(--sanctra-ink)] bg-[var(--sanctra-sage)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-[color-mix(in_srgb,var(--sanctra-sage)_25%,transparent)]"
          >
            {isTakingOver ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Taking over…</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Take over</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
