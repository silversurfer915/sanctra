import React from 'react';
import { Layers, CheckCircle2, Flame, Calendar, Sparkles } from 'lucide-react';
import { formatDurationHuman } from '../utils/time.ts';
import type { Subject } from '../types/index.ts';

interface MetricCardsProps {
  categoryLabel?: string;
  subjects: Subject[];
  subjectTrackingEnabled: boolean;
  todaySeconds: number;
  dailyGoalHours: number;
  streakDays: number;
  thisWeekSeconds: number;
  onOpenSubjects: () => void;
  onOpenGoalModal: () => void;
  onOpenStreakHelp: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  categoryLabel = 'Subjects',
  subjects,
  subjectTrackingEnabled,
  todaySeconds,
  dailyGoalHours,
  streakDays,
  thisWeekSeconds,
  onOpenSubjects,
  onOpenGoalModal,
  onOpenStreakHelp,
}) => {
  // Calculate goal percentage (capped at 100 for bar, real value displayed)
  const targetSeconds = dailyGoalHours * 3600;
  const goalPercent = Math.min(100, Math.round((todaySeconds / (targetSeconds || 1)) * 100));

  return (
    <div className="timer-metrics w-full max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-3 sm:my-5">
      {/* 1. Subjects Card */}
      <button
        onClick={onOpenSubjects}
        className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden text-left"
        aria-label={`Manage ${categoryLabel.toLowerCase()}`}
      >
        <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <Layers className="w-5 h-5 text-teal-400" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 mb-1">
          {categoryLabel}
        </span>
        <div className="text-base sm:text-lg font-medium text-white tracking-tight tabular-nums">
          {subjectTrackingEnabled ? (
            <span className="flex items-center gap-1.5">
              <span>{subjects.length}</span>
              <span className="text-xs font-normal text-slate-300">
                {categoryLabel.toLowerCase()}
              </span>
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400">Disabled</span>
          )}
        </div>
      </button>

      {/* 2. Today's Progress Card */}
      <button
        onClick={onOpenGoalModal}
        className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden"
        aria-label="Adjust daily focus goal"
      >
        <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--sanctra-sage)_12%,transparent)] border border-[color-mix(in_srgb,var(--sanctra-sage)_24%,transparent)] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform text-[var(--sanctra-sage)]">
          <CheckCircle2 className="w-5 h-5 text-[var(--sanctra-sage)]" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 mb-1">
          Today's Progress
        </span>
        <div className="text-base sm:text-lg font-medium text-white tracking-tight tabular-nums">
          {formatDurationHuman(todaySeconds)}
        </div>
        <div className="text-[11px] text-[var(--sanctra-sage)]/80 mt-0.5 flex items-center gap-1">
          <span className="tabular-nums">{goalPercent}%</span>
          <span className="text-slate-400">of {dailyGoalHours}h goal</span>
        </div>
      </button>

      {/* 3. Current Streak Card */}
      <button
        onClick={onOpenStreakHelp}
        className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden"
        aria-label="View streak rules and progress"
      >
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <Flame className="w-5 h-5 text-rose-400" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 mb-1">
          Shared Streak
        </span>
        <div className="text-base sm:text-lg font-medium text-white tracking-tight flex items-center gap-1.5 tabular-nums">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          <span>
            {streakDays} {streakDays === 1 ? 'day' : 'days'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          ≥ 1h/day rule
        </div>
      </button>

      {/* 4. This Week Card */}
      <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-2.5">
          <Calendar className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 mb-1">
          This Week
        </span>
        <div className="text-base sm:text-lg font-medium text-white tracking-tight tabular-nums">
          {formatDurationHuman(thisWeekSeconds)}
        </div>
        <div className="text-[11px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Keep it up</span>
        </div>
      </div>
    </div>
  );
};
