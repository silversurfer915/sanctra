import React from 'react';
import { ShieldCheck, Clock, RotateCw, Compass, AlertTriangle, Sparkles } from 'lucide-react';

interface MaintenanceViewProps {
  featureTitle?: string;
  customMessage?: string;
  eta?: string;
  noticeType?: 'info' | 'warning' | 'maintenance';
  onBackToTimer: () => void;
  onRefreshStatus?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  featureTitle = 'This feature',
  customMessage,
  eta,
  noticeType = 'maintenance',
  onBackToTimer,
  onRefreshStatus,
}) => {
  const isGlobal = featureTitle.toLowerCase().includes('sanctra') || featureTitle.toLowerCase().includes('platform');

  return (
    <div className="w-full max-w-2xl mx-auto my-auto px-4 py-8 animate-fade-in">
      <div className="glass-card glass-specular p-8 sm:p-12 rounded-3xl text-center relative overflow-hidden border border-white/15 shadow-2xl">
        {/* Subtle Ambient Radial Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'var(--sanctra-sage)' }}
        />

        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-[var(--sanctra-sage)]/10 border border-[var(--sanctra-sage)]/25 text-[var(--sanctra-sage)]">
          <span className="w-2 h-2 rounded-full bg-[var(--sanctra-sage)] animate-pulse" />
          <span>{isGlobal ? 'Scheduled Sanctuary Maintenance' : 'Feature Maintenance'}</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight mb-4 text-balance">
          A little pause.
        </h1>

        {/* Context Description */}
        <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed mb-6">
          {customMessage ||
            `${featureTitle} is temporarily paused by the Sanctra team for scheduled performance upgrades. Your personal focus tools are ready whenever you are.`}
        </p>

        {/* Detailed ETA & Reason Panel (if provided) */}
        {(eta || noticeType === 'warning') && (
          <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            {eta && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--sanctra-sage)]">
                <Clock size={14} className="text-[var(--sanctra-sage)]" />
                Estimated completion: <strong className="font-semibold text-white">{eta}</strong>
              </span>
            )}
            {noticeType === 'warning' && (
              <span className="inline-flex items-center gap-1.5 text-rose-300 font-medium">
                <AlertTriangle size={14} className="text-rose-400" />
                System updates in progress
              </span>
            )}
          </div>
        )}

        {/* Reassurance Guardrail */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center gap-2.5 text-xs text-slate-300 mb-8 max-w-md mx-auto">
          <ShieldCheck size={16} className="shrink-0" style={{ color: 'var(--sanctra-sage)' }} />
          <span>Personal timers and saved study history remain fully active and secure.</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToTimer}
            className="workspace-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-wide shadow-lg hover:scale-105 transition-all cursor-pointer"
            style={{ background: 'var(--sanctra-sage)', color: 'var(--sanctra-ink)' }}
          >
            <Compass size={15} />
            <span>Back to your focus room</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onRefreshStatus) onRefreshStatus();
              else window.location.reload();
            }}
            className="analytics-button inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
          >
            <RotateCw size={14} />
            <span>Check status</span>
          </button>
        </div>

        {/* Calm Footer Footnote */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Sparkles size={12} className="text-[var(--sanctra-sage)] opacity-80" />
          <span>Sanctra operations · Ensuring zero distraction focus</span>
        </div>
      </div>
    </div>
  );
};
