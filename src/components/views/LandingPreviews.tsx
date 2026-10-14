import { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Sparkles,
  BarChart3,
  BookOpen,
  Users,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Check,
  Play,
  Square,
  Edit3,
  CloudRain,
  Waves,
  Trees,
  Headphones,
} from 'lucide-react';
import { FocusChart, GoalRing } from '../analytics/FocusChart.tsx';

/**
 * 1. REALISTIC PLANNER & CALENDAR PREVIEW
 * Mirrors PlannerView and CalendarView inside Sanctra with real workspace panels,
 * calendar date navigation strip, task tabs, and subject tags.
 */
export function LandingPlannerPreview() {
  const [activeTab, setActiveTab] = useState<'today' | 'backlog' | 'unscheduled'>('today');
  const [completed, setCompleted] = useState<Record<string, boolean>>({
    'task-3': true,
  });

  const toggleTask = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="sanctra-app landing-product-preview landing-planner-preview">
      {/* Toolbar */}
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <CalendarDays size={17} style={{ color: 'var(--sanctra-sage, #b8d4ea)' }} />
          Tasks &amp; Planner
        </span>
        <div className="landing-preview-state">
          <span>Synced with Desk</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Top 3 Metric Panels matching PlannerView lines 35 */}
        <div className="task-overview-grid">
          <article className="workspace-panel">
            <small>Completed today</small>
            <strong className="font-display tabular-nums">1</strong>
          </article>
          <article className="workspace-panel">
            <small>Backlog</small>
            <strong className="font-display tabular-nums">2</strong>
          </article>
          <article className="workspace-panel">
            <small>Unscheduled</small>
            <strong className="font-display tabular-nums">1</strong>
            <span>Ready to place on calendar</span>
          </article>
        </div>

        {/* Date Navigation Strip matching PlannerView line 36 */}
        <div className="planner-calendar p-3 rounded-2xl glass-card flex items-center justify-between gap-2 border border-white/10">
          <button
            type="button"
            className="p-1.5 rounded-xl glass-pill text-slate-400 hover:text-white shrink-0 cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="planner-days flex items-center gap-2 overflow-x-auto py-1">
            {[
              { dayName: 'Mon', dayNum: 12, selected: true },
              { dayName: 'Tue', dayNum: 13, selected: false },
              { dayName: 'Wed', dayNum: 14, selected: false },
              { dayName: 'Thu', dayNum: 15, selected: false },
            ].map((d) => (
              <button
                key={d.dayNum}
                type="button"
                aria-pressed={d.selected}
                className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2.5 rounded-2xl transition-all cursor-pointer ${
                  d.selected
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 font-bold scale-105 shadow-md shadow-emerald-500/20'
                    : 'glass-pill text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                  {d.dayName}
                </span>
                <span className="text-sm font-medium tabular-nums mt-0.5">{d.dayNum}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="p-1.5 rounded-xl glass-pill text-slate-400 hover:text-white shrink-0 cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-200 glass-pill shrink-0 hidden sm:inline-block cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Tab Switcher matching PlannerView line 38 */}
        <div className="planner-tabs flex items-center gap-2 p-1.5 rounded-2xl glass-card border border-white/10">
          {(
            [
              ['today', "Today's Tasks", 3],
              ['backlog', 'Backlog', 2],
              ['unscheduled', 'Unscheduled', 1],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              data-task-tab={id}
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-emerald-400 text-emerald-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 tabular-nums font-semibold">
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Task Cards matching PlannerView line 40 */}
        <div className="space-y-2">
          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              completed['task-1']
                ? 'bg-slate-950/40 border-white/5 opacity-60'
                : 'bg-slate-900/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => toggleTask('task-1')}
                className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                aria-label="Toggle task 1"
              >
                {completed['task-1'] ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div className="min-w-0">
                <span
                  className={`text-xs sm:text-sm font-medium text-white block truncate ${
                    completed['task-1'] ? 'line-through text-slate-500' : ''
                  }`}
                >
                  Practice Integration by Parts
                </span>
                <span className="text-[11px] text-slate-300 tabular-nums">
                  09:00 – 10:30 · 90 min block
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                style={{ backgroundColor: 'rgba(184, 220, 245, 0.18)', color: '#b8dcf5' }}
              >
                Mathematics
              </span>
              <button type="button" className="analytics-button text-xs py-1 px-2.5">
                Focus
              </button>
              <button
                type="button"
                className="analytics-icon text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Edit task"
              >
                <Edit3 size={13} />
              </button>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              completed['task-2']
                ? 'bg-slate-950/40 border-white/5 opacity-60'
                : 'bg-slate-900/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => toggleTask('task-2')}
                className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                aria-label="Toggle task 2"
              >
                {completed['task-2'] ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div className="min-w-0">
                <span
                  className={`text-xs sm:text-sm font-medium text-white block truncate ${
                    completed['task-2'] ? 'line-through text-slate-500' : ''
                  }`}
                >
                  Thermodynamics Chapter Notes
                </span>
                <span className="text-[11px] text-slate-300 tabular-nums">
                  11:00 – 12:30 · Concept review
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                style={{ backgroundColor: 'rgba(110, 231, 183, 0.18)', color: '#6ee7b7' }}
              >
                Physics
              </span>
              <button type="button" className="analytics-button text-xs py-1 px-2.5">
                Focus
              </button>
              <button
                type="button"
                className="analytics-icon text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Edit task"
              >
                <Edit3 size={13} />
              </button>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              completed['task-3']
                ? 'bg-slate-950/40 border-white/5 opacity-60'
                : 'bg-slate-900/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => toggleTask('task-3')}
                className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                aria-label="Toggle task 3"
              >
                {completed['task-3'] ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div className="min-w-0">
                <span
                  className={`text-xs sm:text-sm font-medium text-white block truncate ${
                    completed['task-3'] ? 'line-through text-slate-500' : ''
                  }`}
                >
                  Review Electrochemistry Formulas
                </span>
                <span className="text-[11px] text-slate-300 tabular-nums">
                  14:00 – 15:00 · Completed
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                style={{ backgroundColor: 'rgba(192, 132, 252, 0.18)', color: '#c084fc' }}
              >
                Chemistry
              </span>
              <button
                type="button"
                className="analytics-icon text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Edit task"
              >
                <Edit3 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Calendar Views: Month, Week &amp; Agenda with local .ics import/export.
        </span>
        <span className="text-[11px] text-sky-300/80">Direct Task-to-Timer Link</span>
      </div>
    </div>
  );
}

/**
 * 2. REALISTIC ANALYTICS PREVIEW
 * Mirrors AnalyticsView with exact period switcher tabs, 4 metric cards,
 * real GoalRing, real FocusChart component, and subject breakdown bars!
 */
export function LandingAnalyticsPreview() {
  const [kind, setKind] = useState<'day' | 'week' | 'month'>('week');

  // Realistic sample seconds: Mon 5.2h, Tue 4.8h, Wed 6.0h, Thu 3.5h, Fri 5.0h, Sat 0h, Sun 4.2h
  const sampleValues = [18720, 17280, 21600, 12600, 18000, 0, 15120];
  const sampleLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="sanctra-app landing-product-preview landing-analytics-preview">
      {/* Analytics Toolbar */}
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <BarChart3 size={17} style={{ color: 'var(--sanctra-sage, #b8d4ea)' }} />
          Session Analytics
        </span>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setKind(p)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                kind === p
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Cards Grid matching AnalyticsView lines 134-139 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="analytics-card p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Focused time
            </p>
            <p className="text-xl sm:text-2xl font-display font-medium tabular-nums mt-1 text-white">
              24h 45m
            </p>
            <p className="text-[11px] text-emerald-300 mt-1">+12% vs previous week</p>
          </div>

          <div className="analytics-card p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Sessions
            </p>
            <p className="text-xl sm:text-2xl font-display font-medium tabular-nums mt-1 text-white">
              28
            </p>
            <p className="text-[11px] text-slate-400 mt-1">53m average session</p>
          </div>

          <div className="analytics-card p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Active days
            </p>
            <p className="text-xl sm:text-2xl font-display font-medium tabular-nums mt-1 text-white">
              6 / 7
            </p>
            <p className="text-[11px] text-emerald-300 mt-1">Consistent streak</p>
          </div>

          <div className="analytics-card p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Daily average
            </p>
            <p className="text-xl sm:text-2xl font-display font-medium tabular-nums mt-1 text-white">
              4h 57m
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Target: 5h 00m</p>
          </div>
        </div>

        {/* Goal Ring & Daily Progress row matching AnalyticsView line 146 */}
        <div className="analytics-card p-4 flex items-center gap-4">
          <GoalRing percent={83} label="goal" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-white">Today’s goal progress</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              <strong className="text-white tabular-nums">4h 10m</strong> of 5h 00m daily target
            </p>
            <p className="text-[11px] text-slate-400 mt-1">5 of 6 active days reached daily goal</p>
          </div>
        </div>

        {/* Real FocusChart component matching AnalyticsView line 151 */}
        <div className="analytics-card p-4 min-w-0">
          <div className="flex justify-between items-center text-xs text-slate-300 mb-2">
            <h3 className="font-display font-semibold text-white text-sm">Weekly focus trend</h3>
            <span className="text-[11px] text-slate-400 font-mono">Daily target: 5h</span>
          </div>
          <FocusChart values={sampleValues} labels={sampleLabels} title="Weekly focus trend" />

          {/* 7-Day Mini Calendar Strip matching AnalyticsView line 152 */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d} className="text-[10px] text-slate-400 text-center font-medium">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {[
                { day: 12, hrs: '5.2h', goal: true },
                { day: 13, hrs: '4.8h', goal: true },
                { day: 14, hrs: '6.0h', goal: true },
                { day: 15, hrs: '3.5h', goal: false },
                { day: 16, hrs: '5.0h', goal: true },
                { day: 17, hrs: '—', goal: false },
                { day: 18, hrs: '4.2h', goal: true },
              ].map((d) => (
                <div
                  key={d.day}
                  className="rounded-xl p-1.5 text-center border border-white/10 text-xs"
                  style={{
                    background:
                      d.hrs !== '—'
                        ? 'color-mix(in srgb, var(--sanctra-sage) 22%, transparent)'
                        : 'transparent',
                  }}
                >
                  <span className="block font-medium tabular-nums text-white text-xs">{d.day}</span>
                  <span className="block text-[9px] text-slate-300 mt-0.5 tabular-nums">{d.hrs}</span>
                  {d.goal && (
                    <span className="block text-[8px] text-emerald-300 font-bold mt-0.5">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Breakdown Bars matching AnalyticsView line 154 */}
        <div className="analytics-card p-4 space-y-3">
          <h3 className="font-display font-semibold text-white text-sm">Where your focus went</h3>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Mathematics</span>
                <span className="text-slate-400 tabular-nums">11h 10m · 45%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-sky-400" style={{ width: '45%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Physics</span>
                <span className="text-slate-400 tabular-nums">8h 40m · 35%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: '35%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Chemistry</span>
                <span className="text-slate-400 tabular-nums">4h 55m · 20%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-400" style={{ width: '20%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Searchable session history log · Manual offline study entry supported
        </span>
        <span className="text-[11px] text-emerald-300/80">No vanity metrics</span>
      </div>
    </div>
  );
}

/**
 * 3. REALISTIC ATMOSPHERE & AUDIO PREVIEW
 * Mirrors Focus Audio and Scenery Picker inside Sanctra with real soundscape cards,
 * volume slider, and authentic wallpaper browser grid!
 */
export function LandingAtmospherePreview() {
  const [playingSound, setPlayingSound] = useState<string | null>('rain');
  const [volume, setVolume] = useState(65);
  const [selectedScene, setSelectedScene] = useState('meadow');

  return (
    <div className="sanctra-app landing-product-preview landing-atmosphere-preview">
      {/* Atmosphere Toolbar */}
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <Volume2 size={17} style={{ color: 'var(--sanctra-sage, #b8d4ea)' }} />
          Focus Atmosphere &amp; Audio
        </span>
        <div className="landing-preview-state">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Audio Active
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Focus Soundscapes Panel matching SoundscapeContext.tsx */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Focus Soundscapes
            </span>
            <span className="text-slate-300 font-mono text-[11px] tabular-nums">
              Volume: {volume}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: 'rain',
                name: 'Soft Rainfall',
                desc: 'Rain on skylight glass',
                icon: CloudRain,
              },
              {
                id: 'waves',
                name: 'Ocean Waves',
                desc: 'Gentle coastal rhythm',
                icon: Waves,
              },
              {
                id: 'forest',
                name: 'Pine Forest',
                desc: 'Quiet woodland breeze',
                icon: Trees,
              },
              {
                id: 'noise',
                name: 'White Noise',
                desc: 'Masks background chatter',
                icon: Headphones,
              },
            ].map((sound) => {
              const isPlaying = playingSound === sound.id;
              const Icon = sound.icon;
              return (
                <button
                  key={sound.id}
                  type="button"
                  aria-pressed={isPlaying}
                  onClick={() => setPlayingSound(isPlaying ? null : sound.id)}
                  className="audio-sound-card"
                >
                  <span className="audio-icon">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 pr-2">
                    <strong className="text-xs font-semibold block truncate text-white">
                      {sound.name}
                    </strong>
                    <small className="text-[10px] text-slate-400 block truncate">{sound.desc}</small>
                  </div>
                  <span className="text-slate-400 hover:text-white flex items-center justify-center">
                    {isPlaying ? (
                      <Square size={13} className="text-sky-300" />
                    ) : (
                      <Play size={13} className="ml-0.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Volume Slider */}
          <div className="p-3 rounded-2xl bg-black/25 border border-white/10 flex items-center gap-3">
            <Volume2 size={15} className="text-sky-300 shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-sky-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
              aria-label="Soundscape volume"
            />
            <span className="text-xs font-mono text-slate-300 tabular-nums w-8 text-right">
              {volume}%
            </span>
          </div>
        </div>

        {/* Real Scenery Thumbnails matching BackgroundChooser.tsx */}
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Scenery Selection
            </span>
            <span className="text-[11px] text-sky-300">Free + Plus Collection</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'meadow',
                name: 'Lofi Meadow',
                badge: 'Video · Active',
                img: '/backgrounds/landing-screen-poster.jpg',
              },
              {
                id: 'observatory',
                name: 'Observatory',
                badge: 'Starlit Night',
                img: '/backgrounds/sanctra-observatory-768.webp',
              },
              {
                id: 'rain',
                name: 'Quiet Rain',
                badge: 'Atmosphere',
                img: '/backgrounds/illustrated-rain.thumb.v2.webp',
              },
              {
                id: 'forest',
                name: 'Deep Forest',
                badge: 'Plus+ Scene',
                img: '/backgrounds/illustrated-forest.thumb.v2.webp',
              },
            ].map((scene) => {
              const isSelected = selectedScene === scene.id;
              return (
                <div
                  key={scene.id}
                  onClick={() => setSelectedScene(scene.id)}
                  className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer aspect-video sm:aspect-square flex flex-col justify-end p-2 ${
                    isSelected
                      ? 'border-sky-400 shadow-md shadow-sky-500/20 ring-1 ring-sky-400'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={scene.img}
                    alt={scene.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="relative z-10 min-w-0">
                    <span className="text-[11px] font-semibold text-white block truncate">
                      {scene.name}
                    </span>
                    <span className="text-[9px] text-sky-300/90 block truncate">{scene.badge}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Independent ambient sound generator · Custom photo upload &amp; direct URL links supported
        </span>
        <span className="text-[11px] text-sky-300/80">Sensory Flow</span>
      </div>
    </div>
  );
}

/**
 * 4. REALISTIC JEE TRACK PREVIEW
 * Mirrors JeeTrackView with canonical syllabus progress badges,
 * mock test score log, and the dedicated AI preparation coach note.
 */
export function LandingJeePreview() {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'mocks' | 'coach'>('syllabus');

  return (
    <div className="sanctra-app landing-product-preview landing-jee-preview">
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <BookOpen size={17} style={{ color: '#c084fc' }} />
          JEE Preparation Workspace (Optional)
        </span>
        <div className="landing-preview-state">
          <span>Target: JEE 2027</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Navigation tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 text-xs">
          {[
            { id: 'syllabus', label: 'Syllabus Progress' },
            { id: 'mocks', label: 'Mock Tests Log' },
            { id: 'coach', label: 'AI Prep Coach' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 'syllabus' | 'mocks' | 'coach')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'syllabus' && (
          <div className="space-y-2.5">
            <div className="analytics-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">
                  Physics · Current Electricity
                </span>
                <span className="text-[10px] text-purple-300 font-medium">Class 12</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  <Check size={12} /> Theory Completed
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px]">
                  <Check size={12} /> Practice (85 Qs)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px]">
                  <Check size={12} /> Revised 2x
                </span>
              </div>
            </div>

            <div className="analytics-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">
                  Mathematics · Definite Integrals
                </span>
                <span className="text-[10px] text-purple-300 font-medium">Class 12</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  <Check size={12} /> Theory Completed
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px]">
                  <Check size={12} /> Practice (54 Qs)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 text-[11px]">
                  Pending Revision
                </span>
              </div>
            </div>

            <div className="analytics-card p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">
                  Chemistry · Coordination Compounds
                </span>
                <span className="text-[10px] text-purple-300 font-medium">Class 12</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  <Check size={12} /> Theory Completed
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 text-[11px]">
                  Practice In Progress
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 text-[11px]">
                  Pending Revision
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mocks' && (
          <div className="space-y-2.5">
            <div className="analytics-card p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">JEE Main Full Mock #4</span>
                <span className="text-[11px] text-slate-400">Oct 04, 2026 · 3h Full Test</span>
              </div>
              <div className="text-right">
                <span className="text-base font-display font-bold text-emerald-300 block tabular-nums">
                  214 / 300
                </span>
                <span className="text-[10px] text-slate-400">98.6th Percentile</span>
              </div>
            </div>

            <div className="analytics-card p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">JEE Main Part Mock #3</span>
                <span className="text-[11px] text-slate-400">Sep 24, 2026 · Mechanics &amp; Calculus</span>
              </div>
              <div className="text-right">
                <span className="text-base font-display font-bold text-sky-300 block tabular-nums">
                  198 / 300
                </span>
                <span className="text-[10px] text-slate-400">97.2th Percentile</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="p-4 rounded-2xl bg-purple-500/[0.08] border border-purple-500/25 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
              <Sparkles size={14} className="text-purple-300" />
              <span>Preparation Coach Review</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              &ldquo;Your Physics study consistency is steady over the past 3 weeks. However, Definite
              Integrals has only 54 logged practice problems and no revision round. Dedicate 2 focus
              blocks to calculus before the next mock test.&rdquo;
            </p>
            <span className="text-[10px] text-slate-400 block pt-1">
              * Reviews up to 90 days of recorded logs. Does not predict official ranks.
            </span>
          </div>
        )}
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Connect timer sessions directly to JEE chapters &amp; mock analysis.
        </span>
        <span className="text-[11px] text-purple-300/80">Completely Optional</span>
      </div>
    </div>
  );
}

/**
 * 5. REALISTIC SANCTRA AI PREVIEW
 * Demonstrates the 3 AI flows: Ask, Plan, Log with prompt and plan preview
 * before committing to calendar.
 */
export function LandingAiPreview() {
  return (
    <div className="sanctra-app landing-product-preview landing-ai-preview">
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <Sparkles size={17} style={{ color: 'var(--sanctra-sage, #b8d4ea)' }} />
          Sanctra AI Study Assistant
        </span>
        <div className="landing-preview-state">
          <span>Review Before Saving</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Assistant Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 text-xs">
          <div className="flex-1 py-1.5 px-2 rounded-lg text-center font-medium bg-sky-500/20 text-sky-200 border border-sky-500/30">
            Plan Schedule
          </div>
          <div className="flex-1 py-1.5 px-2 rounded-lg text-center font-medium text-slate-400">
            Ask Questions
          </div>
          <div className="flex-1 py-1.5 px-2 rounded-lg text-center font-medium text-slate-400">
            Log Offline Session
          </div>
        </div>

        {/* User Prompt Bubble */}
        <div className="analytics-card p-3.5 text-xs text-slate-200 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">You asked:</span>
          <p className="italic text-slate-300 leading-relaxed">
            &ldquo;I need to study 2 hours of Organic Chemistry and 1 hour of Coordinate Geometry before 7
            PM with a short break.&rdquo;
          </p>
        </div>

        {/* AI Draft Response */}
        <div className="p-4 rounded-2xl bg-sky-500/[0.08] border border-sky-500/25 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-sky-300" /> Drafted Study Schedule
            </span>
            <span className="text-[10px] text-slate-400">Requires confirmation</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-200 block">Organic Chemistry</span>
                <span className="text-[10px] text-slate-400">Focus block · 90 min</span>
              </div>
              <span className="text-slate-300 font-mono text-[11px] tabular-nums">15:00 – 16:30</span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex justify-between items-center text-slate-400 text-[11px]">
              <span>Short Recharge Break</span>
              <span className="font-mono tabular-nums">16:30 – 16:45</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-200 block">Coordinate Geometry</span>
                <span className="text-[10px] text-slate-400">Focus block · 60 min</span>
              </div>
              <span className="text-slate-300 font-mono text-[11px] tabular-nums">16:45 – 17:45</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" className="workspace-primary flex-1">
              Apply to Planner
            </button>
            <button type="button" className="analytics-button">
              Adjust
            </button>
          </div>
        </div>
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Daily allowance: 3 requests/day (Free) · 12 requests/day (Plus+)
        </span>
        <span className="text-[11px] text-sky-300/80">Photo Plan Upload Supported</span>
      </div>
    </div>
  );
}

/**
 * 6. REALISTIC STUDY CIRCLES & RANKINGS PREVIEW
 * Mirrors LiveGroupsView with live presence (who is focusing now),
 * private code invite, and leaderboard rankings with AI manual entry rule.
 */
export function LandingCirclesPreview() {
  return (
    <div className="sanctra-app landing-product-preview landing-circles-preview">
      <div className="landing-preview-toolbar">
        <span className="font-display font-semibold text-white">
          <Users size={17} style={{ color: 'var(--sanctra-sage, #b8d4ea)' }} />
          Study Circle · Late Night Hall
        </span>
        <div className="landing-preview-state">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            6 studying right now
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Active Members Row */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
            Who is in focus
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="analytics-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 font-display">
                  AK
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">Arjun K.</span>
                  <span className="text-[10px] text-sky-300">Mathematics</span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 tabular-nums">
                48m focus
              </span>
            </div>

            <div className="analytics-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0 font-display">
                  ST
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">Sara T.</span>
                  <span className="text-[10px] text-emerald-300">Physics</span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 tabular-nums">
                1h 12m focus
              </span>
            </div>
          </div>
        </div>

        {/* Circle Leaderboard Snippet */}
        <div className="analytics-card p-4 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-display font-semibold text-slate-200">
              Weekly Group Leaderboard
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Reset: Monday 00:00 UTC</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.035] border border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400 font-bold text-xs w-4">#1</span>
                <span className="text-slate-200 font-medium">Arjun K.</span>
              </div>
              <span className="font-display font-semibold text-white tabular-nums">28h 15m</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.035] border border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="text-sky-400 font-bold text-xs w-4">#2</span>
                <span className="text-slate-200 font-medium">Sara T.</span>
              </div>
              <span className="font-display font-semibold text-white tabular-nums">24h 50m</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.035] border border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="text-slate-400 font-bold text-xs w-4">#3</span>
                <span className="text-slate-200 font-medium">Rohan M.</span>
              </div>
              <span className="font-display font-semibold text-white tabular-nums">19h 20m</span>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-preview-footer">
        <span className="text-xs text-slate-300">
          Public &amp; private circles · Invitation code (e.g. SANCT-LN) · Group chat with images
        </span>
        <span className="text-[11px] text-emerald-300/80">AI-approved manual entries count</span>
      </div>
    </div>
  );
}
