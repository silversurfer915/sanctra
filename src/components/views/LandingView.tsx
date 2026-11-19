import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Pause,
  Play,
  Square,
  Volume2,
  Users,
  Check,
  Clock3,
  Flame,
  BookOpen,
} from 'lucide-react';
import { Brand } from '../Brand.tsx';
import { playAmbientSound, stopAmbientSound } from '../../utils/landingSoundPreview.ts';
import { PLUS_PRICING_PLANS } from '../../utils/subscriptionPlans.ts';
import { formatDurationHuman } from '../../utils/time.ts';
import './landing.css';

interface LandingViewProps {
  activeWallpaperId?: string;
  todayFocusSeconds?: number;
  onStartStudying: (subject?: string, minutes?: number) => void;
  onAtmosphereChange?: (id: string) => void;
  onOpenGroups: () => void;
  onOpenAuth: () => void;
}

const MODES = [
  { n: '01', name: 'Structured intervals', line: '25 or 50 minute blocks with short rests.', detail: 'Classic Pomodoro, auto-breaks, and a desk that keeps the score.', tag: '25m · 50m' },
  { n: '02', name: 'Finite deadlines', line: 'A practice test needs a hard stop.', detail: 'Set a target time, watch it drain, finish with a review note.', tag: 'Timed' },
  { n: '03', name: 'Open flow', line: 'Start on the first page, stop when the thought ends.', detail: 'No chime, no countdown. A silent stopwatch that still logs the hours.', tag: 'Silent' },
];

const ROOMS = [
  { name: 'Central Reading Hall', subject: 'Calculus & Linear Algebra', seats: 24, filled: 18, rhythm: '25m' },
  { name: 'Science Solarium', subject: 'Organic Chemistry & Biology', seats: 16, filled: 12, rhythm: '50m' },
  { name: 'Midnight Desk', subject: 'Literature & Philosophy', seats: 12, filled: 9, rhythm: 'Flow' },
  { name: 'Engineering Lab', subject: 'Mechanics & Mock Tests', seats: 20, filled: 15, rhythm: 'Timed' },
];

const SOUNDS = [
  { id: 'rain', name: 'Gentle rain', note: 'Masks room conversation' },
  { id: 'ocean', name: 'Beach waves', note: 'Slow swells, deep rest' },
  { id: 'forest', name: 'Pine forest', note: 'Wind through needles' },
  { id: 'brown', name: 'Brown noise', note: 'Cancels sudden noise' },
];

const FAQ = [
  { q: 'Can I use Sanctra without signing up?', a: 'Yes. Open the desk as a guest and every timer works immediately. An account only exists so your history can follow you between devices.' },
  { q: 'How do the three focus modes work?', a: 'Intervals run Pomodoro blocks with breaks, deadlines count down to a time you set, and open flow is a silent stopwatch you stop yourself.' },
  { q: 'What is JEE Track?', a: 'An optional workspace for engineering aspirants: 90+ chapters, mock analysis and revision suggestions. It stays hidden if you never turn it on.' },
  { q: 'What do other people see in a study room?', a: 'Only your focus state and weekly hours. No camera, no audio, no screen sharing — the room is presence, not surveillance.' },
  { q: 'Can I export my plan?', a: 'Yes, the planner exports standard .ics files that drop into Google Calendar, Apple Calendar or anything else.' },
];

