import React from 'react';
import { Layers, CheckCircle2, Flame, Calendar, Sparkles } from 'lucide-react';
import { formatDurationHuman } from '../utils/time.ts';
import type { Subject, ThemeId } from '../types/index.ts';
import { getThemePreset } from '../utils/themeRegistry.ts';

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
  activeThemeId?: ThemeId;
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
  activeThemeId,
}) => {
  const theme = getThemePreset(activeThemeId);
  // Calculate goal percentage
  const targetSeconds = dailyGoalHours * 3600;
  const goalPercent = Math.min(100, Math.round((todaySeconds / (targetSeconds || 1)) * 100));

  const cardStyle = {
    border: `1px solid ${theme.accent}26`,
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.25), 0 0 16px ${theme.accent}0d`,
  };

  return (
    <div className="timer-metrics w-full max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-2 sm:my-4">
      {/* 1. Subjects Card */}
      <button
        onClick={onOpenSubjects}
        style={cardStyle}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md hover:scale-[1.01]"
        aria-label={`Manage ${categoryLabel.toLowerCase()}`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-white transition-colors">
            {categoryLabel}
          </span>
          <Layers
            className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 transition-all group-hover:scale-110"
            style={{ color: undefined }}
          />
        </div>
        <div
          className="text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {subjectTrackingEnabled ? subjects.length : '—'}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] group-hover:text-[var(--rs-cream-soft)] transition-colors">
          {subjectTrackingEnabled ? `${subjects.length} active categories` : 'Subject tracking off'}
        </div>
      </button>

      {/* 2. Today's Progress Card */}
      <button
        onClick={onOpenGoalModal}
        style={cardStyle}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md hover:scale-[1.01]"
        aria-label="Adjust daily focus goal"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-white transition-colors">
            Today's Progress
          </span>
          <CheckCircle2
            className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 transition-all group-hover:scale-110"
          />
        </div>
        <div
          className="text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {formatDurationHuman(todaySeconds)}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] flex items-center gap-1.5">
          <span
            className="tabular-nums font-semibold px-1.5 py-0.5 rounded text-[10px] transition-colors"
            style={{
              backgroundColor: `${theme.accent}18`,
              borderColor: `${theme.accent}35`,
              borderWidth: '1px',
              borderStyle: 'solid',
              color: theme.accentSoft,
            }}
          >
            {goalPercent}%
          </span>
          <span className="text-[var(--rs-cream-dim)]">of {dailyGoalHours}h daily goal</span>
        </div>
      </button>

      {/* 3. Current Streak Card */}
      <button
        onClick={onOpenStreakHelp}
        style={cardStyle}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden backdrop-blur-xl transition-all shadow-md hover:scale-[1.01]"
        aria-label="View streak rules and progress"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75 group-hover:text-white transition-colors">
            Study Streak
          </span>
          <Flame
            className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50 transition-all group-hover:scale-110"
          />
        </div>
        <div
          className="text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {streakDays} <span className="font-sans text-xs text-[var(--rs-cream-dim)] font-normal">{streakDays === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] group-hover:text-[var(--rs-cream-soft)] transition-colors">
          ≥ 1h/day consistency rule
        </div>
      </button>

      {/* 4. This Week Card */}
      <div
        style={cardStyle}
        className="p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between text-left relative overflow-hidden backdrop-blur-xl shadow-md"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--rs-cream-soft)]/75">
            This Week
          </span>
          <Calendar className="w-3.5 h-3.5 text-[var(--rs-cream-soft)]/50" />
        </div>
        <div
          className="text-2xl sm:text-3xl font-normal text-[var(--rs-cream)] tracking-tight tabular-nums my-1"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {formatDurationHuman(thisWeekSeconds)}
        </div>
        <div className="text-[11px] font-sans text-[var(--rs-cream-dim)] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 transition-colors" style={{ color: theme.accent }} />
          <span>Active momentum</span>
        </div>
      </div>
    </div>
  );
};
