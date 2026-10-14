import React, { useState, useEffect } from 'react';
import type { TimerMode, PomodoroConfig } from '../../types/index.ts';
import {normalizePomodoroConfig,POMODORO_PRESETS} from '../../utils/pomodoro.ts';
import { X, Clock, Sparkles, Check, ChevronRight } from 'lucide-react';

interface TimerModeModalProps {
  isOpen: boolean;
  currentMode: TimerMode;
  onSelectMode: (mode: TimerMode, customDurationMinutes?: number, pomodoroConfig?:PomodoroConfig) => void;
  onClose: () => void;
  savedPomodoroConfig?:PomodoroConfig;
}

export const TimerModeModal: React.FC<TimerModeModalProps> = ({
  isOpen,
  currentMode,
  onSelectMode,
  onClose,
  savedPomodoroConfig,
}) => {
  const [pomodoro,setPomodoro]=useState(()=>normalizePomodoroConfig(savedPomodoroConfig));
  const [showPomodoro,setShowPomodoro]=useState(currentMode==='pomodoro-custom');
  useEffect(()=>{if(isOpen)setPomodoro(normalizePomodoroConfig(savedPomodoroConfig));},[isOpen,savedPomodoroConfig]);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [showCustomInputs, setShowCustomInputs] = useState(currentMode === 'custom');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const MODES: { id: TimerMode; title: string; desc: string; badge?: string }[] = [
    {
      id: 'countup',
      title: 'Free Count-Up',
      desc: 'Count up freely with no time limit. Great for open-ended deep work.',
      badge: 'Default',
    },
    {
      id: 'pomodoro-25',
      title: '25m Pomodoro',
      desc: '25m focused study + 5m short recovery break.',
      badge: 'Classic',
    },
    {
      id: 'pomodoro-50',
      title: '50m Pomodoro',
      desc: '50m deep focus + 10m extended break.',
      badge: 'Deep Work',
    },
    {id:'pomodoro-90',title:'90m Pomodoro',desc:'90m focus + 20m short break.',badge:'Extended'},
    {id:'pomodoro-custom',title:'Custom Pomodoro',desc:'Your focus and break rhythm.',badge:'Custom'},
    {
      id: 'countdown-60',
      title: '1 Hour Countdown',
      desc: '60 minutes structured single-session countdown.',
    },
    {
      id: 'countdown-120',
      title: '2 Hours Countdown',
      desc: '120 minutes marathon study session.',
    },
    {
      id: 'custom',
      title: 'Custom Countdown',
      desc: 'Set your own custom hours and minutes countdown.',
      badge: 'Custom',
    },
  ];

  const handleApplyCustom = () => {
    const totalMinutes = customHours * 60 + customMinutes;
    if (totalMinutes <= 0) return;
    onSelectMode('custom', totalMinutes);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-lg glass-modal max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:p-7 relative border border-white/15 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-mode-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-mode-title" className="text-lg font-bold text-white tracking-tight">
                Customize Timer
              </h2>
              <p className="text-xs text-slate-400">
                Choose how you want to measure your study session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode List */}
        {!showPomodoro&&<div className="mt-4 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {MODES.map((m) => {
            const isSelected = currentMode === m.id && (!showCustomInputs || m.id === 'custom');

            return (
              <button
                key={m.id}
                onClick={() => {
                  if(m.id==='pomodoro-custom'){setShowPomodoro(true);setShowCustomInputs(false);}
                  else if(m.id==='custom'){setShowCustomInputs(true);setShowPomodoro(false);}
                  else {
                    const presetIndex=['pomodoro-25','pomodoro-50','pomodoro-90'].indexOf(m.id);
                    onSelectMode(m.id,undefined,presetIndex>=0?POMODORO_PRESETS[presetIndex]:undefined);
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{m.title}</span>
                    {m.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-emerald-300">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{m.desc}</span>
                </div>

                <div className="ml-3 shrink-0">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>}

        {/* Custom Input Block */}
        {showPomodoro&&<form className="pomodoro-editor" onSubmit={e=>{e.preventDefault();onSelectMode('pomodoro-custom',undefined,normalizePomodoroConfig(pomodoro));onClose();}}>
          <div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-base font-medium">Custom Pomodoro</h3><button type="button" className="analytics-button" onClick={()=>setShowPomodoro(false)}>All timer modes</button></div>
          <div className="pomodoro-fields">{([
            ['focusMinutes','Focus minutes',240],['shortBreakMinutes','Short break minutes',120],['longBreakMinutes','Long break minutes',240],['sessionsBeforeLongBreak','Sessions before long break',12]
          ] as const).map(([key,label,max])=><label key={key} htmlFor={`pomodoro-${key}`}>{label}<input id={`pomodoro-${key}`} type="number" min={1} max={max} step={1} required value={pomodoro[key]} onChange={e=>setPomodoro(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}</div>
          <p>Saved to your account. Each completed focus block advances the break cycle.</p>
          <button className="workspace-primary" type="submit">Use custom Pomodoro</button>
        </form>}
        {showCustomInputs && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Set Custom Duration</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hours (0 - 12)
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={customHours}
                  onChange={(e) => setCustomHours(Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-center focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Minutes (0 - 59)
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-center focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setShowCustomInputs(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white glass-pill cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={customHours === 0 && customMinutes === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-400/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                Set Custom Timer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
