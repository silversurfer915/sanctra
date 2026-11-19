import type { CSSProperties } from 'react';
import { Headphones, Play, Square, Users, ArrowUpRight } from 'lucide-react';
import { useSoundscape } from './SoundscapeContext.tsx';
import type { SoundscapeId } from '../utils/soundscapes.ts';

const QUICK_SOUNDS: { id: SoundscapeId; label: string }[] = [
  { id: 'rain', label: 'Rain' },
  { id: 'forest', label: 'Forest' },
  { id: 'brown', label: 'Brown noise' },
];

/** Focus audio as a rail card: current track, one-tap presets, library entry. */
export function FocusAudioCard() {
  const { isActive, selectedName, playing, play, stop, setOpen, busy, preferences } = useSoundscape();
  const next = (playing.currentId ?? preferences.activeSoundscape ?? 'rain') as SoundscapeId;

  return (
    <section className="rail-card" style={{ '--rail-hue': 'var(--sanctra-sage)' } as CSSProperties}>
      <header className="rail-head">
        <span className="rail-chip"><Headphones size={14} aria-hidden="true" /></span>
        <h3>Focus audio</h3>
      </header>
      <p className="rail-line">{isActive ? selectedName || 'Playing' : 'Nothing playing'}</p>
      <p className="rail-sub">Soundscapes loop with the timer</p>

      <div className="rail-player">
        <button
          type="button"
          className="rail-play"
          onClick={() => (isActive ? stop() : void play(next))}
          disabled={busy}
          aria-label={isActive ? 'Stop focus audio' : 'Play focus audio'}
        >
          {isActive ? <Square size={11} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
        </button>
        <div className="rail-chips">
          {QUICK_SOUNDS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`rail-chip-btn${playing.currentId === s.id && isActive ? ' is-on' : ''}`}
              onClick={() => void play(s.id)}
              disabled={busy}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="rail-link" onClick={() => setOpen((v) => !v)}>
        Open sound library
      </button>
    </section>
  );
}

/** Study rooms entry point for the rail. */
export function FocusRoomCard({ onOpenRooms }: { onOpenRooms: () => void }) {
  return (
    <section className="rail-card" style={{ '--rail-hue': 'var(--sanctra-sage)' } as CSSProperties}>
      <header className="rail-head">
        <span className="rail-chip"><Users size={14} aria-hidden="true" /></span>
        <h3>Study room</h3>
      </header>
      <p className="rail-line">Study beside other people</p>
      <p className="rail-sub">A shared clock, a member list, your own history</p>
      <button type="button" className="rail-link" onClick={onOpenRooms}>
        Open study rooms <ArrowUpRight size={13} aria-hidden="true" />
      </button>
    </section>
  );
}
