import './focus-audio-interface.css';
import {searchMusic,type MusicSearchResult} from '../utils/musicSearch.ts';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Headphones,
  Play,
  Pause,
  Square,
  X,
  Trash2,
  Plus,
  Volume2,
  CloudRain,
  Waves,
  Wind,
  Flame,
  Trees,
  Music,
  Search,
  Bookmark,
} from 'lucide-react';
import {
  SOUNDSCAPE_PRESETS,
  normalizeSoundscapeSettings,
  playSoundscape,
  stopSoundscape,
  setSoundscapeVolume,
  getSoundscapeState,
  subscribeSoundscapeState,
  type SoundscapeSettings,
  type SoundscapeId,
} from '../utils/soundscapes.ts';
import { createSavedSound, normalizeSoundLibrary, type SavedSound } from '../utils/soundLibrary.ts';
import { parseYouTubeUrl } from '../utils/youtubeHelper.ts';
import { mountYouTubeAudio, YouTubeAudioController, type YouTubeAudioState } from '../utils/youtubeAudio.ts';
import type { TimerStatus, UserSettings, UserSubscription } from '../types/index.ts';

const icons = {
  rain: CloudRain,
  'rain-heavy': CloudRain,
  ocean: Waves,
  river: Waves,
  forest: Trees,
  wind: Wind,
  fire: Flame,
  brown: Headphones,
  pink: Headphones,
  'zen-bowl': Music,
};

interface SoundscapeContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isActive: boolean;
  selectedName: string | undefined;
  custom: SavedSound | null;
  playing: { isPlaying: boolean; currentId: SoundscapeId | null };
  busy: boolean;
  error: string;
  preferences: SoundscapeSettings;
  library: SavedSound[];
  tab: 'library' | 'link' | 'saved';
  setTab: React.Dispatch<React.SetStateAction<'library' | 'link' | 'saved'>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  play: (id: SoundscapeId) => Promise<void>;
  stop: () => void;
  select: (id: SoundscapeId) => void;
  playCustom: (sound: SavedSound) => void;
  saveLink: () => void;
  updatePreferences: (value: Partial<SoundscapeSettings>) => void;
  update: (value: Partial<UserSettings>) => void;
}

const SoundscapeContext = createContext<SoundscapeContextValue | null>(null);

export function useSoundscape() {
  const ctx = useContext(SoundscapeContext);
  if (!ctx) {
    throw new Error('useSoundscape must be used within a SoundscapeProvider');
  }
  return ctx;
}

export interface SoundscapeProviderProps {
  children: React.ReactNode;
  userSettings?: UserSettings;
  onUpdateSettings?: (value: Partial<UserSettings>) => void;
  timerStatus?: TimerStatus;
  subscription?: UserSubscription | null;
  onOpenYouTube?: () => void;
  onOpenPlusEnquiry?: () => void;
}

