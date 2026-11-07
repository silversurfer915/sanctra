import React, { useEffect, useId } from 'react';
import { Play, Pause, RotateCcw, BookmarkCheck, Maximize2, Minimize2, Sliders, Layers, Eye } from 'lucide-react';
import type { TimerMode, TimerStatus, Subject } from '../types/index.ts';
import { canToggleTimerShortcut } from '../utils/timerShortcut.ts';

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

  // Determine ring & glow colors based on timer state
  const getRingColor = () => {
    if (status === 'break-running' || status === 'break-ready' || status === 'break-paused') {
      return {
        stroke: '#34d399',
        gradientId: gradientPrefix + '-breakGradient',
        glow: 'drop-shadow(0 0 16px rgba(52, 211, 153, 0.45))',
      };
    }
    if (status === 'paused') {
      return {
        stroke: '#e5b869',
        gradientId: gradientPrefix + '-pauseGradient',
        glow: 'drop-shadow(0 0 10px rgba(229, 184, 105, 0.35))',
      };
    }
    if (status === 'running') {
      return {
        stroke: '#e5b869',
        gradientId: gradientPrefix + '-focusGradient',
        glow: 'drop-shadow(0 0 18px rgba(229, 184, 105, 0.55))',
      };
    }
    return {
      stroke: 'rgba(255, 255, 255, 0.15)',
      gradientId: gradientPrefix + '-idleGradient',
      glow: 'none',
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
        {/* Living Ambient Warm Glow Background */}
        <div
          className="absolute inset-2 rounded-full transition-all duration-700 pointer-events-none"
          style={{
            background: isRunning
              ? 'radial-gradient(circle, rgba(229, 184, 105, 0.14) 0%, rgba(20, 36, 62, 0.08) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 70%)',
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
              <stop offset="0%" stopColor="#fff2cc" />
              <stop offset="50%" stopColor="#e5b869" />
              <stop offset="100%" stopColor="#c8933e" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-breakGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-pauseGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#e5b869" />
            </linearGradient>
            <linearGradient id={gradientPrefix + '-idleGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
            </linearGradient>
            {/* Frosted Smoky Glass Dial Plate */}
            <radialGradient id={gradientPrefix + '-glassPlate'} cx="50%" cy="42%" r="65%">
              <stop offset="0%" stopColor="rgba(24, 30, 42, 0.55)" />
              <stop offset="55%" stopColor="rgba(14, 18, 26, 0.78)" />
              <stop offset="100%" stopColor="rgba(8, 11, 16, 0.94)" />
            </radialGradient>
            {/* Specular Curved Reflection Arc */}
            <linearGradient id={gradientPrefix + '-glassSpecular'} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="35%" stopColor="rgba(255, 255, 255, 0.10)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            {/* Beveled Glass Rim */}
            <linearGradient id={gradientPrefix + '-glassRim'} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.06)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.02)" />
            </linearGradient>
          </defs>

          {/* Frosted Glass Backing Lens */}
          <circle
            cx="160"
            cy="160"
            r={radius - 8}
            fill={`url(#${gradientPrefix}-glassPlate)`}
            stroke={`url(#${gradientPrefix}-glassRim)`}
            strokeWidth="1"
          />

          {/* Specular Curved Highlight Arc across top glass */}
          <path
            d="M 52 125 A 132 132 0 0 1 268 125"
            stroke={`url(#${gradientPrefix}-glassSpecular)`}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.32"
          />

          {/* Concentric Precision Gauge Track Rings */}
          <circle
            cx="160"
            cy="160"
            r="105"
            fill="none"
            stroke="rgba(229, 184, 105, 0.16)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <circle
            cx="160"
            cy="160"
            r="72"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="0.75"
          />

          {/* 60-Second Chronometer Micro-Graduation Ticks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const tickAngle = (i * 360) / 60;
            const is5Min = i % 5 === 0;
            const is15Min = i % 15 === 0;
            return (
              <line
                key={`micro-${i}`}
                x1="160"
                y1={is15Min ? '128' : is5Min ? '131' : '133'}
                x2="160"
                y2="136"
                stroke={
                  is15Min
                    ? 'rgba(229, 184, 105, 0.75)'
                    : is5Min
                    ? 'rgba(229, 184, 105, 0.45)'
                    : 'rgba(255, 255, 255, 0.14)'
                }
                strokeWidth={is15Min ? '1.5' : is5Min ? '1.2' : '0.75'}
                transform={`rotate(${tickAngle} 160 160)`}
              />
            );
          })}

          {/* Cardinal Chronometer Numerals (60, 15, 30, 45) */}
          <text x="160" y="122" textAnchor="middle" fill="rgba(229, 184, 105, 0.55)" fontSize="7" fontFamily="var(--rs-serif)" fontWeight="500">60</text>
          <text x="220" y="162.5" textAnchor="middle" fill="rgba(229, 184, 105, 0.55)" fontSize="7" fontFamily="var(--rs-serif)" fontWeight="500">15</text>
          <text x="160" y="222" textAnchor="middle" fill="rgba(229, 184, 105, 0.55)" fontSize="7" fontFamily="var(--rs-serif)" fontWeight="500">30</text>
          <text x="100" y="162.5" textAnchor="middle" fill="rgba(229, 184, 105, 0.55)" fontSize="7" fontFamily="var(--rs-serif)" fontWeight="500">45</text>

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
                stroke={isMajor ? 'rgba(229, 184, 105, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
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
              fill="#fffdf8"
              stroke="#e5b869"
              strokeWidth="2"
              style={{
                filter: 'drop-shadow(0 0 10px rgba(229, 184, 105, 0.9))',
              }}
              aria-label="Timer progress indicator"
            />
          )}
        </svg>

        {/* Center Digital Display & Mode Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {/* Status / Break indicator */}
          {!minimal && (
            <span className="text-[11px] font-sans uppercase tracking-[0.22em] font-medium text-[#e5b869] mb-1">
              {status === 'break-running' || status === 'break-ready' || status === 'break-paused'
                ? 'Break Time'
                : getModeLabel()}
            </span>
          )}

          {/* Large Tabular Didone Time Readout */}
          <div className="timer-readout font-serif text-6xl sm:text-7xl font-normal tracking-tight tabular-nums text-[#f5f2eb] drop-shadow-[0_2px_24px_rgba(229,184,105,0.35)] py-0.5 select-none leading-none">
            {formatDisplayTime(seconds)}
          </div>

          {/* Quick Mode & Customization Trigger */}
          {!minimal && (
            <div className="mt-3 flex items-center gap-2 z-20">
              <button
                onClick={onOpenModeModal}
                className="px-3.5 py-1.5 rounded-full text-xs font-sans font-medium text-slate-300 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                aria-label="Customize timer mode and duration"
              >
                <Sliders className="w-3 h-3 text-[#e5b869]" />
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
              className="mt-2 px-3.5 py-1 rounded-full text-xs font-sans font-medium text-slate-200 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/25 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm mx-auto z-20 max-w-[200px]"
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

      {/* Action Pill Bar (Buttons) */}
      <div className="timer-actions flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 mt-5 sm:mt-7 max-w-3xl px-4">
        {/* 1. Start / Pause Button */}
        <button
          onClick={onToggleStart}
          aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
          className="btn-sheen flex items-center gap-2 px-7 sm:px-9 py-3 rounded-full font-sans font-bold text-sm sm:text-base tracking-wide transition-all duration-200 cursor-pointer bg-[#e5b869] hover:bg-[#edd085] text-[#12151b] shadow-[0_4px_24px_rgba(229,184,105,0.4)] ring-1 ring-[#e5b869]/60"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-[#12151b]" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-[#12151b] ml-0.5" />
              <span>{status === 'paused' || status === 'break-paused' ? 'Resume' : 'Start'}</span>
            </>
          )}
          <span className="hidden sm:inline-block text-[10px] font-sans uppercase font-bold px-1.5 py-0.5 rounded bg-black/20 text-[#12151b] ml-1">
            Space
          </span>
        </button>

        {/* 2. Reset Button */}
        <button
          onClick={onRequestReset}
          disabled={seconds === 0 && status === 'idle'}
          aria-label="Reset timer"
          title={seconds === 0 && status === 'idle' ? 'Start a session first' : 'Reset timer'}
          className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-sans font-semibold tracking-wide text-slate-200 bg-[#12151b]/80 hover:bg-[#1a1f29] border border-white/10 hover:border-white/20 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-sans font-semibold tracking-wide text-[#e5b869] bg-[#e5b869]/10 hover:bg-[#e5b869]/20 border border-[#e5b869]/30 hover:border-[#e5b869]/50 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <BookmarkCheck className="w-4 h-4 text-[#e5b869]" />
          <span>Save session</span>
        </button>

        {/* 4. Fullscreen Button */}
        {!minimal && (
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit full screen mode' : 'Enter full screen mode'}
            className="btn-sheen-subtle flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full text-xs sm:text-sm font-sans font-semibold tracking-wide text-slate-200 bg-[#12151b]/80 hover:bg-[#1a1f29] border border-white/10 hover:border-white/20 shadow-md transition-all cursor-pointer"
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
