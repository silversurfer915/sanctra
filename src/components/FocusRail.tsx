import { Headphones, Play, Square, SkipBack, SkipForward, Volume2, ListMusic } from 'lucide-react';
import { useSoundscape } from './SoundscapeContext.tsx';
import type { SoundscapeId } from '../utils/soundscapes.ts';

/**
 * Horizontal focus-audio bar: track, prev/next, play, volume, library.
 * Prev/next walk the saved library, wrapping at both ends.
 */
export function FocusAudioBar() {
  const { isActive, selectedName, playing, play, stop, setOpen, busy, preferences, updatePreferences, library } =
    useSoundscape();

  const ids = library.map((s) => s.id).filter(Boolean) as SoundscapeId[];
  const current = (playing.currentId as SoundscapeId | null) ?? null;
  const index = current ? ids.indexOf(current) : -1;
  const step = (delta: number) => {
    if (!ids.length || busy) return;
    const nextIndex = index < 0 ? 0 : (index + delta + ids.length) % ids.length;
    void play(ids[nextIndex]);
  };

  return (
    <div className="audio-bar">
      <div className="audio-lead">
        <span className="audio-art"><Headphones size={15} aria-hidden="true" /></span>
        <span className="audio-meta">
          <b>{isActive ? selectedName || 'Playing' : 'Focus audio'}</b>
          <small>{isActive ? 'Soundscape' : 'Pick a soundscape'}</small>
        </span>
      </div>

      <div className="audio-controls">
        <button type="button" onClick={() => step(-1)} disabled={!ids.length || busy} aria-label="Previous sound">
          <SkipBack size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="audio-play"
          onClick={() => (isActive ? stop() : void play(current ?? ids[0] ?? 'rain'))}
          disabled={busy}
          aria-label={isActive ? 'Stop audio' : 'Play audio'}
        >
          {isActive ? <Square size={11} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => step(1)} disabled={!ids.length || busy} aria-label="Next sound">
          <SkipForward size={14} aria-hidden="true" />
        </button>
      </div>

      <label className="audio-vol">
        <Volume2 size={14} aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={preferences.volume}
          aria-label="Focus audio volume"
          onChange={(e) => updatePreferences({ volume: Number(e.target.value) })}
        />
      </label>

      <button type="button" className="audio-open" onClick={() => setOpen((v) => !v)} aria-label="Open sound library">
        <ListMusic size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
