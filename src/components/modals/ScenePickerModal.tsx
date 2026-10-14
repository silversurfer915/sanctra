import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  Image as ImageIcon,
  Film,
  CloudRain,
  Crown,
  Lock,
} from 'lucide-react';
import type { UserSettings, WallpaperPreset } from '../../types/index.ts';
import type { UserSubscription } from '../../types/subscription.ts';
import { WALLPAPER_PRESETS, resolveWallpaperId } from '../../utils/storage.ts';
import { isEntitlementActive } from '../../utils/subscriptionPlans.ts';

interface ScenePickerModalProps {
  isOpen: boolean;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onClose: () => void;
  subscription?: UserSubscription | null;
  onOpenSupport?: () => void;
}

type SceneCategory = 'stills' | 'plus' | 'motion' | 'weather';

export const ScenePickerModal: React.FC<ScenePickerModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
  subscription,
  onOpenSupport,
}) => {
  const [sceneTab, setSceneTab] = useState<SceneCategory>('stills');
  const [lockedPrompt, setLockedPrompt] = useState<string | null>(null);
  const [plusFilter, setPlusFilter] = useState<'all' | 'abstract' | 'sanctuary' | 'motion'>('all');
  const isPlusUser = isEntitlementActive(subscription || null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const resolvedSceneId = resolveWallpaperId(settings.activeWallpaperId);

  // Save the trigger element and manage focus trapping / restoration
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;

      requestAnimationFrame(() => {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      });
    } else {
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    }
  }, [isOpen]);

  // Keyboard navigation: Escape to close and Tab trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    onUpdateSettings({
      activeWallpaperId: 'wp-art-forest',
      customWallpaperUrl: undefined,
      plusMotionWallpaperEnabled: false,
      backgroundDimness: 25,
      uiGlassBlur: 12,
    });
  };

  const handleSelectScene = (preset: WallpaperPreset) => {
    if (preset.isPlusOnly && !isPlusUser) {
      setLockedPrompt(preset.name);
      return;
    }
    setLockedPrompt(null);
    onUpdateSettings({
      activeWallpaperId: preset.id,
      customWallpaperUrl: undefined,
      plusMotionWallpaperEnabled: preset.type === 'motion',
      plusMotionWallpaperUrl: '',
    });
  };

  // Filter scenes by category
  const stillsList = WALLPAPER_PRESETS.filter(p => (!p.type || p.type === 'scenic') && !p.isPlusOnly);
  const allPlusList = WALLPAPER_PRESETS.filter(p => p.isPlusOnly);
  const filteredPlusList = allPlusList.filter(p => {
    if (plusFilter === 'all') return true;
    if (plusFilter === 'abstract') return p.category.includes('Abstract');
    if (plusFilter === 'sanctuary') return p.category.includes('Sanctuary');
    if (plusFilter === 'motion') return p.type === 'motion';
    return true;
  });
  const motionList = WALLPAPER_PRESETS.filter(p => p.type === 'motion');
  const weatherList = WALLPAPER_PRESETS.filter(p => p.type === 'weather');

  const currentScenes =
    sceneTab === 'stills'
      ? stillsList
      : sceneTab === 'plus'
      ? filteredPlusList
      : sceneTab === 'motion'
      ? motionList
      : weatherList;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scene-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-white/15 bg-[var(--sanctra-surface)] text-[var(--sanctra-paper)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="scene-picker-title" className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white truncate">
                Focus Scenery &amp; Atmosphere
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--sanctra-muted)] truncate">
                Choose your focus scenery, lighting and glass clarity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefault}
              title="Reset scenery and lighting to default"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset to default</span>
            </button>
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* SECTION 1: Curated Scenery Picker */}
          <section aria-labelledby="scenes-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 id="scenes-heading" className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                  Scenery Selection
                </h3>
                <p className="text-[11px] sm:text-xs text-[var(--sanctra-muted)]">
                  Scenic visuals apply exclusively to the Focus Room and public landing
                </p>
              </div>

              {/* Scene Categories Tabs */}
              <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  type="button"
                  aria-pressed={sceneTab === 'stills'}
                  onClick={() => setSceneTab('stills')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sceneTab === 'stills'
                      ? 'bg-emerald-500 text-[var(--sanctra-ink)] font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Stills ({stillsList.length})</span>
                </button>
                <button
                  type="button"
                  aria-pressed={sceneTab === 'plus'}
                  onClick={() => setSceneTab('plus')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sceneTab === 'plus'
                      ? 'bg-emerald-500 text-[var(--sanctra-ink)] font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Plus+ Collection ({allPlusList.length})</span>
                </button>
                <button
                  type="button"
                  aria-pressed={sceneTab === 'motion'}
                  onClick={() => setSceneTab('motion')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sceneTab === 'motion'
                      ? 'bg-emerald-500 text-[var(--sanctra-ink)] font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Motion ({motionList.length})</span>
                </button>
                <button
                  type="button"
                  aria-pressed={sceneTab === 'weather'}
                  onClick={() => setSceneTab('weather')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    sceneTab === 'weather'
                      ? 'bg-emerald-500 text-[var(--sanctra-ink)] font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Weather ({weatherList.length})</span>
                </button>
              </div>
            </div>

            {/* Plus Sub-category Filters (when on plus tab) */}
            {sceneTab === 'plus' && (
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                {(
                  [
                    { id: 'all', label: `All (${allPlusList.length})` },
                    { id: 'abstract', label: `Abstract (${allPlusList.filter(p => p.category.includes('Abstract')).length})` },
                    { id: 'sanctuary', label: `Sanctuary (${allPlusList.filter(p => p.category.includes('Sanctuary')).length})` },
                    { id: 'motion', label: `Motion (${allPlusList.filter(p => p.type === 'motion').length})` },
                  ] as const
                ).map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setPlusFilter(pill.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      plusFilter === pill.id
                        ? 'bg-emerald-500 text-[var(--sanctra-ink)] font-semibold shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}

            {/* Locked Plus Prompt Banner */}
            {lockedPrompt && (
              <div className="mb-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-amber-200">
                    <strong>{lockedPrompt}</strong> is an exclusive Plus+ atmosphere. Open an inquiry to activate.
                  </span>
                </div>
                {onOpenSupport && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSupport();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Enquire Plus
                  </button>
                )}
              </div>
            )}

            {/* Scenes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentScenes.map(preset => {
                const isSelected =
                  resolvedSceneId === preset.id && !settings.customWallpaperUrl;
                const isUnlocked = !preset.isPlusOnly || isPlusUser;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`Select scene ${preset.name}${preset.isPlusOnly && !isUnlocked ? ' (Plus exclusive)' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectScene(preset)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all aspect-video cursor-pointer group text-left ${
                      isSelected
                        ? 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-xl'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={preset.thumbnail}
                      alt={preset.name}
                      loading="lazy"
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${!isUnlocked ? 'opacity-70 group-hover:opacity-90' : ''}`}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 truncate flex items-center gap-1">
                          {preset.isPlusOnly && !isUnlocked && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                          {preset.category
                            .replace('Plus+ Sanctuary · ', '')
                            .replace('Plus+ Abstract · ', '')
                            .replace('Plus+ Motion · ', '')
                            .replace('Plus+ Video · ', '')}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {preset.isPlusOnly && (
                            <span
                              className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold"
                              title="Sanctra Plus+ Exclusive"
                            >
                              <Crown className="w-2.5 h-2.5" />
                              Plus
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white truncate drop-shadow-sm mt-0.5">
                        {preset.name}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-400 text-[var(--sanctra-ink)] rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                        ✓
                      </div>
                    )}
                    {!isUnlocked && !isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-amber-300 border border-amber-400/30">
                        <Lock size={12} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Lighting & Clarity Controls */}
          <section aria-labelledby="controls-heading" className="space-y-4 pt-2">
            <h3 id="controls-heading" className="text-sm font-bold text-white tracking-wide uppercase">
              Atmosphere Lighting &amp; Clarity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dimness Slider */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor="dimness-slider" className="text-white">
                    Background dimness
                  </label>
                  <output htmlFor="dimness-slider" className="font-mono text-emerald-300">
                    {settings.backgroundDimness ?? 25}%
                  </output>
                </div>
                <input
                  id="dimness-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.backgroundDimness ?? 25}
                  onChange={e => onUpdateSettings({ backgroundDimness: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--sanctra-muted)]">
                  <span>Bright (0%)</span>
                  <span>Balanced (25%)</span>
                  <span>Stealth (100%)</span>
                </div>
              </div>

              {/* Glass Blur Slider */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor="blur-slider" className="text-white">
                    Glass clarity blur
                  </label>
                  <output htmlFor="blur-slider" className="font-mono text-emerald-300">
                    {settings.uiGlassBlur ?? 12}px
                  </output>
                </div>
                <input
                  id="blur-slider"
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={settings.uiGlassBlur ?? 12}
                  onChange={e => onUpdateSettings({ uiGlassBlur: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--sanctra-muted)]">
                  <span>Clear (0px)</span>
                  <span>Soft glass (12px)</span>
                  <span>Deep frost (24px)</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0 text-xs">
          <span className="text-[var(--sanctra-muted)] text-[11px] sm:text-xs">
            Data pages remain on stable dark charcoal surfaces
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 text-[var(--sanctra-ink)] font-semibold hover:bg-emerald-400 transition-colors cursor-pointer text-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
