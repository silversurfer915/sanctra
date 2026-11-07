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
  // Calculate goal percentage
  const targetSeconds = dailyGoalHours * 3600;
  const goalPercent = Math.min(100, Math.round((todaySeconds / (targetSeconds || 1)) * 100));

  return (
    <div className="timer-metrics w-full max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-2 sm:my-4">
      {/* 1. Subjects Card */}
      <button
        onClick={onOpenSubjects}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md"
        aria-label={`Manage ${categoryLabel.toLowerCase()}`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-[var(--rs-cream)] transition-colors">
            {categoryLabel}
          </span>
          <Layers className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 group-hover:text-[var(--rs-amber)] transition-all group-hover:scale-110" />
        </div>
        <div className="font-serif text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1">
          {subjectTrackingEnabled ? subjects.length : '—'}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] group-hover:text-[var(--rs-cream-soft)] transition-colors">
          {subjectTrackingEnabled ? `${subjects.length} active categories` : 'Subject tracking off'}
        </div>
      </button>

      {/* 2. Today's Progress Card */}
      <button
        onClick={onOpenGoalModal}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md"
        aria-label="Adjust daily focus goal"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-[var(--rs-cream)] transition-colors">
            Today's Progress
          </span>
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 group-hover:text-[var(--rs-amber)] transition-all group-hover:scale-110" />
        </div>
        <div className="font-serif text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1">
          {formatDurationHuman(todaySeconds)}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] flex items-center gap-1.5">
          <span className="tabular-nums font-semibold px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px] text-[var(--rs-cream-soft)]">{goalPercent}%</span>
          <span className="text-[var(--rs-cream-dim)]">of {dailyGoalHours}h daily goal</span>
        </div>
      </button>

      {/* 3. Current Streak Card */}
      <button
        onClick={onOpenStreakHelp}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md"
        aria-label="View streak rules and progress"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-[var(--rs-cream)] transition-colors">
            Study Streak
          </span>
          <Flame className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 group-hover:text-[var(--rs-amber)] transition-all group-hover:scale-110" />
        </div>
        <div className="font-serif text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1">
          {streakDays} <span className="font-sans text-xs text-[var(--rs-cream-dim)] font-normal">{streakDays === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] group-hover:text-[var(--rs-cream-soft)] transition-colors">
          ≥ 1h/day consistency rule
        </div>
      </button>

      {/* 4. This Week Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-xl shadow-md">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75">
            This Week
          </span>
          <Calendar className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50" />
        </div>
        <div className="font-serif text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1">
          {formatDurationHuman(thisWeekSeconds)}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[var(--rs-amber)]/70" />
          <span>Active momentum</span>
        </div>
      </div>
    </div>
  );
};
