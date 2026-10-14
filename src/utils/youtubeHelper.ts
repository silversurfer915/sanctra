/**
 * Sanitized YouTube player helper
 * Uses YouTube Privacy-Enhanced Mode (youtube-nocookie.com)
 */

export interface YouTubeResource {
  type: 'video' | 'playlist';
  id: string;
  embedUrl: string;
}

export function parseYouTubeUrl(input: string): YouTubeResource | null {
  if (!input || !input.trim()) return null;
  const raw = input.trim();

  // If user pasted a clean 11-char video ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return {
      type: 'video',
      id: raw,
      embedUrl: `https://www.youtube-nocookie.com/embed/${raw}?autoplay=0&rel=0&playsinline=1&controls=1`,
    };
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || !['youtube.com','m.youtube.com','music.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)) return null;

    // Playlist check
    const listId = url.searchParams.get('list');
    if (listId && /^[a-zA-Z0-9_-]{10,60}$/.test(listId)) {
      return {
        type: 'playlist',
        id: listId,
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=0&rel=0&playsinline=1&controls=1`,
      };
    }

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const vid = url.pathname.slice(1).split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        return {
          type: 'video',
          id: vid,
          embedUrl: `https://www.youtube-nocookie.com/embed/${vid}?autoplay=0&rel=0&playsinline=1&controls=1`,
        };
      }
    }

    // youtube.com/watch?v=VIDEO_ID
    if (['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host)) {
      const vid = url.searchParams.get('v');
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        return {
          type: 'video',
          id: vid,
          embedUrl: `https://www.youtube-nocookie.com/embed/${vid}?autoplay=0&rel=0&playsinline=1&controls=1`,
        };
      }

      // /embed/VIDEO_ID or /live/VIDEO_ID
      const parts = url.pathname.split('/');
      const last = parts[parts.length - 1];
      if (['embed','live','shorts'].includes(parts[1]) && /^[a-zA-Z0-9_-]{11}$/.test(last)) {
        return {
          type: 'video',
          id: last,
          embedUrl: `https://www.youtube-nocookie.com/embed/${last}?autoplay=0&rel=0&playsinline=1&controls=1`,
        };
      }
    }
  } catch {
    // invalid URL format
  }

  return null;
}

export const POPULAR_STUDY_STREAMS = [
  {
    title: 'Lofi Girl · Beats to Relax/Study to',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    title: 'Peaceful Piano Focus',
    url: 'https://www.youtube.com/watch?v=WPni755-Krg',
  },
  {
    title: 'Ambient Library Ambience',
    url: 'https://www.youtube.com/watch?v=4vIQON2fDWM',
  },
];
