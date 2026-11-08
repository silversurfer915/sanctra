import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Plus,
  Check,
  TrendingUp,
  Headphones,
  Sparkles,
  Square,
  Play,
} from 'lucide-react';
import { Brand } from '../Brand.tsx';
import { ObservatoryScene } from '../ObservatoryScene.tsx';
import { LandingAtmosphereCanvas } from './LandingAtmosphereCanvas.tsx';
import { LandingCyanotypeApparatus } from './LandingCyanotypeApparatus.tsx';
import { playAmbientSound, stopAmbientSound } from '../../utils/landingSoundPreview.ts';
import { PLUS_PRICING_PLANS } from '../../utils/subscriptionPlans.ts';
import './landing-preview.css';
import './landing.css';

interface LandingViewProps {
  activeWallpaperId?: string;
  onStartStudying: (subject?: string, minutes?: number) => void;
  onAtmosphereChange?: (id: string) => void;
  onOpenGroups: () => void;
  onOpenAuth: () => void;
}

const SOUNDSCAPES_SHOWCASE = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    desc: 'Soft droplets falling on window glass. Masks room conversations.',
    profile: (
      <svg viewBox="0 0 100 24" className="w-full h-5 text-[var(--rs-blue)]" fill="none">
        <line x1="10" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.6" />
        <line x1="25" y1="2" x2="25" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" opacity="0.9" />
        <line x1="40" y1="6" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.5" />
        <line x1="55" y1="3" x2="55" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" opacity="0.8" />
        <line x1="70" y1="5" x2="70" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" opacity="0.7" />
        <line x1="85" y1="2" x2="85" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: 'ocean',
    name: 'Beach Waves',
    desc: 'Slow, rhythmic ocean swells washing ashore for deep relaxation.',
    profile: (
      <svg viewBox="0 0 100 24" className="w-full h-5 text-[var(--rs-blue)]" fill="none">
        <path d="M 0 12 Q 25 2, 50 12 T 100 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M 0 18 Q 25 8, 50 18 T 100 18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'forest',
    name: 'Pine Forest',
    desc: 'Wind through high pine needles and subtle nature sounds.',
    profile: (
      <svg viewBox="0 0 100 24" className="w-full h-5 text-[var(--rs-emerald)]" fill="none">
        <path d="M 0 16 C 20 6, 30 20, 50 10 C 70 2, 80 18, 100 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'brown',
    name: 'Brown Noise',
    desc: 'Deep low-frequency rumble that cancels sudden room noise.',
    profile: (
      <svg viewBox="0 0 100 24" className="w-full h-5 text-[var(--rs-amber)]" fill="none">
        <path d="M 0 4 C 30 6, 60 17, 100 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d="M 0 4 C 30 6, 60 17, 100 21 L 100 24 L 0 24 Z" fill="currentColor" opacity="0.12" />
      </svg>
    ),
  },
];

const STUDY_CIRCLES_PLATES = [
  {
    num: '01',
    room: 'Central Reading Hall',
    count: '18 studying',
    rhythm: '25m Pomodoro',
    subject: 'Calculus & Linear Algebra',
    note: 'Quiet desk with 5-minute collective resting pauses.',
    occupied: 18,
    total: 24,
  },
  {
    num: '02',
    room: 'Science Solarium',
    count: '12 studying',
    rhythm: '50m Deep Flow',
    subject: 'Organic Chemistry & Biology',
    note: 'Extended focus cycles designed for problem sets and labs.',
    occupied: 12,
    total: 16,
  },
  {
    num: '03',
    room: 'Midnight Reading Desk',
    count: '9 studying',
    rhythm: 'Open Flow',
    subject: 'Literature & Philosophy',
    note: 'Late night contemplation without ticking countdown alarms.',
    occupied: 9,
    total: 12,
  },
  {
    num: '04',
    room: 'Engineering Lab',
    count: '15 studying',
    rhythm: 'Exam Countdown',
    subject: 'Physics Mechanics & Mock Tests',
    note: 'Timed problem-solving blocks with synchronized start times.',
    occupied: 15,
    total: 20,
  },
];

const FAQ_ITEMS = [
  {
    q: 'Can I use Sanctra without signing up?',
    a: 'Yes, 100%. Open your desk as a guest and use full Pomodoro, countdown, and stopwatch timers right away. Create an account only when you want your history to sync across devices.',
  },
  {
    q: 'How do the three focus modes work?',
    a: 'Pomodoro uses structured intervals (25m or 50m) with short breaks. Countdown gives a specific task a clear stopping deadline. Open Stopwatch lets you study in free flow without alarms.',
  },
  {
    q: 'What is JEE Track?',
    a: 'JEE Track is an optional workspace for engineering aspirants with syllabus chapter tracking and mock test analysis. It stays completely hidden if you study other subjects.',
  },
  {
    q: 'How does Sanctra protect my privacy?',
    a: 'Your sessions, notes, and task lists are private to your account. In study rooms, only your active focus status and weekly study hours appear on group leaderboards — no video cameras, no audio recordings.',
  },
  {
    q: 'Can I export my study schedule to my calendar?',
    a: 'Yes. Sanctra includes a full planner with Month, Week, and Agenda views. You can export your schedule as standard .ics files anytime.',
  },
];

export function LandingView({
  onStartStudying,
  onOpenGroups,
  onOpenAuth,
}: LandingViewProps) {
  const [quickSubject, setQuickSubject] = useState('');
  const [isYearly, setIsYearly] = useState(true);
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([2]); // Initially show item 2 open
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSoundPreview, setActiveSoundPreview] = useState('rain');

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Cyanotype Solar Study Timer State
  const [timerMode, setTimerMode] = useState<'pomodoro-25' | 'pomodoro-50' | 'countup'>('pomodoro-25');
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeSubject, setActiveSubject] = useState('Mathematics');

  // Timer interval ticker
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (timerMode === 'countup') {
          return prev + 1;
        } else {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerMode]);

  const handleToggleTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    if (timerMode === 'pomodoro-25') setTimerSeconds(25 * 60);
    else if (timerMode === 'pomodoro-50') setTimerSeconds(50 * 60);
    else if (timerMode === 'countup') setTimerSeconds(0);
  };

  const handleSelectMode = (newMode: 'pomodoro-25' | 'pomodoro-50' | 'countup') => {
    setTimerMode(newMode);
    setIsTimerRunning(false);
    if (newMode === 'pomodoro-25') {
      setTotalSeconds(25 * 60);
      setTimerSeconds(25 * 60);
    } else if (newMode === 'pomodoro-50') {
      setTotalSeconds(50 * 60);
      setTimerSeconds(50 * 60);
    } else if (newMode === 'countup') {
      setTotalSeconds(60 * 60);
      setTimerSeconds(0);
    }
  };

  const handlePlantSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickSubject.trim();
    if (clean) {
      setActiveSubject(clean);
      setIsTimerRunning(true);
    }
  };

  const handleToggleSound = (id: string) => {
    const isPlaying = playAmbientSound(id);
    setActiveSoundPreview(isPlaying ? id : '');
  };

  useEffect(() => {
    return () => {
      stopAmbientSound();
    };
  }, []);

  // Track scroll position for Florilegium time scrubber and section rail
  const [activeSectionId, setActiveSectionId] = useState('hero');

  const LANDING_SECTIONS = [
    { id: 'hero', label: '01 Apparatus', href: '#landing-main' },
    { id: 'modes', label: '02 Modes', href: '#modes' },
    { id: 'rooms', label: '03 Spaces', href: '#rooms' },
    { id: 'soundscapes', label: '04 Sounds', href: '#soundscapes' },
    { id: 'stats', label: '05 Archive', href: '#stats' },
    { id: 'jee', label: '06 JEE Track', href: '#jee' },
    { id: 'pricing', label: '07 Access', href: '#pricing' },
    { id: 'faq', label: '08 Questions', href: '#faq' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / totalHeight)) : 0;
      setScrollProgress(progress);

      // Determine active section based on scroll position
      const scrollMiddle = window.scrollY + window.innerHeight * 0.35;
      for (let i = LANDING_SECTIONS.length - 1; i >= 0; i--) {
        const sec = document.getElementById(LANDING_SECTIONS[i].id);
        if (sec && sec.offsetTop <= scrollMiddle) {
          setActiveSectionId(LANDING_SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver to trigger smooth entry reveals on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Compute time progression along study day: 06:00 -> 23:00 (17 hours)
  const totalMinutes = Math.round(scrollProgress * 17 * 60);
  const currentHour = Math.floor(6 + totalMinutes / 60);
  const currentMin = totalMinutes % 60;
  const scrubTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
  const scrubPhase =
    currentHour < 10
      ? 'Morning Clarity'
      : currentHour < 14
      ? 'Midday Discipline'
      : currentHour < 18
      ? 'Afternoon Flow'
      : 'Evening Contemplation';

  // Procedural SVG grain URI
  const grainSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.96 0 0 0 0 0.94 0 0 0 0 0.88 0 0 0 0.08 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>';
  const grainUrl = `url("data:image/svg+xml,${encodeURIComponent(grainSvg)}")`;

  return (
    <div
      className="sanctra-landing landing-renewed min-h-screen pb-24 md:pb-12"
      style={{ '--rs-grain': grainUrl } as React.CSSProperties}
    >
      <a className="os-skip-link" href="#landing-main">
        Skip to content
      </a>

      {/* Atmospheric Background Blobs & Grain (Oversight Botanical Noir) */}
      <div className="rs-bg" aria-hidden="true">
        <span className="rs-blob rs-blob--a" />
        <span className="rs-blob rs-blob--b" />
        <span className="rs-blob rs-blob--c" />
        <span className="rs-blob rs-blob--d" />
      </div>
      <div className="rs-vignette" aria-hidden="true" />
      <div className="rs-grain" aria-hidden="true" />
      {/* First-paint scenic fallback for prerender & crawlers */}
      <div className="hidden" aria-hidden="true">
        <ObservatoryScene paused />
      </div>

      {/* Interactive Atmosphere Spores, Subtle Rain Streaks & Click Sparks */}
      <LandingAtmosphereCanvas />

      {/* Fixed Architectural Scroll Depth Rail */}
      <nav aria-label="Page section progress" className="rs-scroll-rail">
        {LANDING_SECTIONS.map((sec) => (
          <a
            key={sec.id}
            href={sec.href}
            onClick={(e) => {
              e.preventDefault();
              const target = document.querySelector(sec.href);
              target?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`rs-scroll-rail__dot ${activeSectionId === sec.id ? 'is-active' : ''}`}
            aria-label={`Jump to ${sec.label}`}
          >
            <span className="rs-scroll-rail__tooltip">{sec.label}</span>
          </a>
        ))}
      </nav>

      {/* Floating Capsule Header */}
      <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rs-nav-pill">
          <a href="#landing-main" aria-label="Sanctra home" className="flex items-center gap-2">
            <Brand compact />
          </a>

          <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-6">
            <a href="#modes" className="rs-nav-link">
              Focus Modes
            </a>
            <a href="#rooms" className="rs-nav-link">
              Study Rooms
            </a>
            <a href="#soundscapes" className="rs-nav-link">
              Sounds
            </a>
            <a href="#stats" className="rs-nav-link">
              Stats
            </a>
            <a href="#pricing" className="rs-nav-link">
              Pricing
            </a>
            <a href="#faq" className="rs-nav-link">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={onOpenAuth} className="rs-btn-ghost">
              Sign in
            </button>
            <button
              onClick={() => onStartStudying()}
              className="rs-btn-cta rs-nav-cta"
            >
              Start Studying <span aria-hidden="true">↵</span>
            </button>
          </div>
        </div>
      </header>

      {/* FLORILEGIUM-STYLE STICKY TIME SCRUBBER (SCROLL PROGRESS) */}
      <aside
        className="fixed bottom-6 right-6 z-30 hidden lg:flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-[#12151a]/80 backdrop-blur-xl shadow-2xl font-sans text-xs text-[var(--rs-cream-soft)] select-none pointer-events-auto"
        aria-label="Study day scroll progression"
      >
        <span className="text-[11px] text-[var(--rs-cream-dim)] font-medium">06:00 Dawn</span>
        <div className="relative w-24 h-1 bg-white/15 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 bg-[var(--rs-amber)] rounded-full transition-all duration-75"
            style={{ width: `${Math.round(scrollProgress * 100)}%` }}
          />
        </div>
        <span className="font-serif text-base text-[var(--rs-cream)] tabular-nums">{scrubTime}</span>
        <span className="text-[11px] text-[var(--rs-amber)] font-medium">{scrubPhase}</span>
      </aside>

      {/* MAIN HERO STAGE */}
      <main id="landing-main" className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 pb-20 space-y-24">
        {/* HERO SECTION */}
        <section id="hero" aria-labelledby="hero-title" className="relative pt-6 sm:pt-10 space-y-8 reveal-on-scroll is-revealed">
          {/* Top Brand Kicker */}
          <div className="w-full">
            <p className="rs-kicker">
              <span>Sanctra</span>
              <span className="rs-kicker__sep" />
              <span>Calm workspace for deep study</span>
            </p>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[560px] lg:min-h-[620px]">
            {/* Left Column: Big Editorial Headline & Direct Entry */}
            <div className="lg:col-span-6 flex flex-col items-start gap-8 z-10">
              <h1 id="hero-title" className="rs-head">
                <span className="ln">
                  <span className="li">A little calm.</span>
                </span>
                <span className="ln">
                  <span className="li">
                    For <em>deep study.</em>
                  </span>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--rs-cream-soft)] max-w-md leading-relaxed font-sans">
                Pomodoro intervals, calming soundscapes, and clean study tracking. Free forever, no sign-up required.
              </p>

              {/* Direct Subject Entry Form */}
              <form onSubmit={handlePlantSubject} className="rs-form pt-2">
                <label htmlFor="quick-subject" className="rs-form__label">
                  What are you studying today?
                </label>
                <div className="rs-form__row">
                  <input
                    id="quick-subject"
                    value={quickSubject}
                    onChange={(e) => setQuickSubject(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Calculus, Physics..."
                    maxLength={35}
                  />
                  <button type="submit" aria-label="Start studying">
                    Start Focus <span aria-hidden="true">↵</span>
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-3 pt-2 text-xs font-sans text-[var(--rs-cream-dim)]">
                <span>Free forever · No sign-up wall</span>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={() => onStartStudying(quickSubject || undefined)}
                  className="text-[var(--rs-amber)] hover:underline underline-offset-4 cursor-pointer font-medium inline-flex items-center gap-1"
                >
                  <span>Enter full desk directly</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            {/* Right Column: Cyanotype & Phototropism Sun Exposure Study Apparatus */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-end justify-center w-full z-10">
              <div className="w-full max-w-[480px] flex flex-col items-center">
                <LandingCyanotypeApparatus
                  timerMode={timerMode}
                  timerSeconds={timerSeconds}
                  totalSeconds={totalSeconds}
                  isRunning={isTimerRunning}
                  activeSubject={activeSubject}
                  onToggleRunning={handleToggleTimer}
                  onResetTimer={handleResetTimer}
                  onSelectMode={handleSelectMode}
                  onOpenDesk={() => onStartStudying(activeSubject || undefined)}
                />

                {/* Floating Counter beneath the apparatus */}
                <div className="rs-count pt-6 flex items-center justify-between w-full px-2">
                  <span className="rs-count__n">0425</span>
                  <span className="text-xs font-sans text-[var(--rs-cream-soft)]">hours focused in Sanctra today</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOCUS MODES */}
        <section id="modes" aria-labelledby="modes-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-2">
            <h2 id="modes-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Three modes for <em>different days.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              Some sessions need structured intervals. Others need uninterrupted flow. Choose what fits your day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Mode 01: Pomodoro */}
            <div
              className="rs-herbarium-card flex flex-col items-start justify-between gap-6 reveal-on-scroll stagger-1"
              style={{ transform: 'rotate(-0.8deg)' }}
            >
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-serif text-lg text-[var(--rs-amber)] font-medium">01</span>
                  <span className="text-xs font-sans text-[var(--rs-cream-dim)] font-medium">Interval Discipline</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--rs-cream)] font-normal pt-1">
                  Structured Intervals
                </h3>
                <p className="text-sm text-[var(--rs-cream-soft)] leading-relaxed font-sans">
                  Classic 25-minute or 50-minute blocks with short resting pauses. Maintains deep mental clarity during intense problem sets.
                </p>

                {/* Tactile Interval Rhythm Strip */}
                <div className="w-full my-2 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                    <span className="text-[var(--rs-amber)] font-medium">Focus 25m</span>
                    <span className="text-[var(--rs-emerald)] font-medium">Rest 5m</span>
                    <span>Focus 25m</span>
                  </div>
                  <div className="flex items-center gap-1.5 h-2 w-full">
                    <div className="h-full rounded-full bg-[var(--rs-amber)] flex-1 shadow-sm shadow-[rgba(229,184,105,0.3)]" />
                    <div className="h-full rounded-full bg-[var(--rs-emerald)] w-7 shadow-sm shadow-[rgba(52,211,153,0.3)]" />
                    <div className="h-full rounded-full bg-[var(--rs-amber)]/35 flex-1" />
                  </div>
                  <div className="text-[10px] text-[var(--rs-cream-dim)] flex items-center justify-between">
                    <span>00:00</span>
                    <span>25:00</span>
                    <span>30:00</span>
                    <span>55:00</span>
                  </div>
                </div>
              </div>

              <div className="w-full pt-4 border-t border-[var(--rs-border)] space-y-3">
                <div className="flex items-center justify-between text-xs font-sans text-[var(--rs-cream-dim)]">
                  <span>Presets: 25m / 50m</span>
                  <span className="text-[var(--rs-amber)] font-medium">Auto-break</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectMode('pomodoro-25');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-[var(--rs-amber)] hover:text-[var(--rs-amber)] bg-white/5 text-xs font-sans font-medium transition-all text-center cursor-pointer"
                >
                  Load Pomodoro ↵
                </button>
              </div>
            </div>

            {/* Mode 02: Countdown */}
            <div
              className="rs-herbarium-card flex flex-col items-start justify-between gap-6 reveal-on-scroll stagger-2"
              style={{ transform: 'rotate(0.8deg)' }}
            >
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-serif text-lg text-[var(--rs-rose)] font-medium">02</span>
                  <span className="text-xs font-sans text-[var(--rs-cream-dim)] font-medium">Targeted Horizon</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--rs-cream)] font-normal pt-1">
                  Finite Deadlines
                </h3>
                <p className="text-sm text-[var(--rs-cream-soft)] leading-relaxed font-sans">
                  Set a concrete target time for mock exams, essays, or timed assignments. The clock enforces a quiet, disciplined stopping point.
                </p>

                {/* Tactile Countdown Strip */}
                <div className="w-full my-2 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                    <span>Timed Mock Limit</span>
                    <span className="text-[var(--rs-rose)] font-medium">Target: 02:00:00</span>
                  </div>
                  <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 bg-[var(--rs-rose)] rounded-full w-[65%]" />
                  </div>
                  <div className="text-[10px] text-[var(--rs-cream-dim)] flex items-center justify-between">
                    <span>Started 00:00</span>
                    <span className="text-[var(--rs-cream)] font-medium">42m remaining</span>
                    <span>Finish & Review</span>
                  </div>
                </div>
              </div>

              <div className="w-full pt-4 border-t border-[var(--rs-border)] space-y-3">
                <div className="flex items-center justify-between text-xs font-sans text-[var(--rs-cream-dim)]">
                  <span>Exam mock limits</span>
                  <span className="text-[var(--rs-rose)] font-medium">Timed test</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectMode('pomodoro-50');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-[var(--rs-amber)] hover:text-[var(--rs-amber)] bg-white/5 text-xs font-sans font-medium transition-all text-center cursor-pointer"
                >
                  Load Countdown ↵
                </button>
              </div>
            </div>

            {/* Mode 03: Open Stopwatch */}
            <div
              className="rs-herbarium-card flex flex-col items-start justify-between gap-6 reveal-on-scroll stagger-3"
              style={{ transform: 'rotate(-0.5deg)' }}
            >
              <div className="space-y-4 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-serif text-lg text-[var(--rs-purple)] font-medium">03</span>
                  <span className="text-xs font-sans text-[var(--rs-cream-dim)] font-medium">Open Contemplation</span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--rs-cream)] font-normal pt-1">
                  Open-Ended Flow
                </h3>
                <p className="text-sm text-[var(--rs-cream-soft)] leading-relaxed font-sans">
                  Start when you open your book and stop when your thought is complete. No intrusive chime or synthetic countdown shattering your immersion.
                </p>

                {/* Tactile Flow Strip */}
                <div className="w-full my-2 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                    <span>Continuous Deep Flow</span>
                    <span className="text-[var(--rs-purple)] font-medium">Active: 01:42:18</span>
                  </div>
                  <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[var(--rs-purple)] via-[#a855f7] to-[var(--rs-amber)] rounded-full w-[80%]" />
                  </div>
                  <div className="text-[10px] text-[var(--rs-cream-dim)] flex items-center justify-between">
                    <span>Start on book open</span>
                    <span className="text-[var(--rs-cream)] font-medium">Unbroken thought</span>
                    <span>Stop on finish</span>
                  </div>
                </div>
              </div>

              <div className="w-full pt-4 border-t border-[var(--rs-border)] space-y-3">
                <div className="flex items-center justify-between text-xs font-sans text-[var(--rs-cream-dim)]">
                  <span>Open flow</span>
                  <span className="text-[var(--rs-purple)] font-medium">Silent timer</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectMode('countup');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-[var(--rs-amber)] hover:text-[var(--rs-amber)] bg-white/5 text-xs font-sans font-medium transition-all text-center cursor-pointer"
                >
                  Load Flow ↵
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STUDY ROOMS */}
        <section id="rooms" aria-labelledby="rooms-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-2">
            <h2 id="rooms-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Silent company makes <em>long hours lighter.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              Study alongside peers in calm virtual reading halls. Feel shared presence and weekly momentum without video cameras, audio noise, or performative distractions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STUDY_CIRCLES_PLATES.map((plate, idx) => (
              <div key={idx} className={`rs-plate-card flex flex-col justify-between gap-6 reveal-on-scroll stagger-${idx + 1}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="rs-plate-number">{plate.num}</span>
                    <span className="text-xs font-sans text-[var(--rs-cream-soft)] font-medium">
                      {plate.count}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl text-[var(--rs-cream)] font-normal">
                    {plate.room}
                  </h3>

                  <div className="text-xs font-sans text-[var(--rs-cream-soft)]">
                    Focus Subject: <span className="text-[var(--rs-cream)] font-medium">{plate.subject}</span>
                  </div>

                  <p className="text-sm text-[var(--rs-cream-soft)] leading-relaxed font-sans">
                    {plate.note}
                  </p>

                  {/* Architectural desk occupancy presence strip */}
                  <div className="w-full my-2 p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                      <span className="flex items-center gap-1.5 text-[var(--rs-cream-soft)] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--rs-amber)] animate-pulse" />
                        {plate.occupied} desks occupied
                      </span>
                      <span>{plate.total - plate.occupied} open</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const isFilled = i < Math.round((plate.occupied / plate.total) * 14);
                        return (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              isFilled
                                ? 'bg-[var(--rs-amber)] shadow-sm shadow-[rgba(229,184,105,0.3)]'
                                : 'bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--rs-border)] flex items-center justify-between font-sans text-xs text-[var(--rs-cream-dim)]">
                  <span>Rhythm: {plate.rhythm}</span>
                  <button
                    type="button"
                    onClick={onOpenGroups}
                    className="text-[var(--rs-amber)] hover:underline underline-offset-4 cursor-pointer font-medium"
                  >
                    Join Room →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-6 rounded-2xl border border-white/10 bg-[#12161f]/60 backdrop-blur-md">
            <div className="space-y-1">
              <div className="text-sm font-medium text-[var(--rs-cream)] font-sans">
                Want to study with your own group?
              </div>
              <div className="text-xs font-sans text-[var(--rs-cream-soft)]">
                Create private focus desks with custom invite codes for your school or friends.
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenGroups}
              className="rs-btn-cta shrink-0"
            >
              Explore Study Rooms <ArrowUpRight size={14} />
            </button>
          </div>
        </section>

        {/* AMBIENT SOUNDSCAPES */}
        <section id="soundscapes" aria-labelledby="soundscapes-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-2">
            <h2 id="soundscapes-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Calm background <em>soundscapes.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              Drown out sporadic room noise and background chatter with soothing acoustic textures. Pair your timer with real rain, ocean waves, pine forest, or brown noise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOUNDSCAPES_SHOWCASE.map((sound) => {
              const isActive = activeSoundPreview === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => handleToggleSound(sound.id)}
                  className={`rs-plate-card text-left flex flex-col justify-between gap-5 p-6 cursor-pointer transition-all ${
                    isActive ? 'border-[var(--rs-amber)] bg-[#141a24]/95 shadow-xl shadow-[rgba(229,184,105,0.08)]' : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="p-2.5 rounded-full border border-white/10 bg-white/5 text-[var(--rs-amber)] flex items-center justify-center min-w-[36px] min-h-[36px]">
                      {isActive ? (
                        <div className="rs-soundwave" aria-label="Audio active">
                          <span className="rs-soundbar" />
                          <span className="rs-soundbar" />
                          <span className="rs-soundbar" />
                          <span className="rs-soundbar" />
                        </div>
                      ) : (
                        <Headphones size={16} />
                      )}
                    </span>
                    <span className="text-[11px] font-sans text-[var(--rs-cream-dim)] font-medium">
                      Acoustic
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-serif text-[var(--rs-cream)] font-normal">
                      {sound.name}
                    </h3>
                    <p className="text-xs text-[var(--rs-cream-soft)] leading-relaxed font-sans">
                      {sound.desc}
                    </p>
                  </div>

                  {/* Acoustic frequency profile visualization */}
                  <div className="w-full py-1.5 px-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center">
                    {sound.profile}
                  </div>

                  <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between font-sans text-[11px] text-[var(--rs-cream-dim)]">
                    <span>{isActive ? 'Active Stream' : 'Acoustic Profile'}</span>
                    <span className={`inline-flex items-center gap-1.5 ${isActive ? 'text-[var(--rs-amber)] font-medium' : 'text-[var(--rs-cream-soft)]'}`}>
                      {isActive ? (
                        <>
                          <span>Stop</span>
                          <Square size={9} fill="currentColor" className="shrink-0" />
                        </>
                      ) : (
                        <>
                          <span>Preview</span>
                          <Play size={9} fill="currentColor" className="shrink-0 ml-0.5" />
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-6 rounded-2xl border border-white/10 bg-[#10141a]/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[var(--rs-cream-soft)]">
            <span className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--rs-amber)]" />
              Includes YouTube focus audio player, custom scenery uploads, and full-screen minimal mode.
            </span>
            <button
              onClick={() => onStartStudying()}
              className="text-[var(--rs-cream)] hover:text-[var(--rs-amber)] transition-colors underline underline-offset-4 cursor-pointer shrink-0 font-medium"
            >
              Open Audio Studio in Desk →
            </button>
          </div>
        </section>

        {/* STUDY STATS */}
        <section id="stats" aria-labelledby="stats-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-2">
            <h2 id="stats-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Honest study tracking. <em>Never fabricated.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              Track your daily, weekly, and monthly focus hours with clean analytics that start at zero and reflect true study momentum.
            </p>
          </div>

          {/* Lead Metric & Sorted Bars */}
          <div className="rs-plate-card grid grid-cols-1 lg:grid-cols-12 gap-8 items-start p-8 reveal-on-scroll stagger-1">
            {/* Lead Metric */}
            <div className="lg:col-span-5 flex flex-col items-start gap-4">
              <span className="text-xs font-sans uppercase tracking-wider text-[var(--rs-cream-dim)] font-medium">
                Total Verified Focus
              </span>
              <div className="font-serif text-6xl sm:text-7xl text-[var(--rs-cream)] font-normal leading-none tabular-nums">
                42.5 <span className="text-xl font-sans text-[var(--rs-cream-soft)]">hrs</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-[var(--rs-emerald)] bg-[var(--rs-emerald-soft)] border border-[rgba(52,211,153,0.25)] px-3 py-1 rounded-full">
                <TrendingUp size={12} />
                +14.8% vs last month
              </div>

              <div className="w-full pt-6 mt-4 border-t border-[var(--rs-border)] space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rs-cream-dim)]">Consistency index</span>
                  <span className="text-[var(--rs-cream)] tabular-nums font-medium">88.5% (+6.2%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rs-cream-dim)]">Daily average</span>
                  <span className="text-[var(--rs-cream)] tabular-nums font-medium">3.2 hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--rs-cream-dim)]">Active days logged</span>
                  <span className="text-[var(--rs-cream)] tabular-nums font-medium">26 of 30 days</span>
                </div>
              </div>
            </div>

            {/* Sorted Distribution Bars */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4 w-full">
              <div className="flex items-center justify-between w-full font-sans text-xs text-[var(--rs-cream-dim)]">
                <span>Subject Distribution</span>
                <span>This Month</span>
              </div>

              <div className="w-full space-y-4 pt-2 font-sans">
                {/* Bar 1: Mathematics (Amber) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--rs-cream)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--rs-amber)]" />
                      Mathematics
                    </span>
                    <span className="tabular-nums text-[var(--rs-amber)] font-medium">18.5 hrs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--rs-amber)] h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>

                {/* Bar 2: Physics (Sky Blue) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--rs-cream)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--rs-blue)]" />
                      Physics
                    </span>
                    <span className="tabular-nums text-[var(--rs-blue)] font-medium">13.0 hrs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--rs-blue)] h-2 rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>

                {/* Bar 3: Chemistry (Emerald) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--rs-cream)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--rs-emerald)]" />
                      Chemistry
                    </span>
                    <span className="tabular-nums text-[var(--rs-emerald)] font-medium">8.5 hrs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--rs-emerald)] h-2 rounded-full" style={{ width: '38%' }} />
                  </div>
                </div>

                {/* Bar 4: Literature (Purple) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--rs-cream-soft)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--rs-purple)]" />
                      Literature
                    </span>
                    <span className="tabular-nums text-[var(--rs-purple)] font-medium">2.5 hrs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--rs-purple)] h-2 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="space-y-3">
            <div className="text-xs font-sans uppercase tracking-wider text-[var(--rs-cream-dim)] font-medium">
              Recent Study Sessions
            </div>
            <div className="rs-ledger-container">
              <div className="rs-ledger-row rs-ledger-header">
                <span>Date</span>
                <span>Subject</span>
                <span className="rs-ledger-col-hide-mobile">Focus Mode</span>
                <span className="text-right">Duration</span>
                <span className="text-right">Status</span>
              </div>
              {/* Highlighted Top Line: Today */}
              <div className="rs-ledger-row rs-ledger-row--highlight">
                <span className="text-[var(--rs-amber)] font-medium">Today</span>
                <span className="text-[var(--rs-cream)] font-medium">Calculus III (Stokes' Theorem)</span>
                <span className="text-[var(--rs-cream-soft)] rs-ledger-col-hide-mobile">50m Deep Flow</span>
                <span className="text-[var(--rs-amber)] tabular-nums font-semibold text-right">1h 40m</span>
                <span className="text-[var(--rs-emerald)] font-medium text-right inline-flex items-center justify-end gap-1"><Check size={11} className="shrink-0" /> Logged</span>
              </div>
              {/* Historical lines */}
              <div className="rs-ledger-row opacity-80">
                <span className="text-[var(--rs-cream-dim)]">Yesterday</span>
                <span className="text-[var(--rs-cream)]">Physics Mechanics (Rotational Dynamics)</span>
                <span className="text-[var(--rs-cream-soft)] rs-ledger-col-hide-mobile">25m Pomodoro</span>
                <span className="text-[var(--rs-cream)] tabular-nums text-right">2h 15m</span>
                <span className="text-[var(--rs-cream-soft)] text-right inline-flex items-center justify-end gap-1"><Check size={11} className="shrink-0" /> Logged</span>
              </div>
              <div className="rs-ledger-row opacity-70">
                <span className="text-[var(--rs-cream-dim)]">Nov 05</span>
                <span className="text-[var(--rs-cream)]">Organic Chemistry (Aldol Condensations)</span>
                <span className="text-[var(--rs-cream-soft)] rs-ledger-col-hide-mobile">25m Pomodoro</span>
                <span className="text-[var(--rs-cream)] tabular-nums text-right">1h 15m</span>
                <span className="text-[var(--rs-cream-soft)] text-right inline-flex items-center justify-end gap-1"><Check size={11} className="shrink-0" /> Logged</span>
              </div>
              <div className="rs-ledger-row opacity-60">
                <span className="text-[var(--rs-cream-dim)]">Nov 04</span>
                <span className="text-[var(--rs-cream)]">Philosophy (Kant's Critique)</span>
                <span className="text-[var(--rs-cream-soft)] rs-ledger-col-hide-mobile">Open Flow</span>
                <span className="text-[var(--rs-cream)] tabular-nums text-right">45m</span>
                <span className="text-[var(--rs-cream-soft)] text-right inline-flex items-center justify-end gap-1"><Check size={11} className="shrink-0" /> Logged</span>
              </div>
            </div>
          </div>
        </section>

        {/* OPTIONAL JEE TRACK WORKSPACE */}
        <section id="jee" aria-labelledby="jee-heading" className="rs-plate-card border-l-2 border-l-[var(--rs-amber)] p-8 sm:p-10 reveal-on-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Heading and Details */}
            <div className="lg:col-span-6 space-y-4 text-left">
              <div className="flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-[var(--rs-amber)] font-medium">
                <BookOpen size={16} />
                <span>Optional Engineering Workspace</span>
              </div>
              <h2 id="jee-heading" className="font-serif text-3xl sm:text-4xl text-[var(--rs-cream)] font-normal leading-tight">
                Preparing for JEE? <em>Enable your dedicated track.</em>
              </h2>
              <p className="text-[var(--rs-cream-soft)] text-sm sm:text-base leading-relaxed font-sans">
                Track syllabus coverage across 90+ Physics, Chemistry, and Math chapters. Log mock tests with percentile analysis and get AI-assisted chapter revision suggestions. Opt-in when you need it; your regular desk stays quiet if you don't.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onStartStudying('jee')}
                  className="rs-btn-cta text-xs py-2.5 px-6 font-semibold"
                >
                  Open JEE Workspace <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Column: Specimen Chapter Drawers */}
            <div className="lg:col-span-6 flex flex-col gap-3 w-full">
              {/* Physics Specimen */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="flex items-center gap-2 text-[var(--rs-cream)] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[var(--rs-amber)]" />
                    Physics · 32 Chapters
                  </span>
                  <span className="text-[var(--rs-amber)] tabular-nums font-medium">24 / 32 completed (75%)</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--rs-amber)] h-full rounded-full" style={{ width: '75%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                  <span>Mechanics · Electrodynamics</span>
                  <span>8 remaining</span>
                </div>
              </div>

              {/* Chemistry Specimen */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="flex items-center gap-2 text-[var(--rs-cream)] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[var(--rs-emerald)]" />
                    Chemistry · 30 Chapters
                  </span>
                  <span className="text-[var(--rs-emerald)] tabular-nums font-medium">21 / 30 completed (70%)</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--rs-emerald)] h-full rounded-full" style={{ width: '70%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                  <span>Organic · Physical · Inorganic</span>
                  <span>9 remaining</span>
                </div>
              </div>

              {/* Mathematics Specimen */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="flex items-center gap-2 text-[var(--rs-cream)] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[var(--rs-blue)]" />
                    Mathematics · 28 Chapters
                  </span>
                  <span className="text-[var(--rs-blue)] tabular-nums font-medium">23 / 28 completed (82%)</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--rs-blue)] h-full rounded-full" style={{ width: '82%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-sans text-[var(--rs-cream-dim)]">
                  <span>Calculus · Vectors · Algebra</span>
                  <span>5 remaining</span>
                </div>
              </div>

              {/* Mock Test Score Pill */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] font-sans text-[var(--rs-cream-soft)]">
                <span className="flex items-center gap-2">
                  <span className="text-[var(--rs-amber)] font-medium">Latest Mock 04</span>
                  <span>· Advanced Full Syllabus</span>
                </span>
                <span className="text-[var(--rs-amber)] font-semibold tabular-nums">99.2 %ile</span>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" aria-labelledby="pricing-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-3">
            <h2 id="pricing-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Simple, accessible <em>plans.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              The complete study desk has no paywalls or trial expirations. Upgrade to Plus for AI study planning and private rooms.
            </p>

            {/* Animated Billing Toggle Switch */}
            <div className="flex items-center gap-3 pt-2">
              <div
                role="radiogroup"
                aria-label="Billing frequency"
                className="inline-flex items-center p-1 rounded-full border border-white/10 bg-[#12151a]/80 font-sans text-xs backdrop-blur-md gap-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isYearly}
                  onClick={() => setIsYearly(false)}
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-200 font-sans ${
                    !isYearly
                      ? 'bg-[var(--rs-cream)] text-[#0b0c0e] font-bold shadow-md'
                      : 'text-[var(--rs-cream-soft)] hover:text-[var(--rs-cream)] font-medium'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isYearly}
                  onClick={() => setIsYearly(true)}
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-200 flex items-center gap-2 font-sans ${
                    isYearly
                      ? 'bg-[var(--rs-cream)] text-[#0b0c0e] font-bold shadow-md'
                      : 'text-[var(--rs-cream-soft)] hover:text-[var(--rs-cream)] font-medium'
                  }`}
                >
                  <span>Yearly</span>
                  <span
                    className={`text-[10px] font-sans font-bold uppercase tracking-wide px-2 py-0.5 rounded-full transition-colors ${
                      isYearly
                        ? 'bg-black/10 text-[#0b0c0e]'
                        : 'bg-[var(--rs-amber)]/20 text-[var(--rs-amber)] border border-[var(--rs-amber)]/30'
                    }`}
                  >
                    Save 78%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Tier 1: Free Desk */}
            <div className="rs-card flex flex-col items-start justify-between gap-6 bg-[#10141a]/60">
              <div className="space-y-4 w-full text-left">
                <div className="text-xs font-sans uppercase tracking-wider text-[var(--rs-cream-dim)] font-medium">
                  Free Forever
                </div>
                <h3 className="font-serif text-3xl text-[var(--rs-cream)] font-normal">
                  Your Study Desk
                </h3>
                <div className="font-serif text-5xl text-[var(--rs-cream)] font-normal tabular-nums">
                  ₹0 <span className="font-sans text-sm text-[var(--rs-cream-dim)]">/ forever</span>
                </div>
                <p className="text-sm text-[var(--rs-cream-soft)] font-sans">
                  Full access to core focus timers, tasks, calendar, study history, and public study rooms.
                </p>

                <div className="pt-4 border-t border-[var(--rs-border)] space-y-3 w-full text-sm font-sans text-[var(--rs-cream-soft)]">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-emerald)] shrink-0" />
                    <span>Pomodoro, Countdown, and Stopwatch timers</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-emerald)] shrink-0" />
                    <span>Subject tagging and task backlog queue</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-emerald)] shrink-0" />
                    <span>Full calendar planner with .ics file export</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-emerald)] shrink-0" />
                    <span>Public study rooms with silent text chat</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-emerald)] shrink-0" />
                    <span>Optional JEE Track syllabus & mock tracker</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onStartStudying()}
                className="rs-btn-ghost w-full justify-center py-3 font-medium"
              >
                Open Free Desk <span aria-hidden="true">↵</span>
              </button>
            </div>

            {/* Tier 2: Sanctra Plus+ */}
            <div className="rs-card border-white/20 flex flex-col items-start justify-between gap-6 relative bg-[#10141a]/80 shadow-xl">
              <div className="space-y-4 w-full text-left pt-2">
                <div className="text-xs font-sans uppercase tracking-wider text-[var(--rs-amber)] font-medium">
                  Supporter Membership
                </div>
                <h3 className="font-serif text-3xl text-[var(--rs-cream)] font-normal">
                  Sanctra Plus+
                </h3>
                <div className="overflow-hidden min-h-[58px] flex items-baseline">
                  <div
                    key={isYearly ? 'yearly' : 'monthly'}
                    className="rs-price-glide font-serif text-5xl text-[var(--rs-cream)] font-normal tabular-nums flex items-baseline gap-2"
                  >
                    <span>₹{isYearly ? PLUS_PRICING_PLANS.yearly.priceInINR : PLUS_PRICING_PLANS.monthly.priceInINR}</span>
                    <span className="font-sans text-sm text-[var(--rs-cream-dim)]">
                      {isYearly ? '/ year' : '/ month'}
                    </span>
                    {isYearly && (
                      <span className="font-sans text-[11px] font-semibold text-[var(--rs-amber)] bg-[var(--rs-amber)]/10 border border-[var(--rs-amber)]/25 px-2 py-0.5 rounded-full ml-1.5 self-center">
                        ₹13/mo
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[var(--rs-cream-soft)] font-sans">
                  Expanded AI study planning, custom group invite codes, exclusive themes, and direct priority support.
                </p>

                <div className="pt-4 border-t border-[var(--rs-border)] space-y-3 w-full text-sm font-sans text-[var(--rs-cream-soft)]">
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-amber)] shrink-0" />
                    <span>Everything included in Free Desk</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-amber)] shrink-0" />
                    <span>Generous Sanctra AI study planning limits</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-amber)] shrink-0" />
                    <span>Custom invite codes for private study groups</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-amber)] shrink-0" />
                    <span>Custom profile cosmetics, frames, and badges</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check size={16} className="text-[var(--rs-amber)] shrink-0" />
                    <span>Direct priority maintainer support</span>
                  </div>
                </div>
              </div>

              <button onClick={onOpenAuth} className="rs-btn-cta w-full justify-center py-3 font-semibold">
                Get Sanctra Plus+ <span aria-hidden="true">↵</span>
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="space-y-10 scroll-mt-20 reveal-on-scroll">
          <div className="flex flex-col items-start gap-2">
            <h2 id="faq-title" className="font-serif text-3xl sm:text-5xl text-[var(--rs-cream)] font-normal leading-tight">
              Frequently asked <em>questions.</em>
            </h2>
            <p className="text-[var(--rs-cream-soft)] max-w-xl text-base font-sans">
              Quick answers about your desk, records, and privacy.
            </p>
          </div>

          <div className="w-full space-y-1">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndices.includes(idx);
              return (
                <div key={idx} className={`rs-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="rs-faq-header"
                  >
                    <span>{item.q}</span>
                    <span className="rs-faq-icon">
                      <Plus size={20} />
                    </span>
                  </button>
                  <div className="rs-faq-collapse">
                    <div className="rs-faq-collapse-inner">
                      <div className="rs-faq-body">{item.a}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-left font-sans text-xs text-[var(--rs-cream-dim)]">
            <span>Still have questions? </span>
            <button
              onClick={onOpenAuth}
              className="text-[var(--rs-amber)] hover:underline underline-offset-4 cursor-pointer font-medium"
            >
              Sign in to message maintainers
            </button>
          </div>
        </section>

        {/* BOTTOM CALLOUT */}
        <section id="coda" aria-labelledby="coda-title" className="rs-card bg-[#10141a]/80 border-white/20 p-10 sm:p-16 space-y-6 text-left reveal-on-scroll">
          <div className="space-y-3 max-w-xl">
            <h2 id="coda-title" className="font-serif text-4xl sm:text-6xl text-[var(--rs-cream)] font-normal leading-tight">
              The quiet desk is waiting.
            </h2>
            <p className="text-[var(--rs-cream-soft)] text-base sm:text-lg leading-relaxed font-sans">
              No account creation walls or setup forms between you and focused study. Open your workspace and begin immediately.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onStartStudying()}
              className="rs-btn-cta text-sm py-3 px-8 font-semibold"
            >
              Start Studying Free <span aria-hidden="true">↵</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[var(--rs-border)] bg-[#090b0e] py-12 px-4 sm:px-6 font-sans">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8 text-left text-xs font-sans">
          <div className="space-y-3">
            <Brand compact />
            <p className="text-[var(--rs-cream-dim)] max-w-xs leading-relaxed font-sans">
              A calm workspace for deep study. Focus intervals, ambient soundscapes, personal planning, and quiet study circles.
            </p>
          </div>

          <div className="space-y-2">
            <div className="uppercase tracking-wider text-[var(--rs-cream-soft)] font-medium">
              Features
            </div>
            <ul className="space-y-2 list-none p-0 m-0 text-[var(--rs-cream-dim)]">
              <li>
                <a href="/pomodoro-timer/" className="hover:text-[var(--rs-amber)] transition-colors">
                  Pomodoro Timer
                </a>
              </li>
              <li>
                <a href="/group-study-timer/" className="hover:text-[var(--rs-amber)] transition-colors">
                  Study Rooms
                </a>
              </li>
              <li>
                <button
                  onClick={() => onStartStudying('jee')}
                  className="hover:text-[var(--rs-amber)] transition-colors cursor-pointer text-left"
                >
                  JEE Track
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="uppercase tracking-wider text-[var(--rs-cream-soft)] font-medium">
              Product
            </div>
            <ul className="space-y-2 list-none p-0 m-0 text-[var(--rs-cream-dim)]">
              <li>
                <button
                  onClick={onOpenAuth}
                  className="hover:text-[var(--rs-amber)] transition-colors cursor-pointer text-left"
                >
                  Sign in
                </button>
              </li>
              <li>
                <a href="/privacy/" className="hover:text-[var(--rs-amber)] transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="uppercase tracking-wider text-[var(--rs-cream-soft)] font-medium">
              About
            </div>
            <p className="text-[var(--rs-cream-dim)]">
              Built for calm, focused study.
            </p>
            <div className="text-[var(--rs-cream-dim)] pt-2">© 2026 Sanctra.</div>
          </div>
        </div>
      </footer>

      {/* MOBILE STICKY DOCK */}
      <div className="rs-mobile-dock">
        <button
          onClick={() => onStartStudying()}
          className="rs-btn-cta w-full py-3 justify-center text-sm font-semibold"
        >
          Start Studying Free <span aria-hidden="true">↵</span>
        </button>
      </div>
    </div>
  );
}

export default LandingView;