export function SoundscapeProvider({
  children,
  userSettings,
  onUpdateSettings,
  timerStatus,
}: SoundscapeProviderProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'link' | 'saved'>('library');
  const [playing, setPlaying] = useState(getSoundscapeState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [search, setSearch] = useState('');
  const [results,setResults]=useState<MusicSearchResult[]>([]);
  const [searching,setSearching]=useState(false);
  const [searched,setSearched]=useState(false);
  const searchRequest=useRef<AbortController|null>(null);
  useEffect(()=>()=>searchRequest.current?.abort(),[]);
  const [custom, setCustom] = useState<SavedSound | null>(null);
  const [youtubeEnabled, setYoutubeEnabled] = useState(false);
  const [youtubeState, setYoutubeState] = useState<YouTubeAudioState>('idle');
  const youtubeContainer = useRef<HTMLDivElement>(null);
  const youtubeController = useRef<YouTubeAudioController | null>(null);
  const [local, setLocal] = useState<Partial<UserSettings>>({});

  const alive = useRef(true);
  const request = useRef(0);

  const preferences = normalizeSoundscapeSettings(
    (userSettings?.soundscapePreferences || local.soundscapePreferences || {}) as Partial<SoundscapeSettings>
  );
  const library = normalizeSoundLibrary(userSettings?.soundLibrary || local.soundLibrary);
  const preset = SOUNDSCAPE_PRESETS.find((p) => p.id === playing.currentId);
  const selectedName = custom?.title || preset?.name;
  const isActive = playing.isPlaying || youtubeState === 'playing';

  const update = (value: Partial<UserSettings>) => {
    setLocal((previous) => ({ ...previous, ...value }));
    onUpdateSettings?.(value);
  };

  const updatePreferences = (value: Partial<SoundscapeSettings>) =>
    update({ soundscapePreferences: { ...preferences, ...value } });

  const play = async (id: SoundscapeId) => {
    const token = ++request.current;
    youtubeController.current?.stop();
    setBusy(true);
    setError('');
    setCustom(null);
    try {
      await playSoundscape(id, preferences.volume);
    } catch (e) {
      if (alive.current && token === request.current) {
        setError(e instanceof Error ? e.message : 'Could not play this sound.');
      }
    } finally {
      if (alive.current && token === request.current) {
        setBusy(false);
      }
    }
  };

  const stop = () => {
    request.current++;
    youtubeController.current?.stop();
    setBusy(false);
    stopSoundscape(preferences.fadeOnEnd ? 0.6 : 0);
    setCustom(null);
  };

  const select = (id: SoundscapeId) => {
    updatePreferences({ activeSoundscape: id });
    if (playing.currentId === id) {
      stop();
      updatePreferences({ activeSoundscape: null });
    } else if (!preferences.playWithTimer || timerStatus === 'running') {
      void play(id);
    }
  };

  const playCustom = (sound: SavedSound) => {
    stop();
    updatePreferences({ activeSoundscape: null });
    setCustom(sound);
    setError('');
    const resource = parseYouTubeUrl(sound.url);
    if (resource) youtubeController.current?.select(resource);
  };

  const linked = () => createSavedSound(title.trim() || 'My focus audio', url, crypto.randomUUID());

  const saveLink = () => {
    try {
      if (library.length >= 25) {
        throw new Error('Your library holds up to 25 sounds. Remove one to add another.');
      }
      const sound = linked();
      update({ soundLibrary: [...library, sound] });
      setTitle('');
      setUrl('');
      setError('');
      setTab('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check your sound link.');
    }
  };

  useEffect(() => {
    alive.current = true;
    const unsubscribe = subscribeSoundscapeState(() => setPlaying(getSoundscapeState()));
    return () => {
      alive.current = false;
      request.current++;
      unsubscribe();
      stopSoundscape(0);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  useEffect(() => {
    if (!preferences.playWithTimer) return;
    if (timerStatus === 'running' && preferences.activeSoundscape) {
      void play(preferences.activeSoundscape);
    } else if (!custom) {
      stop();
    }
  }, [timerStatus, preferences.playWithTimer, preferences.activeSoundscape]);

  useEffect(() => {
    setSoundscapeVolume(preferences.volume);
    youtubeController.current?.setVolume(preferences.volume);
  }, [preferences.volume]);

  useEffect(() => { if (open) setYoutubeEnabled(true); }, [open]);

  useEffect(() => {
    if (!youtubeEnabled || !youtubeContainer.current || youtubeController.current) return;
    let cancelled = false;
    const controller = new YouTubeAudioController((state, message) => {
      if (cancelled) return;
      setYoutubeState(state);
      setBusy(state === 'loading');
      setError(message || '');
    });
    youtubeController.current = controller;
    controller.setVolume(preferences.volume);
    const selected = custom ? parseYouTubeUrl(custom.url) : null;
    if (selected) controller.select(selected);
    void mountYouTubeAudio(youtubeContainer.current, controller, () => cancelled).catch(() => {
      if (!cancelled) { controller.failed(); setYoutubeEnabled(false); }
    });
    // Keep the prepared player alive when the modal closes.
    return () => { cancelled = true; controller.destroy(); youtubeController.current = null; };
  }, [youtubeEnabled]);


  const value: SoundscapeContextValue = {
    open,
    setOpen,
    isActive,
    selectedName,
    custom,
    playing,
    busy,
    error,
    preferences,
    library,
    tab,
    setTab,
    title,
    setTitle,
    url,
    setUrl,
    search,
    setSearch,
    play,
    stop,
    select,
    playCustom,
    saveLink,
    updatePreferences,
    update,
  };

  return (
    <SoundscapeContext.Provider value={value}>
      {children}

      {/* Focus Audio Modal Layer Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {open && (
              <div
                className="sanctra-app focus-audio-layer"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setOpen(false);
                }}
              >
                <section role="dialog" aria-modal="true" aria-label="Focus audio" className="soundscape-panel focus-audio-panel">
                  <header>
                    <div>

                      <h2>
                        <Headphones size={22} /> Focus audio
                      </h2>
                      <p className="workspace-footnote">
                        {selectedName
                          ? `${selectedName} · keeps playing when you close this panel`
                          : 'A little sound. A little more room to focus.'}
                      </p>
                    </div>
                    <button className="analytics-button" aria-label="Close focus audio" onClick={() => setOpen(false)}>
                      <X size={17} />
                    </button>
                  </header>

                  <div className="workspace-tabs audio-tabs">
                    <button aria-pressed={tab === 'library'} onClick={() => setTab('library')}>
                      <Music size={16} /> Soundscapes
                    </button>
                    <button aria-pressed={tab === 'link'} onClick={() => setTab('link')}>
                      <Search size={16} /> Search &amp; link
                    </button>
                    <button aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>
                      <Bookmark size={16} /> Saved · {library.length}
                    </button>
                  </div>

                  {error && <p role="alert" className="workspace-note">{error}</p>}

                  <div className="audio-panel-content">
                    {tab === 'library' ? (
                      <>
                        <p className="workspace-footnote">Nature recordings, noise, and gentle tones. Audio downloads when first played.</p>
                        <div className="audio-card-grid">
                          {SOUNDSCAPE_PRESETS.map((p) => {
                            const Icon = icons[p.id];
                            return (
                              <button
                                className="audio-sound-card"
                                key={p.id}
                                aria-pressed={playing.currentId === p.id}
                                disabled={busy}
                                onClick={() => select(p.id)}
                              >
                                <span className="audio-icon">
                                  <Icon size={24} />
                                </span>
                                <strong>{p.name}</strong>
                                <small>{p.description}</small>
                                <span className="audio-card-action">
                                  {playing.currentId === p.id ? <Square size={14} /> : <Play size={14} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : tab === 'link' ? (
                      <div className="space-y-5">
                        <form
                          className="audio-search-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if(!search.trim())return;
                            searchRequest.current?.abort();const controller=new AbortController();searchRequest.current=controller;
                            setSearching(true);setError('');setSearched(false);setResults([]);
                            void searchMusic(search,controller.signal).then(v=>{if(!controller.signal.aborted){setResults(v);setSearched(true);}}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to search music.');}).finally(()=>{if(!controller.signal.aborted)setSearching(false);});
                          }}
                        >
                          <label>
                            Find your focus music
                            <input
                              className="inbox-input"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Lofi, piano, rain, café ambience…"
                            />
                          </label>
                          <button className="analytics-button" disabled={!search.trim()||searching}>
                            <Search size={16} /> {searching?'Searching…':'Search'}
                          </button>
                        </form>
                        <div className="audio-search-results" aria-live="polite">{searched&&!results.length&&<p>No matching music. Try a different title or artist.</p>}{results.map(result=><article key={result.id}><img src={result.thumbnail} alt="" loading="lazy"/><div><strong>{result.title}</strong><small>{result.channel}</small></div><button type="button" aria-label={`Play ${result.title}`} onClick={()=>playCustom(createSavedSound(result.title.slice(0,80),result.url,crypto.randomUUID()))}><Play size={18}/></button><button type="button" aria-label={`Save ${result.title}`} disabled={library.some(s=>s.url===result.url)} onClick={()=>{if(library.length>=25){setError('Your library holds 25 sounds. Remove one before saving another.');return;}update({soundLibrary:[...library,createSavedSound(result.title.slice(0,80),result.url,crypto.randomUUID())]});}}><Bookmark size={18}/></button></article>)}</div><p className="workspace-footnote">Search, play and save here. Or paste a video or playlist link below.</p>
                        <form
                          className="soundscape-save-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            saveLink();
                          }}
                        >
                          <label>
                            Name
                            <input
                              maxLength={80}
                              className="inbox-input"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="My evening playlist"
                            />
                          </label>
                          <label>
                            YouTube link
                            <input
                              required
                              className="inbox-input"
                              value={url}
                              onChange={(e) => setUrl(e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=…"
                            />
                          </label>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="analytics-button"
                              disabled={!url.trim()}
                              onClick={() => {
                                try {
                                  playCustom(linked());
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Check your link.');
                                }
                              }}
                            >
                              <Play size={16} /> Play now
                            </button>
                            <button className="workspace-primary" disabled={!url.trim()}>
                              <Plus size={16} /> Save sound
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : library.length ? (
                      <div className="audio-saved-list">
                        {library.map((sound) => (
                          <article key={sound.id}>
                            <button className="audio-saved-play" onClick={() => playCustom(sound)}>
                              <span className="audio-icon">
                                <Music size={21} />
                              </span>
                              <span>
                                <strong>{sound.title}</strong>
                                <small>{custom?.id === sound.id ? (youtubeState === 'playing' ? 'Playing now' : youtubeState === 'loading' ? 'Connecting…' : 'Tap Play to listen') : 'YouTube audio'}</small>
                              </span>
                              <Play size={17} />
                            </button>
                            <button
                              className="analytics-button"
                              aria-label={`Remove ${sound.title}`}
                              onClick={() => update({ soundLibrary: library.filter((s) => s.id !== sound.id) })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="audio-empty">
                        <Headphones size={36} />
                        <h3>Your listening library starts here.</h3>
                        <p>Save the sounds you return to. They'll stay with your account across devices.</p>
                        <button className="analytics-button" onClick={() => setTab('link')}>
                          <Search size={16} /> Find or add a sound
                        </button>
                      </div>
                    )}
                  </div>

                  <footer className="audio-footer">
                    {custom && <div className="audio-options" aria-live="polite">
                      <span className="workspace-footnote">{custom.title} · {youtubeState === 'playing' ? 'Playing' : youtubeState === 'loading' ? 'Connecting…' : youtubeState === 'error' ? 'Unavailable' : youtubeState === 'blocked' ? 'Tap Play' : 'Paused'}</span>
                      <button type="button" className="analytics-button" disabled={youtubeState === 'loading'} onClick={() => {
                        if (youtubeState === 'playing') youtubeController.current?.pause();
                        else youtubeController.current?.resume();
                      }}>
                        {youtubeState === 'playing' ? <Pause size={15} /> : <Play size={15} />}
                        {youtubeState === 'playing' ? 'Pause' : 'Play'}
                      </button>
                    </div>}

                    <label className="soundscape-volume">
                      <span>
                        <Volume2 size={15} /> Ambience · {Math.round(preferences.volume * 100)}%
                      </span>
                      <input
                        aria-label="Soundscape volume"
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        value={preferences.volume}
                        onChange={(e) => {
                          setSoundscapeVolume(Number(e.target.value));
                          updatePreferences({ volume: Number(e.target.value) });
                        }}
                      />
                    </label>
                    <div className="audio-options">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={preferences.playWithTimer}
                          onChange={(e) => updatePreferences({ playWithTimer: e.target.checked })}
                        />
                        Sync ambience with timer
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={preferences.fadeOnEnd}
                          onChange={(e) => updatePreferences({ fadeOnEnd: e.target.checked })}
                        />
                        Gentle fade
                      </label>
                      {(playing.isPlaying || custom) && (
                        <button className="analytics-button" onClick={stop}>
                          <Square size={15} /> Stop
                        </button>
                      )}
                    </div>
                    {preferences.playWithTimer && timerStatus !== 'running' && preferences.activeSoundscape && (
                      <p className="workspace-footnote">Your selected ambience will start with the timer.</p>
                    )}
                  </footer>
                </section>
              </div>
            )}

            {/* A single prepared API player stays outside the interface. */}
            <div ref={youtubeContainer} className="audio-youtube-hidden" aria-hidden="true" />

          </>,
          (document.getElementById('sanctra-root') || document.body)
        )}
    </SoundscapeContext.Provider>
  );
}

/**
 * Inline Header Audio Control:
 * Positioned on the right side of the main Header.
 * Icon-only controls; the current track remains available in the panel and tooltip.
 */
export function SoundscapeHeaderControl() {
  const { isActive, selectedName, open, setOpen, stop } = useSoundscape();
  return (
    <div className={`audio-header-control audio-compact-controls${isActive && !open ? ' audio-header-active' : ''}`}>
      <button type="button" className="app-header-control audio-header-btn"
        aria-label={isActive ? `${selectedName} playing — open focus audio` : 'Open focus audio'}
        aria-expanded={open} title={isActive ? selectedName : 'Focus audio'}
        onClick={() => setOpen(v => !v)}>
        <Headphones size={17} className={`audio-headphone-icon${isActive ? ' is-playing' : ''}`} aria-hidden="true" />
      </button>
      {isActive && !open && <button type="button" className="audio-header-stop" aria-label="Stop audio" title="Stop audio" onClick={stop}><Square size={12} aria-hidden="true"/></button>}
    </div>
  );
}

/**
 * Compact corner audio controls for timer-only mode.
 */
export function CenteredHiddenMusicBar() {
  const { isActive, selectedName, setOpen, stop } = useSoundscape();

  return (
    <aside
      className={`centered-hidden-music-bar audio-compact-controls glass-pill ${isActive ? 'active' : 'idle'}`}
      aria-label="Focus audio control"
    >
      <button
        type="button"
        className="centered-hidden-music-info"
        onClick={() => setOpen((v) => !v)}
        aria-label={isActive ? `Focus audio: ${selectedName}` : 'Open focus audio'}
        title={isActive ? `Now playing: ${selectedName} — Click to toggle focus audio` : 'Open focus audio'}
      >
        <div className="centered-hidden-icon-wrap">
          <Headphones size={15} className={`centered-hidden-icon audio-headphone-icon${isActive ? ' is-playing' : ''}`} aria-hidden="true" />
          </div>


      </button>

      {isActive && (
        <button
          type="button"
          className="centered-hidden-stop"
          onClick={(e) => {
            e.stopPropagation();
            stop();
          }}
          aria-label="Stop audio"
          title="Stop focus audio"
        >
          <Square size={12} />
        </button>
      )}
    </aside>
  );
}
