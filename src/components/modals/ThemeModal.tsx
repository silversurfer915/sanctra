import React, { useEffect } from 'react';
import { Palette, X, Check, Sparkles } from 'lucide-react';
import type { ThemeId } from '../../types/index.ts';
import { CURATED_THEMES, getThemePreset } from '../../utils/themeRegistry.ts';

interface ThemeModalProps {
  isOpen?: boolean;
  activeThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen = true,
  activeThemeId,
  onSelectTheme,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPreset = getThemePreset(activeThemeId);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-3xl bg-[#0b0e14]/90 border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300"
              style={{
                backgroundColor: currentPreset.accentWash,
                border: `1px solid ${currentPreset.accent}40`,
                color: currentPreset.accent,
                boxShadow: `0 0 20px ${currentPreset.accent}30`,
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Timer Themes</span>
                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  Curated
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Bespoke atmospheric palettes, dials & typography for your focus room
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close themes modal"
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {CURATED_THEMES.map((theme) => {
              const isActive = activeThemeId === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className={`group relative p-4 rounded-2xl text-left transition-all duration-300 cursor-pointer overflow-hidden border flex flex-col justify-between min-h-[148px] ${
                    isActive
                      ? 'bg-white/[0.08] shadow-lg scale-[1.01]'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20'
                  }`}
                  style={{
                    borderColor: isActive ? theme.accent : undefined,
                    boxShadow: isActive ? `0 0 28px ${theme.accent}30, inset 0 0 20px ${theme.accent}10` : undefined,
                  }}
                >
                  {/* Subtle Ambient Backlight in Card */}
                  <div
                    className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
                    style={{
                      background: theme.accent,
                      opacity: isActive ? 0.35 : 0.1,
                    }}
                  />

                  {/* Card Top: Mini Dial Ring & Category */}
                  <div className="flex items-center justify-between w-full relative z-10">
                    <span
                      className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors"
                      style={{
                        backgroundColor: `${theme.accent}15`,
                        borderColor: `${theme.accent}40`,
                        color: theme.accent,
                      }}
                    >
                      {theme.category}
                    </span>

                    {isActive && (
                      <div
                        className="flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded-full shadow-sm"
                        style={{
                          backgroundColor: theme.accent,
                          color: theme.buttonText,
                        }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active</span>
                      </div>
                    )}
                  </div>

                  {/* Card Center: Visual Mini Dial & Typographic Preview */}
                  <div className="my-2.5 flex items-center gap-3 relative z-10">
                    {/* Mini SVG Dial Ring */}
                    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 60 60" className="w-full h-full pointer-events-none">
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke={theme.accent}
                          strokeWidth="3.5"
                          strokeDasharray="150.8"
                          strokeDashoffset="38"
                          strokeLinecap="round"
                          fill="transparent"
                          transform="rotate(-90 30 30)"
                          style={{
                            filter: `drop-shadow(0 0 6px ${theme.accent})`,
                          }}
                        />
                        <circle
                          cx="30"
                          cy="6"
                          r="2"
                          fill="#ffffff"
                          style={{
                            filter: `drop-shadow(0 0 4px ${theme.accent})`,
                          }}
                        />
                      </svg>
                      <span
                        className="absolute text-[11px] font-bold text-white select-none"
                        style={{ fontFamily: theme.fontTimer }}
                      >
                        25
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <h3 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-white">
                        {theme.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {theme.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom: Swatch Dots */}
                  <div className="flex items-center justify-between w-full pt-2 border-t border-white/5 relative z-10 text-[11px] text-slate-400 font-sans">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full ring-1 ring-white/20 shadow-sm"
                        style={{ backgroundColor: theme.gradientStops[0] }}
                        title="Highlight"
                      />
                      <span
                        className="w-3 h-3 rounded-full ring-1 ring-white/20 shadow-sm"
                        style={{ backgroundColor: theme.gradientStops[1] }}
                        title="Primary Core"
                      />
                      <span
                        className="w-3 h-3 rounded-full ring-1 ring-white/20 shadow-sm"
                        style={{ backgroundColor: theme.gradientStops[2] }}
                        title="Deep Base"
                      />
                    </div>

                    <span
                      className="font-medium transition-colors"
                      style={{ color: isActive ? theme.accent : undefined }}
                    >
                      {isActive ? 'Current Vibe' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <Sparkles className="w-3.5 h-3.5" style={{ color: currentPreset.accent }} />
            <span>Theme auto-saves to your profile</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-bold font-sans cursor-pointer transition-all shadow-md"
            style={{
              backgroundColor: currentPreset.buttonBg,
              color: currentPreset.buttonText,
              boxShadow: currentPreset.buttonGlow,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
