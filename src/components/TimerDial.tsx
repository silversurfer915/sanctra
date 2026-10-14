import React, { useEffect, useId } from 'react';
import { Play, Pause, RotateCcw, BookmarkCheck, Maximize2, Minimize2, Sliders, Layers, Eye } from 'lucide-react';
import type { TimerMode, TimerStatus, Subject } from '../types/index.ts';
import { canToggleTimerShortcut } from '../utils/timerShortcut.ts';
import { formatSecondsToHMS } from '../utils/time.ts';

interface TimerDialProps {
  minimal?:boolean;
  onToggleMinimal?:()=>void;
  seconds: number;
  canSave: boolean;
  totalTargetSeconds: number;
  mode: TimerMode;
  status: TimerStatus;
  isFullscreen: boolean;
  activeSubject?: Subject;
  subjectTrackingEnabled?: boolean;
  onOpenSubjects?: () => void;
  subjectControl?: React.ReactNode;
  subjectDetail?: string;
  onToggleStart: () => void;
  onRequestReset: () => void;
  onRequestSave: () => void;
  onToggleFullscreen: () => void;
  onOpenModeModal: () => void;
}

export const TimerDial: React.FC<TimerDialProps> = ({
  minimal = false,
  onToggleMinimal,
  seconds,
  canSave,
  totalTargetSeconds,
  mode,
  status,
  isFullscreen,
  activeSubject,
  subjectTrackingEnabled = true,
  onOpenSubjects,
  subjectControl,
  subjectDetail,
  onToggleStart,
  onRequestReset,
  onRequestSave,
  onToggleFullscreen,
  onOpenModeModal,
}) => {
  const gradientPrefix = useId();
  // Listen for Spacebar to toggle Start/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (canToggleTimerShortcut({
        code: e.code,
        repeat: e.repeat,
        interactive: Boolean(target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"]')),
        dialogOpen: Boolean(document.querySelector('[aria-modal="true"], [role="dialog"], .fixed.inset-0.z-50')),
      })) {
        e.preventDefault();
        onToggleStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleStart]);

  // Determine progress ring stroke dashoffset
  const radius = 145;
  const circumference = 2 * Math.PI * radius;

  let progressRatio = 0;
  if (mode === 'countup' && !status.startsWith('break-')) {
    // For countup, loop smoothly every 60 minutes or gentle subtle pulse
    progressRatio = (seconds % 3600) / 3600;
  } else {
    // Countdown ring shows time remaining, so long sessions have a visible dial.
    if (totalTargetSeconds > 0) {
      progressRatio = Math.max(0, Math.min(1, seconds / totalTargetSeconds));
    }
  }

  const strokeDashoffset = circumference - progressRatio * circumference;

  // Determine ring & glow colors based on timer state
  const getRingColor = () => {
    if (status === 'break-running' || status === 'break-ready' || status === 'break-paused') {
      return {
        stroke: 'var(--sanctra-sage)',
        gradientId: gradientPrefix + '-breakGradient',
        glow: 'drop-shadow(0 0 16px color-mix(in srgb,var(--sanctra-sage) 35%,transparent))',
      };
    }
    if (status === 'paused') {
      return {
        stroke: 'color-mix(in srgb, var(--sanctra-sage) 75%, white)',
        gradientId: gradientPrefix + '-pauseGradient',
        glow: 'drop-shadow(0 0 8px color-mix(in srgb,var(--sanctra-sage) 25%,transparent))',
      };
    }
    if (status === 'running') {
      return {
        stroke: 'var(--sanctra-sage)',
        gradientId: gradientPrefix + '-focusGradient',
        glow: 'drop-shadow(0 0 12px color-mix(in srgb,var(--sanctra-sage) 25%,transparent))',
      };
    }
    return {
      stroke: '#475569', // Slate
      gradientId: gradientPrefix + '-idleGradient',
      glow: 'none',
    };
  };

  const ringStyle = getRingColor();

  const getModeLabel = () => {
    switch (mode) {
      case 'pomodoro-25':
        return '25m Pomodoro';
      case 'pomodoro-custom':
        return 'Custom Pomodoro';
      case 'pomodoro-90':
        return '90m Pomodoro';
      case 'pomodoro-50':
        return '50m Pomodoro';
      case 'countdown-60':
        return '1 Hour Countdown';
      case 'countdown-120':
        return '2 Hours Countdown';
      case 'custom':
        return 'Custom Countdown';
      case 'countup':
      default:
        return 'Free Count-Up';
    }
  };

  const isRunning = status === 'running' || status === 'break-running';

  return (
    <div data-running={isRunning} className="timer-dial flex flex-col items-center justify-center my-3 sm:my-6 select-none">
      {/* Circular Timer Ring */}
      <div className="timer-ring relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
        {/* Ambient background glow circle */}
        <div
          className="absolute inset-4 rounded-full transition-all duration-700 pointer-events-none"
          style={{
            background: isRunning
              ? 'radial-gradient(circle, color-mix(in srgb,var(--sanctra-sage) 14%,transparent) 0%, transparent 70%)'
              : 'transparent',
          }}
        />

        <svg role="progressbar" aria-label={mode === 'countup' ? 'Focus hour progress' : 'Time remaining'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressRatio * 100)} className="w-full h-full transform -rotate-90" viewBox="0 0 320 320">
          <defs>
            <linearGradient id={gradientPrefix + '-focusGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--sanctra-sage)" />
              <stop offset="100%" stopColor="var(--sanctra-muted)" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-breakGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="color-mix(in srgb,var(--sanctra-sage) 80%,white)" />
              <stop offset="100%" stopColor="var(--sanctra-sage)" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-pauseGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--sanctra-sage) 85%, white)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--sanctra-sage) 50%, var(--sanctra-surface))" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-idleGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Background Track Ring */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="12"
            fill="transparent"
          />

          {/* Active Progress Ring */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke={`url(#${ringStyle.gradientId})`}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'none',
              filter: ringStyle.glow,
            }}
          />
          <circle cx={160+radius*Math.cos(progressRatio*2*Math.PI)} cy={160+radius*Math.sin(progressRatio*2*Math.PI)} r="4" fill="var(--sanctra-sage)" aria-label="Timer progress indicator" />
        </svg>

        {/* Center Digital Display & Mode Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {/* Status / Break indicator */}
          {!minimal && <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-slate-400 mb-1">
            {status === 'break-running' || status === 'break-ready' || status === 'break-paused'
              ? 'Break Time'
              : getModeLabel()}
          </span>}

          {/* Large Tabular Time Readout (Minimalist, Simplistic, Tabular Numbers) */}
          <div className="timer-readout text-5xl sm:text-6xl font-medium tracking-tight tabular-nums text-white drop-shadow-sm py-1 select-none">
            {formatSecondsToHMS(seconds)}
          </div>

          {/* Centered Customize Timer Trigger Button */}
          {!minimal && <button
            onClick={onOpenModeModal}
            className="mt-2.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wide text-slate-300 hover:text-white glass-pill border border-white/10 hover:border-white/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer btn-sheen-subtle mx-auto z-20"
            aria-label="Customize timer mode and duration"
          >
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span>Customize Timer</span>
          </button>}

          {/* Active Subject Selector Button (Below Customize Timer) */}
          {!minimal && subjectTrackingEnabled && (subjectControl || (onOpenSubjects && (
            <button
              onClick={onOpenSubjects}
              aria-label="Select focus category"
              title="Change active subject"
              className="mt-2 px-3 py-1 rounded-full text-xs font-medium text-slate-200 hover:text-white glass-pill border border-white/10 hover:border-white/25 flex items-center justify-center gap-2 transition-all cursor-pointer btn-sheen-subtle mx-auto z-20 max-w-[190px]"
            >
              {activeSubject ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                    style={{ backgroundColor: activeSubject.color }}
                  />
                  <span className="truncate">{activeSubject.name}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Untagged</span>
                </>
              )}
            </button>
          )))}
          {subjectDetail && !minimal && <button type="button" className="timer-chapter-detail" onClick={onOpenSubjects}>{subjectDetail}</button>}
        </div>
      </div>

      {/* Action Pill Bar (Buttons) */}
      <div className="timer-actions flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 mt-5 sm:mt-7 max-w-3xl px-4">
        {/* 1. Start / Pause Button */}
        <button
          onClick={onToggleStart}
          aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
          className="btn-sheen flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all duration-200 shadow-lg cursor-pointer bg-[var(--sanctra-sage)] hover:brightness-105 text-[var(--sanctra-ink)] shadow-[color-mix(in_srgb,var(--sanctra-sage)_25%,transparent)] ring-2 ring-[var(--sanctra-sage)]/30"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-[var(--sanctra-ink)]" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-[var(--sanctra-ink)] ml-0.5" />
              <span>{status === 'paused' || status === 'break-paused' ? 'Resume' : 'Start'}</span>
            </>
          )}
          <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-black/20 text-slate-900 ml-1">
            Space
          </span>
        </button>

        {/* 2. Reset Button */}
        <button
          onClick={onRequestReset}
          disabled={seconds === 0 && status === 'idle'}
          aria-label="Reset timer"
          title={seconds === 0 && status === 'idle' ? 'Start a session first' : 'Reset timer'}
          className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-slate-200 bg-slate-800/50 hover:bg-slate-700/60 border border-white/10 hover:border-white/20 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
          <span>Reset</span>
        </button>

        {/* 3. Save Session Button */}
        <button
          onClick={onRequestSave}
          disabled={!canSave}
          aria-label="Save focus session"
          title={!canSave ? 'Start a session to save focus time' : 'Save focus session'}
          className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-rose-200 bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/30 hover:border-rose-400/50 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <BookmarkCheck className="w-4 h-4 text-rose-300" />
          <span>Save session</span>
        </button>

        {/* 4. Fullscreen Button */}
        {!minimal && <button
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
          className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-slate-200 glass-pill border border-white/10 hover:border-white/25 shadow-md transition-all cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-slate-300" />
              <span>Exit full screen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-slate-300" />
              <span>Full screen</span>
            </>
          )}
        </button>}
        
      </div>
      {minimal && (
        <button
          type="button"
          className="timer-only-exit glass-pill group"
          onClick={onToggleMinimal}
          aria-label="Show full interface"
          title="Show full interface (Press ESC)"
        >
          <Eye className="w-3.5 h-3.5 text-slate-300 transition-transform group-hover:scale-110" />

        </button>
      )}
    </div>
  );
};
