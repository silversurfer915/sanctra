import React, { useState } from 'react';
import { Target, X, Check } from 'lucide-react';

interface DailyGoalModalProps {
  isOpen: boolean;
  currentGoalHours: number;
  onSaveGoal: (hours: number) => void;
  onClose: () => void;
}

export const DailyGoalModal: React.FC<DailyGoalModalProps> = ({
  isOpen,
  currentGoalHours,
  onSaveGoal,
  onClose,
}) => {
  const [goal, setGoal] = useState(currentGoalHours);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoal(Math.max(0.5, Math.min(24, goal)));
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-sm glass-modal rounded-3xl p-6 relative border border-white/15 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-goal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--sanctra-sage)]/15 border border-[var(--sanctra-sage)]/30 flex items-center justify-center text-[var(--sanctra-sage)]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-goal-title" className="text-base font-bold text-white tracking-tight">
                Daily Focus Target
              </h2>
              <p className="text-[11px] text-slate-400">
                Adjust your daily focus objective
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center mb-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Daily Focus Target (Hours)
            </label>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={goal}
                onChange={(e) => setGoal(parseFloat(e.target.value) || 1)}
                className="w-24 px-3 py-2 text-2xl font-semibold rounded-xl bg-slate-950 border border-[var(--sanctra-sage)]/40 text-center text-white font-mono focus:outline-none focus:border-[var(--sanctra-sage)]"
              />
              <span className="text-base font-bold text-slate-400">hours</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Suggested: 3 to 6 hours of deliberate daily focus.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white glass-pill cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-[var(--sanctra-ink)] bg-[var(--sanctra-sage)] hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-black/20"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