export const LandingView: React.FC<LandingViewProps> = ({
  todayFocusSeconds = 0,
  onStartStudying,
  onOpenGroups,
  onOpenAuth,
}) => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => () => stopAmbientSound(), []);

  const toggleSound = (id: string) => {
    if (sound === id) { stopAmbientSound(); setSound(null); return; }
    const ok = playAmbientSound(id);
    setSound(ok ? id : null);
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const plus = PLUS_PRICING_PLANS.yearly;

  return (
    <div className="sanctra-landing landing-renewed" id="landing-main">
      <div className="rs-bg" aria-hidden="true" />
      <a className="rs-skip" href="#landing-content">Skip to content</a>

      <header className="rs-nav">
        <div className="rs-nav__inner">
          <Brand />
          <nav className="rs-nav__links" aria-label="Landing sections">
            <a href="#modes">Modes</a>
            <a href="#rooms">Rooms</a>
            <a href="#sound">Sound</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="rs-nav__actions">
            <button type="button" className="rs-btn rs-btn--ghost rs-btn--sm" onClick={onOpenAuth}>Sign in</button>
            <button type="button" className="rs-btn rs-btn--gold rs-btn--sm" onClick={() => onStartStudying()}>
              Open desk <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main id="landing-content">
        <section className="rs-hero">
          <div className="rs-hero__copy">
            <p className="rs-kicker"><span>Free forever</span> · no sign-up wall</p>
            <h1 className="rs-hero__title">A quiet little game<br />for serious study.</h1>
            <p className="rs-hero__sub">
              Pomodoro intervals, deadlines and open flow, with soundscapes, tasks and
              honest tracking. Sanctra keeps the score so you can keep the streak.
            </p>
            <div className="rs-hero__cta">
              <button type="button" className="rs-btn rs-btn--gold" onClick={() => onStartStudying()}>
                Start focus <ArrowRight size={17} />
              </button>
              <button type="button" className="rs-btn rs-btn--ghost" onClick={onOpenAuth}>Create a desk</button>
            </div>
            <dl className="rs-facts">
              <div><dt>Today</dt><dd>{todayFocusSeconds > 0 ? formatDurationHuman(todayFocusSeconds) : '0m'}</dd></div>
              <div><dt>Modes</dt><dd>3</dd></div>
              <div><dt>Price</dt><dd>₹0</dd></div>
              <div><dt>Sign-up</dt><dd>Never</dd></div>
            </dl>
          </div>

          <div className="rs-console" aria-label="Timer preview">
            <div className="rs-console__bar">
              <span className="rs-console__dots" aria-hidden="true"><i /><i /><i /></span>
              <span>focus-room.exe</span>
              <span className="rs-console__live">{running ? 'running' : 'idle'}</span>
            </div>
            <div className="rs-console__screen">
              <span className="rs-console__mode">Pomodoro · 25m</span>
              <span className="rs-console__clock">{clock}</span>
              <div className="rs-console__chips">
                <button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }}>25m</button>
                <button type="button" onClick={() => { setRunning(false); setSeconds(50 * 60); }}>50m</button>
                <button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }}><Square size={11} /> Reset</button>
              </div>
            </div>
            <div className="rs-console__foot">
              <button type="button" className="rs-btn rs-btn--gold rs-btn--wide" onClick={() => setRunning(value => !value)}>
                {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start focus</>}
              </button>
              <p>Preview only. Your real desk keeps the history.</p>
            </div>
          </div>
        </section>

        <section className="rs-section" id="modes">
          <header className="rs-section__head">
            <p className="rs-kicker">01 — Timer</p>
            <h2>Three ways to sit down.</h2>
            <p>Some days want a stopwatch. Some want a cage match with a clock. Pick per session.</p>
          </header>
          <div className="rs-grid rs-grid--3">
            {MODES.map(mode => (
              <article className="rs-card" key={mode.n}>
                <span className="rs-card__n">{mode.n}</span>
                <h3>{mode.name}</h3>
                <p className="rs-card__line">{mode.line}</p>
                <p className="rs-card__detail">{mode.detail}</p>
                <span className="rs-sticker">{mode.tag}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rs-section" id="rooms">
          <header className="rs-section__head">
            <p className="rs-kicker">02 — Company</p>
            <h2>Silent company, all night.</h2>
            <p>Virtual reading halls where you see presence, never faces.</p>
          </header>
          <div className="rs-grid rs-grid--2">
            {ROOMS.map(room => (
              <article className="rs-room" key={room.name}>
                <div className="rs-room__top">
                  <h3>{room.name}</h3>
                  <span className="rs-sticker">{room.rhythm}</span>
                </div>
                <p className="rs-room__subject">{room.subject}</p>
                <div className="rs-meter" aria-label={`${room.filled} of ${room.seats} seats`}>
                  {Array.from({ length: room.seats }).map((_, i) => (
                    <i key={i} className={i < room.filled ? 'is-on' : ''} />
                  ))}
                </div>
                <div className="rs-room__foot">
                  <span><Users size={13} /> {room.filled} of {room.seats} seats</span>
                  <button type="button" className="rs-btn rs-btn--ghost rs-btn--sm" onClick={onOpenGroups}>
                    Join room <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rs-section" id="sound">
          <header className="rs-section__head">
            <p className="rs-kicker">03 — Sound</p>
            <h2>Drown out the room.</h2>
            <p>Four acoustic beds, generated live. Press one — it plays here, quietly, as proof.</p>
          </header>
          <div className="rs-grid rs-grid--4">
            {SOUNDS.map(item => (
              <button
                type="button"
                key={item.id}
                className={`rs-sound${sound === item.id ? ' is-playing' : ''}`}
                onClick={() => toggleSound(item.id)}
                aria-pressed={sound === item.id}
              >
                <span className="rs-sound__icon">
                  {sound === item.id ? <Volume2 size={16} /> : <Play size={16} />}
                </span>
                <span className="rs-sound__name">{item.name}</span>
                <span className="rs-sound__note">{item.note}</span>
                <span className="rs-wave" aria-hidden="true">
                  {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ height: `${6 + ((i * 7) % 16)}px` }} />)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rs-section" id="tracking">
          <div className="rs-split">
            <div className="rs-split__copy">
              <p className="rs-kicker">04 — Record</p>
              <h2>An honest ledger.</h2>
              <p>Every number here comes from a session you actually ran. No seed data, no invented streaks, no decorative graphs that mean nothing.</p>
              <ul className="rs-list">
                <li><Check size={15} /> Sessions saved locally first, synced only if you sign in.</li>
                <li><Check size={15} /> Subject tags, daily goal, weekly and monthly views.</li>
                <li><Check size={15} /> Exportable calendar, deletable history.</li>
              </ul>
            </div>
            <div className="rs-ledger">
              <div className="rs-ledger__row rs-ledger__row--head"><span>Today</span><span>Mode</span><span>Focus</span></div>
              <div className="rs-ledger__row"><span>This desk</span><span>Pomodoro</span><span>{todayFocusSeconds > 0 ? formatDurationHuman(todayFocusSeconds) : '—'}</span></div>
              <div className="rs-ledger__row rs-ledger__row--empty"><span>Your next session writes here</span><span /><span /></div>
              <p className="rs-ledger__note"><Clock3 size={13} /> Live value, read from this browser.</p>
            </div>
          </div>
        </section>

        <section className="rs-banner">
          <div>
            <p className="rs-kicker">Optional</p>
            <h2>Preparing for JEE?</h2>
            <p>90+ Physics, Chemistry and Maths chapters, mock percentile tracking and revision suggestions. Off by default; the desk stays quiet if you never enable it.</p>
          </div>
          <button type="button" className="rs-btn rs-btn--gold" onClick={onOpenAuth}>
            Open JEE workspace <ArrowRight size={16} />
          </button>
        </section>

        <section className="rs-section" id="pricing">
          <header className="rs-section__head">
            <p className="rs-kicker">05 — Price</p>
            <h2>Free is the product.</h2>
            <p>Plus exists for cosmetics and bigger groups. Nothing essential is behind it.</p>
          </header>
          <div className="rs-grid rs-grid--2 rs-price">
            <article className="rs-plan">
              <span className="rs-plan__tag">Always</span>
              <h3>Your study desk</h3>
              <p className="rs-plan__price">₹0<span>/ forever</span></p>
              <ul>
                <li><Check size={14} /> Pomodoro, countdown and stopwatch</li>
                <li><Check size={14} /> Tasks, subjects and calendar export</li>
                <li><Check size={14} /> Public study rooms</li>
                <li><Check size={14} /> Full history and analytics</li>
              </ul>
              <button type="button" className="rs-btn rs-btn--gold rs-btn--wide" onClick={() => onStartStudying()}>Open free desk</button>
            </article>

            <article className="rs-plan rs-plan--plus">
              <span className="rs-plan__tag">Supporter</span>
              <h3>Sanctra Plus+</h3>
              <p className="rs-plan__price">₹{plus.priceInINR}<span>/ {plus.periodLabel}</span></p>
              <ul>
                <li><Check size={14} /> Everything in the free desk</li>
                <li><Check size={14} /> AI study planning</li>
                <li><Check size={14} /> Private group invite codes</li>
                <li><Check size={14} /> Profile cosmetics and themes</li>
              </ul>
              <button type="button" className="rs-btn rs-btn--ghost rs-btn--wide" onClick={onOpenAuth}>Get Plus+</button>
            </article>
          </div>
        </section>

        <section className="rs-section" id="faq">
          <header className="rs-section__head">
            <p className="rs-kicker">06 — Answers</p>
            <h2>Questions, briefly.</h2>
          </header>
          <div className="rs-faq">
            {FAQ.map(item => (
              <details key={item.q} className="rs-faq__item">
                <summary>{item.q}<span aria-hidden="true">+</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rs-final">
          <Flame size={22} aria-hidden="true" />
          <h2>The desk is warm.</h2>
          <p>No forms between you and the first session.</p>
          <button type="button" className="rs-btn rs-btn--gold rs-btn--lg" onClick={() => onStartStudying()}>
            Start studying <BookOpen size={17} />
          </button>
        </section>
      </main>

      <footer className="rs-foot">
        <Brand compact />
        <nav aria-label="Footer">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <button type="button" onClick={onOpenAuth}>Sign in</button>
        </nav>
        <p>Built for long afternoons and longer nights.</p>
      </footer>
    </div>
  );
};

export default LandingView;
