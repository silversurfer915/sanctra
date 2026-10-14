import type { YouTubeResource } from './youtubeHelper.ts';

export type YouTubeAudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';
export interface YouTubeAudioPlayer {
  loadVideoById(id: string): void;
  loadPlaylist(options: { list: string; listType: 'playlist' }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  setVolume(volume: number): void;
  destroy(): void;
}
interface PlayerEvent { target: YouTubeAudioPlayer; data: number }
interface YouTubeAPI {
  Player: new (element: HTMLElement, options: {
    width: number; height: number; host: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent): void;
      onError(event: PlayerEvent): void;
      onAutoplayBlocked(): void;
    };
  }) => YouTubeAudioPlayer;
}
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeAPI> | null = null;

export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  const target = window as YouTubeWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = target.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timer);
      apiPromise = null;
      target.onYouTubeIframeAPIReady = previous;
      script.remove();
      reject(new Error('YouTube could not connect. Reopen Focus audio to retry.'));
    };
    const script = document.createElement('script');
    target.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      previous?.();
      if (target.YT?.Player) resolve(target.YT);
      else fail();
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** One prepared player, reused across selections and panel opens. */
export class YouTubeAudioController {
  private player: YouTubeAudioPlayer | null = null;
  private selected: YouTubeResource | null = null;
  private volume = 50;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private notify: (state: YouTubeAudioState, message?: string) => void;
  constructor(notify: (state: YouTubeAudioState, message?: string) => void) { this.notify = notify; }
  private clearWatchdog() { clearTimeout(this.watchdog); }
  private waitForPlayback() {
    this.clearWatchdog();
    this.notify('loading');
    this.watchdog = setTimeout(() => this.blocked(), 10000);
  }
  private load() {
    if (!this.player || !this.selected) return;
    this.waitForPlayback();
    this.player.setVolume(this.volume);
    if (this.selected.type === 'playlist') this.player.loadPlaylist({ list: this.selected.id, listType: 'playlist' });
    else this.player.loadVideoById(this.selected.id);
  }
  ready(player: YouTubeAudioPlayer) {
    if (this.disposed) { player.destroy(); return; }
    this.player = player;
    player.setVolume(this.volume);
    this.load();
  }
  select(resource: YouTubeResource) {
    this.selected = resource;
    this.waitForPlayback();
    this.load();
  }
  resume() {
    if (!this.selected) return;
    this.waitForPlayback();
    // Called directly by our Play button, keeping the browser's user gesture.
    this.player?.playVideo();
  }
  pause() { this.clearWatchdog(); this.player?.pauseVideo(); this.notify('paused'); }
  stop() {
    this.clearWatchdog();
    this.selected = null;
    this.player?.stopVideo();
    this.notify('idle');
  }
  setVolume(volume: number) {
    this.volume = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    this.player?.setVolume(this.volume);
  }
  stateChanged(state: number) {
    if (!this.selected || this.disposed) return;
    if (state === 1) { this.clearWatchdog(); this.notify('playing'); }
    else if (state === 2 || state === 0) { this.clearWatchdog(); this.notify('paused'); }
    else if (state === 3) this.waitForPlayback();
  }
  blocked() {
    if (!this.selected || this.disposed) return;
    this.clearWatchdog();
    this.notify('blocked', 'Tap Play to start YouTube audio.');
  }
  failed(code?: number) {
    if (this.disposed) return;
    this.clearWatchdog();
    this.notify('error', code === 101 || code === 150
      ? 'This video does not allow playback in other apps. Choose another link.'
      : 'YouTube could not play this link. Check your connection or try another video.');
  }
  destroy() { this.disposed = true; this.clearWatchdog(); this.player?.destroy(); this.player = null; }
}

export async function mountYouTubeAudio(container: HTMLElement, controller: YouTubeAudioController, cancelled: () => boolean) {
  const api = await loadYouTubeAPI();
  if (cancelled()) return;
  const element = document.createElement('div');
  container.replaceChildren(element);
  new api.Player(element, {
    width: 200, height: 200, host: 'https://www.youtube-nocookie.com',
    playerVars: { autoplay: 0, controls: 0, playsinline: 1, disablekb: 1, fs: 0, rel: 0, origin: window.location.origin },
    events: {
      onReady: event => {
        if (cancelled()) { event.target.destroy(); return; }
        controller.ready(event.target);
        const frame = container.querySelector('iframe');
        if (frame) {
          frame.title = 'Focus audio playback';
          frame.tabIndex = -1;
          frame.setAttribute('aria-hidden', 'true');
          frame.setAttribute('allow', 'autoplay; encrypted-media');
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
        }
      },
      onStateChange: event => controller.stateChanged(event.data),
      onError: event => controller.failed(event.data),
      onAutoplayBlocked: () => controller.blocked(),
    },
  });
}
