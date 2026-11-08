import React, { useEffect, useId } from 'react';
import { Play, Pause, RotateCcw, BookmarkCheck, Maximize2, Minimize2, Sliders, Layers, Eye } from 'lucide-react';
import type { TimerMode, TimerStatus, Subject, ThemeId } from '../types/index.ts';
import { canToggleTimerShortcut } from '../utils/timerShortcut.ts';
import { getThemePreset } from '../utils/themeRegistry.ts';

interface TimerDialProps {
  minimal?: boolean;
  onToggleMinimal?: () => void;
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
  activeThemeId?: ThemeId;
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
  activeThemeId,
}) => {
  const gradientPrefix = useId();
  const theme = getThemePreset(activeThemeId);

  // Listen for Spacebar to toggle Start/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        canToggleTimerShortcut({
          code: e.code,
          repeat: e.repeat,
          interactive: Boolean(
            target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"]')
          ),
          dialogOpen: Boolean(document.querySelector('[aria-modal="true"], [role="dialog"], .fixed.inset-0.z-50')),
        })
      ) {
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
    // For countup, loop smoothly every 60 minutes
    progressRatio = (seconds % 3600) / 3600;
  } else {
    // Countdown ring shows time remaining
    if (totalTargetSeconds > 0) {
      progressRatio = Math.max(0, Math.min(1, seconds / totalTargetSeconds));
    }
  }

  const strokeDashoffset = circumference - progressRatio * circumference;

  // Compute bead coordinate along the progress arc in standard SVG coordinates
  // Progress stroke starts at 12 o'clock and fills clockwise via transform="rotate(-90 160 160)".
  // Angle 0 is at 12 o'clock: x increases with sin(angle), y increases with -cos(angle).
  const angle = progressRatio * 2 * Math.PI;
  const beadX = 160 + radius * Math.sin(angle);
  const beadY = 160 - radius * Math.cos(angle);

  // Determine ring & glow colors based on timer state - always dynamically express the theme
  const getRingColor = () => {
    if (status === 'break-running' || status === 'break-ready' || status === 'break-paused') {
      return {
        stroke: '#A7F3D0',
        gradientId: gradientPrefix + '-breakGradient',
        glow: 'drop-shadow(0 0 18px rgba(167, 243, 208, 0.55))',
      };
    }
    if (status === 'paused') {
      return {
        stroke: theme.accent,
        gradientId: gradientPrefix + '-pauseGradient',
        glow: `drop-shadow(0 0 14px ${theme.accent}66)`,
      };
    }
    if (status === 'running') {
      return {
        stroke: theme.accent,
        gradientId: gradientPrefix + '-focusGradient',
        glow: theme.ringGlow,
      };
    }
    // Idle state: showcase active theme's pastel gradient and luminous glow
    return {
      stroke: theme.accent,
      gradientId: gradientPrefix + '-focusGradient',
      glow: `drop-shadow(0 0 16px ${theme.accent}45)`,
    };
  };

  const ringStyle = getRingColor();

  const getModeLabel = () => {
    switch (mode) {
      case 'pomodoro-25':
        return '25M POMODORO';
      case 'pomodoro-custom':
        return 'CUSTOM POMODORO';
      case 'pomodoro-90':
        return '90M POMODORO';
      case 'pomodoro-50':
        return '50M DEEP FLOW';
      case 'countdown-60':
        return '1 HOUR COUNTDOWN';
      case 'countdown-120':
        return '2 HOURS COUNTDOWN';
      case 'custom':
        return 'CUSTOM COUNTDOWN';
      case 'countup':
      default:
        return 'OPEN CONTEMPLATION';
    }
  };

  // Format seconds to clock display: MM:SS if hours === 0, or HH:MM:SS
  const formatDisplayTime = (totalSecs: number) => {
    const safe = Math.max(0, Math.floor(totalSecs));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  };

  const isRunning = status === 'running' || status === 'break-running';

  return (
    <div data-running={isRunning} className="timer-dial flex flex-col items-center justify-center my-2 sm:my-4 select-none">
      {/* Circular Timer Ring */}
      <div className="timer-ring relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        {/* Living Dynamic Pastel Ambient Glow Background */}
        <div
          className="absolute inset-2 rounded-full transition-all duration-700 pointer-events-none"
          style={{
            background: isRunning
              ? theme.ambientCoreGlow
              : `radial-gradient(circle, ${theme.accent}1f 0%, ${theme.accent}05 50%, transparent 74%)`,
          }}
        />

        <svg
          role="progressbar"
          aria-label={mode === 'countup' ? 'Focus hour progress' : 'Time remaining'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressRatio * 100)}
          className="w-full h-full pointer-events-none"
          viewBox="0 0 320 320"
        >
          <defs>
            <linearGradient id={gradientPrefix + '-focusGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.gradientStops[0]} />
              <stop offset="50%" stopColor={theme.gradientStops[1]} />
              <stop offset="100%" stopColor={theme.gradientStops[2]} />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-breakGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0FDF4" />
              <stop offset="50%" stopColor="#D1FAE5" />
              <stop offset="100%" stopColor="#A7F3D0" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-pauseGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.accentSoft} />
              <stop offset="100%" stopColor={theme.accent} />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-idleGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
            </linearGradient>
          </defs>

          {/* Outer 24 graduation ticks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const tickAngle = (i * 360) / 24;
            const isMajor = i % 2 === 0;
            return (
              <line
                key={i}
                x1="160"
                y1={isMajor ? '8' : '10'}
                x2="160"
                y2={isMajor ? '18' : '15'}
                stroke={isMajor ? `${theme.accent}55` : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={isMajor ? '1.5' : '1'}
                transform={`rotate(${tickAngle} 160 160)`}
              />
            );
          })}

          {/* Background Track Ring */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="10"
            fill="transparent"
          />

          {/* Active Progress Ring - Rotated -90deg in SVG so it starts at 12 o'clock and fills clockwise */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            stroke={`url(#${ringStyle.gradientId})`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform="rotate(-90 160 160)"
            style={{
              transition: 'none',
              filter: ringStyle.glow,
            }}
          />

          {/* Glowing Indicator Bead at tip - only shown when ring is partially open to avoid seam lumps */}
          {progressRatio > 0.02 && progressRatio < 0.98 && (
            <circle
              cx={beadX}
              cy={beadY}
              r="4.5"
              fill={theme.beadColor}
              stroke={theme.beadStroke}
              strokeWidth="2"
              style={{
                filter: `drop-shadow(0 0 10px ${theme.accent})`,
              }}
              aria-label="Timer progress indicator"
            />
          )}
        </svg>

        {/* Center Digital Display & Mode Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {/* Status / Break indicator */}
          {!minimal && (
            <span
              className="text-[11px] font-sans uppercase tracking-[0.22em] font-medium mb-1 transition-colors"
              style={{ color: theme.accent }}
            >
              {status === 'break-running' || status === 'break-ready' || status === 'break-paused'
                ? 'Break Time'
                : getModeLabel()}
            </span>
          )}

          {/* Large Tabular Time Readout */}
          <div
            className="timer-readout text-6xl sm:text-7xl font-normal tracking-tight tabular-nums text-[#f5f2eb] py-0.5 select-none leading-none transition-all"
            style={{
              fontFamily: theme.fontTimer,
              filter: `drop-shadow(0 2px 24px ${theme.accent}55)`,
            }}
          >
            {formatDisplayTime(seconds)}
          </div>

          {/* Quick Mode Trigger */}
          {!minimal && (
            <div className="mt-3 flex items-center justify-center gap-2 z-20">
              <button
                type="button"
                onClick={onOpenModeModal}
                className="px-3.5 py-1.5 rounded-full text-xs font-sans font-medium text-slate-200 hover:text-white bg-black/45 hover:bg-black/65 border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                style={{
                  borderColor: `${theme.accent}33`,
                  boxShadow: `0 0 14px ${theme.accent}14`,
                }}
                aria-label="Customize timer mode and duration"
              >
                <Sliders className="w-3 h-3" style={{ color: theme.accent }} />
                <span>Customize</span>
              </button>
            </div>
          )}

          {/* Active Subject Selector Button */}
          {!minimal && subjectTrackingEnabled && (subjectControl || (onOpenSubjects && (
            <button
              onClick={onOpenSubjects}
              aria-label="Select focus category"
              title="Change active subject"
              className="mt-2 px-3.5 py-1 rounded-full text-xs font-sans font-medium text-slate-200 hover:text-white bg-black/45 hover:bg-black/65 border flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm mx-auto z-20 max-w-[200px]"
              style={{
                borderColor: `${theme.accent}33`,
                boxShadow: `0 0 14px ${theme.accent}14`,
              }}
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
          {subjectDetail && !minimal && (
            <button type="button" className="timer-chapter-detail text-xs font-sans text-slate-400 mt-1" onClick={onOpenSubjects}>
              {subjectDetail}
            </button>
          )}
        </div>
      </div>

      {/* Action Pill Bar (Buttons) - Sleek Single Row matching Image 3 */}
      <div className="timer-actions flex items-center justify-center gap-2 sm:gap-2.5 mt-3 sm:mt-4 w-full max-w-xl px-2 z-20 flex-nowrap">
        {/* 1. Start / Pause Primary Hero Button */}
        <button
          onClick={onToggleStart}
          aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
          title={isRunning ? 'Pause focus timer (Space)' : 'Start focus timer (Space)'}
          className="btn-sheen flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-sans font-bold text-xs sm:text-sm tracking-wide transition-all duration-200 cursor-pointer shrink-0"
          style={{
            backgroundColor: theme.buttonBg,
            color: theme.buttonText,
            boxShadow: theme.buttonGlow,
            border: `1px solid ${theme.buttonRing}`,
          }}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              <span>{status === 'paused' || status === 'break-paused' ? 'Resume' : 'Start'}</span>
            </>
          )}
          <span
            className="hidden sm:inline-block text-[9px] font-sans uppercase font-bold px-1.5 py-0.5 rounded bg-black/20 ml-1 leading-none"
            style={{ color: 'inherit' }}
          >
            SPACE
          </span>
        </button>

        {/* 2. Reset Button */}
        <button
          onClick={onRequestReset}
          disabled={seconds === 0 && status === 'idle'}
          aria-label="Reset timer"
          title={seconds === 0 && status === 'idle' ? 'Start a session first' : 'Reset timer'}
          className="btn-sheen-subtle flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-sans font-semibold tracking-wide text-slate-200 bg-[#12151b]/80 hover:bg-[#1a1f29] border border-white/10 hover:border-white/20 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
          <span>Reset</span>
        </button>

        {/* 3. Save Session Button */}
        <button
          onClick={onRequestSave}
          disabled={!canSave}
          aria-label="Save focus session"
          title={!canSave ? 'Start a session to save focus time' : 'Save focus session'}
          className="btn-sheen-subtle flex items-center justify-center gap-1.5 px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-full text-xs font-sans font-semibold tracking-wide shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
          style={{
            color: theme.accent,
            backgroundColor: `${theme.accent}15`,
            borderColor: `${theme.accent}40`,
          }}
        >
          <BookmarkCheck className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <span>Save session</span>
        </button>

        {/* 4. Fullscreen Button */}
        {!minimal && (
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
            className="btn-sheen-subtle flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-sans font-semibold tracking-wide text-slate-200 bg-[#12151b]/80 hover:bg-[#1a1f29] border border-white/10 hover:border-white/20 shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-300" />
                <span>Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
                <span>Full screen</span>
              </>
            )}
          </button>
        )}
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
