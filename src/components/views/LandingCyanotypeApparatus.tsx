import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ArrowUpRight } from 'lucide-react';

interface LandingCyanotypeApparatusProps {
  timerMode: 'pomodoro-25' | 'pomodoro-50' | 'countup';
  timerSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  activeSubject: string;
  onToggleRunning: () => void;
  onResetTimer: () => void;
  onSelectMode: (mode: 'pomodoro-25' | 'pomodoro-50' | 'countup') => void;
  onOpenDesk: () => void;
}

export function LandingCyanotypeApparatus({
  timerMode,
  timerSeconds,
  totalSeconds,
  isRunning,
  activeSubject,
  onToggleRunning,
  onResetTimer,
  onSelectMode,
  onOpenDesk,
}: LandingCyanotypeApparatusProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Spacebar hotkey to Start / Pause timer (matching real Sanctra behavior)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        onToggleRunning();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleRunning]);

  // Subtle interactive 3D perspective tilt
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const normX = (clientX / rect.width - 0.5) * 2;
      const normY = (clientY / rect.height - 0.5) * 2;

      setTilt({
        x: -normY * 4.5,
        y: normX * 5.5,
      });
    };

    const handlePointerLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  // Time formatting
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Progress ring math (identical to Sanctra TimerDial)
  const radius = 132;
  const circumference = 2 * Math.PI * radius; // ~829.38

  let progressRatio = 0;
  if (timerMode === 'countup') {
    progressRatio = (timerSeconds % 3600) / 3600;
  } else {
    // Pomodoro countdown ring shows time remaining: starts 100% full and drains backwards
    if (totalSeconds > 0) {
      progressRatio = Math.max(0, Math.min(1, timerSeconds / totalSeconds));
    }
  }

  const strokeDashoffset = circumference - progressRatio * circumference;

  // Active indicator bead position on the circular ring
  // Native unrotated SVG coordinates:
  // 12 o'clock is at angle 0 (x = 160, y = 160 - radius).
  // Clockwise progression: x increases with sin(angle), y increases with -cos(angle).
  // The progress circle has transform="rotate(-90 160 160)", which starts its stroke at 12 o'clock and fills clockwise.
  // Therefore, (beadX, beadY) matches the stroke tip exactly with zero CSS rotation distortion.
  const angle = progressRatio * 2 * Math.PI;
  const beadX = 160 + radius * Math.sin(angle);
  const beadY = 160 - radius * Math.cos(angle);

  const getModeTitle = () => {
    if (timerMode === 'pomodoro-25') return '25m Pomodoro';
    if (timerMode === 'pomodoro-50') return '50m Deep Flow';
    return 'Free Count-Up';
  };

  const modePalettes = {
    'pomodoro-25': {
      accent: '#C4B5FD', // Pastel Lavender
      accentSoft: '#EDE9FE',
      textInk: '#1E1238',
      stops: ['#FAF5FF', '#DDD6FE', '#C4B5FD'],
      glow: 'rgba(196, 181, 253, 0.45)',
      wash: 'rgba(196, 181, 253, 0.18)',
    },
    'pomodoro-50': {
      accent: '#BAE6FD', // Pastel Sky
      accentSoft: '#F0F9FF',
      textInk: '#082136',
      stops: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
      glow: 'rgba(186, 230, 253, 0.45)',
      wash: 'rgba(186, 230, 253, 0.18)',
    },
    countup: {
      accent: '#A7F3D0', // Pastel Mint
      accentSoft: '#F0FDF4',
      textInk: '#062518',
      stops: ['#F0FDF4', '#D1FAE5', '#A7F3D0'],
      glow: 'rgba(167, 243, 208, 0.45)',
      wash: 'rgba(167, 243, 208, 0.18)',
    },
  };
  const currentPalette = modePalettes[timerMode];

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[480px] perspective-[1200px] select-none"
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
      }}
    >
      {/* AUTHENTIC SANCTRA TIMER PEDESTAL - Luxurious Frosted Glass Horology */}
      <div
        className="rs-timer-pedestal relative overflow-hidden rounded-[28px] p-6 sm:p-8 transition-all duration-500 flex flex-col items-center"
        style={{
          background: 'rgba(14, 18, 28, 0.68)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1px solid ${currentPalette.accent}24`,
          boxShadow: `0 24px 64px -12px rgba(0, 0, 0, 0.75), 0 0 32px ${currentPalette.wash}, inset 0 1px 1px rgba(255, 255, 255, 0.16)`,
        }}
      >
        {/* Soft atmospheric ambient backlight glow */}
        <div
          className="pointer-events-none absolute w-80 h-80 rounded-full blur-3xl transition-all duration-700"
          style={{
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: isRunning
              ? `radial-gradient(circle, ${currentPalette.accent}2e 0%, ${currentPalette.accent}0a 50%, transparent 75%)`
              : `radial-gradient(circle, ${currentPalette.accent}14 0%, transparent 68%)`,
          }}
          aria-hidden="true"
        />

        {/* Circular Timer Ring Dial */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-2">
          <svg
            className="w-full h-full pointer-events-none"
            viewBox="0 0 320 320"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="landingDialPastel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={currentPalette.stops[0]} />
                <stop offset="50%" stopColor={currentPalette.stops[1]} />
                <stop offset="100%" stopColor={currentPalette.stops[2]} />
              </linearGradient>
            </defs>

            {/* Concentric Decorative Glass Lens Accents */}
            <circle
              cx="160"
              cy="160"
              r="152"
              stroke="rgba(255, 255, 255, 0.04)"
              strokeWidth="1"
              strokeDasharray="2 4"
              fill="transparent"
            />
            <circle
              cx="160"
              cy="160"
              r="110"
              stroke={`${currentPalette.accent}15`}
              strokeWidth="1"
              fill="transparent"
            />
            <circle
              cx="160"
              cy="160"
              r="80"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
              strokeDasharray="1 3"
              fill="transparent"
            />

            {/* Subtle Astronomical 24-Tick Graduation Ring */}
            {Array.from({ length: 24 }).map((_, i) => {
              const tickAngle = (i * 360) / 24;
              const isMajor = i % 2 === 0;
              return (
                <line
                  key={`outer-${i}`}
                  x1="160"
                  y1={isMajor ? '16' : '19'}
                  x2="160"
                  y2={isMajor ? '25' : '23'}
                  stroke={isMajor ? `${currentPalette.accent}66` : 'rgba(255, 255, 255, 0.10)'}
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
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="9"
              fill="transparent"
            />

            {/* Active Progress Ring - Rotated -90deg in SVG so it starts at 12 o'clock and fills clockwise */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke="url(#landingDialPastel)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform="rotate(-90 160 160)"
              style={{
                transition: isRunning ? 'none' : 'stroke-dashoffset 0.3s ease',
                filter: `drop-shadow(0 0 14px ${currentPalette.glow})`,
              }}
            />

            {/* Glowing Indicator Bead at Ring Tip */}
            {progressRatio > 0.02 && progressRatio < 0.98 && (
              <circle
                cx={beadX}
                cy={beadY}
                r="4.5"
                fill="#ffffff"
                stroke={currentPalette.accent}
                strokeWidth="2"
                style={{
                  filter: `drop-shadow(0 0 8px ${currentPalette.accent})`,
                }}
              />
            )}
          </svg>

          {/* Center Digital Display & Mode Controls */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {/* Mode / Phase label */}
            <span
              className="text-xs font-sans uppercase tracking-wider mb-0.5 font-medium transition-colors"
              style={{ color: currentPalette.accent }}
            >
              {getModeTitle()}
            </span>

            {/* Large Tabular Time Readout */}
            <div
              className="font-serif text-5xl sm:text-6xl text-[var(--rs-cream)] tabular-nums my-1 font-normal tracking-tight"
              style={{
                textShadow: `0 0 24px ${currentPalette.glow}`,
              }}
            >
              {timeFormatted}
            </div>

            {/* Mode Selector Chips with smooth pastel transitions */}
            <div className="flex items-center gap-1.5 p-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md font-sans text-xs mt-2 select-none">
              <button
                type="button"
                onClick={() => onSelectMode('pomodoro-25')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  timerMode === 'pomodoro-25'
                    ? 'font-semibold shadow-md'
                    : 'text-[var(--rs-cream-soft)] hover:text-white'
                }`}
                style={
                  timerMode === 'pomodoro-25'
                    ? { backgroundColor: '#C4B5FD', color: '#1E1238', boxShadow: '0 0 16px rgba(196, 181, 253, 0.4)' }
                    : undefined
                }
              >
                25m
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('pomodoro-50')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  timerMode === 'pomodoro-50'
                    ? 'font-semibold shadow-md'
                    : 'text-[var(--rs-cream-soft)] hover:text-white'
                }`}
                style={
                  timerMode === 'pomodoro-50'
                    ? { backgroundColor: '#BAE6FD', color: '#082136', boxShadow: '0 0 16px rgba(186, 230, 253, 0.4)' }
                    : undefined
                }
              >
                50m
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('countup')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer font-medium ${
                  timerMode === 'countup'
                    ? 'font-semibold shadow-md'
                    : 'text-[var(--rs-cream-soft)] hover:text-white'
                }`}
                style={
                  timerMode === 'countup'
                    ? { backgroundColor: '#A7F3D0', color: '#062518', boxShadow: '0 0 16px rgba(167, 243, 208, 0.4)' }
                    : undefined
                }
              >
                Flow
              </button>
            </div>

            {/* Active Subject Tag */}
            <div className="mt-2.5 inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 font-sans text-xs text-[var(--rs-cream-soft)]">
              <span className="truncate max-w-[160px] text-[var(--rs-cream)]">{activeSubject || 'Focused Study'}</span>
            </div>
          </div>
        </div>

        {/* Action Button Pill Bar - 100% Mathematically and Visually Centered */}
        <div className="relative z-10 w-full pt-5 border-t border-white/10 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Column: Reset CTA (Symmetric width) */}
          <div className="w-[84px] sm:w-[104px] shrink-0 flex justify-start">
            <button
              type="button"
              onClick={onResetTimer}
              title="Reset focus timer"
              aria-label="Reset focus timer"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-white/10 bg-white/5 text-[var(--rs-cream-soft)] hover:text-white hover:bg-white/10 text-xs font-sans font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* Center Column: Start / Pause CTA (Dead-center of the card and dial) */}
          <div className="flex-1 flex justify-center min-w-0">
            <button
              type="button"
              onClick={onToggleRunning}
              aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
              className="flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 rounded-full font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: currentPalette.accent,
                color: currentPalette.textInk,
                boxShadow: `0 4px 20px ${currentPalette.glow}`,
              }}
            >
              {isRunning ? (
                <>
                  <Pause size={13} fill="currentColor" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Start Focus</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Enter Desk CTA (Identical symmetric width to Reset) */}
          <div className="w-[84px] sm:w-[104px] shrink-0 flex justify-end">
            <button
              type="button"
              onClick={onOpenDesk}
              title="Enter full study desk"
              aria-label="Enter full study desk"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-white/10 bg-white/5 text-[var(--rs-cream-soft)] hover:text-white hover:border-white/30 hover:bg-white/10 text-xs font-sans font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Enter Desk</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingCyanotypeApparatus;
