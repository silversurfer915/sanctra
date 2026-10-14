// Scenery can suggest a pastel accent; it never recolors the reading surfaces.
export const THEME_PALETTES = {
  sage: { ink: '#17181d', surface: '#292b33', accent: '#bdd7c9', muted: '#c7c7cf' },
  sand: { ink: '#17181d', surface: '#292b33', accent: '#e8c7ad', muted: '#c7c7cf' },
  blue: { ink: '#17181d', surface: '#292b33', accent: '#b8d4ea', muted: '#c7c7cf' },
  lavender: { ink: '#17181d', surface: '#292b33', accent: '#d0c2eb', muted: '#c7c7cf' },
  rose: { ink: '#17181d', surface: '#292b33', accent: '#e6bdce', muted: '#c7c7cf' },
  charcoal: { ink: '#17181d', surface: '#292b33', accent: '#d0c8e4', muted: '#c7c7cf' },
};
export type ThemeName = keyof typeof THEME_PALETTES;

export const PRESET_THEME_MAP: Record<string, ThemeName> = {
  'wp-video-lofi-meadow': 'blue',
  'wp-abstract-sage': 'sage',
  'wp-abstract-warm': 'sand',
  'wp-theme-sage': 'sage',
  'wp-theme-sand': 'sand',
  'wp-theme-blue': 'blue',
  'wp-theme-lavender': 'lavender',
  'wp-theme-rose': 'rose',
  'wp-theme-charcoal': 'charcoal',
  'wp-plus-abstract-cirrus': 'blue',
  'wp-plus-abstract-dove': 'blue',
  'wp-plus-abstract-ripple': 'blue',
  'wp-plus-abstract-sonar': 'blue',
  'wp-plus-scenic-capri-summer': 'blue',
  'wp-plus-scenic-coastal-breeze': 'blue',
  'wp-plus-scenic-golden-gate-fog': 'blue',
  'wp-plus-scenic-lake-como-path': 'blue',
  'wp-plus-scenic-winter-cabin': 'blue',
  'wp-plus-abstract-crt': 'lavender',
  'wp-plus-abstract-lavender': 'lavender',
  'wp-plus-abstract-prism': 'lavender',
  'wp-plus-abstract-rainbow-road': 'lavender',
  'wp-plus-scenic-cotton-candy-sky': 'lavender',
  'wp-plus-scenic-dune-night': 'lavender',
  'wp-plus-scenic-fuji-convenience': 'lavender',
  'wp-plus-scenic-lavender-field': 'lavender',
  'wp-plus-scenic-lofi-clouds': 'lavender',
  'wp-plus-scenic-outer-space': 'lavender',
  'wp-plus-scenic-sakura-street': 'lavender',
  'wp-plus-scenic-western-town': 'lavender',
  'wp-plus-abstract-fleur': 'rose',
  'wp-plus-abstract-pink-ripple': 'rose',
  'wp-plus-abstract-pink-silk': 'rose',
  'wp-plus-scenic-autumn-gazebo-park': 'rose',
  'wp-plus-scenic-beach-sunset': 'rose',
  'wp-plus-scenic-dusk-peak': 'rose',
  'wp-plus-scenic-morning-sakura': 'rose',
  'wp-plus-scenic-tuscan-village': 'rose',
  'wp-plus-abstract-sunburst': 'sand',
  'wp-plus-scenic-dune-sunrise': 'sand',
  'wp-plus-scenic-fall-central-park': 'sand',
  'wp-plus-scenic-minimalist-desert': 'sand',
  'wp-plus-scenic-austrian-alps': 'sage',
  'wp-plus-scenic-superbloom': 'sage',
  'wp-plus-scenic-tropical-river': 'sage',
  'wp-weather-rain': 'blue',
  'wp-weather-mist': 'sage',
  'wp-weather-lake': 'blue',
  'wp-video-rain-still': 'blue',
  'wp-art-forest': 'sage',
  'wp-art-rain': 'blue',
  'wp-art-lavender-lake': 'lavender',
  'wp-art-sand-nook': 'sand',
  'wp-art-rose-terrace': 'rose',
  'wp-art-charcoal-library': 'charcoal',
  'wp-video-rain': 'blue',
  'wp-video-ocean': 'blue',
  'wp-plus-observatory':'blue',
  'wp-plus-kyoto':'sage',
  'wp-plus-aurora-spire':'sage',
  'wp-plus-grand-archive':'sage',
  'wp-plus-solarium':'sage',
  'wp-motion-nebula':'blue',
  'wp-motion-rain':'sage',
  'wp-motion-aurora':'blue',
  'wp-motion-embers':'sand',
  'wp-motion-sakura':'sage',
  'wp-plus-haven': 'lavender',
  'wp-plus-library': 'sand',
  'wp-plus-rainy-lake': 'blue',
  'wp-grad-pine': 'sage',
  'wp-grad-zen': 'sage',
  'wp-grad-amber': 'sand',
  'wp-grad-aurora': 'blue',
  'wp-grad-twilight': 'lavender',
  'wp-grad-obsidian': 'charcoal',
  'wp-sanctra-nordic': 'sage',
  'wp-sanctra-rain': 'blue',
  'wp-sanctra-library': 'sand',
  'wp-sanctra-zen': 'sage',
  'wp-sanctra-dawn': 'lavender',
  'wp-sanctra-solitude': 'charcoal',
};

export function getThemeName(id: string): ThemeName {
  if (PRESET_THEME_MAP[id]) return PRESET_THEME_MAP[id];
  const lower = id.toLowerCase();
  if (lower.includes('haven') || lower.includes('observatory') || lower.includes('nebula')) return 'lavender';
  if (lower.includes('lavender') || lower.includes('twilight')) return 'lavender';
  if (lower.includes('rose') || lower.includes('sakura')) return 'rose';
  if (lower.includes('charcoal') || lower.includes('solitude') || lower.includes('obsidian') || lower.includes('archive')) return 'charcoal';
  if (lower.includes('blue') || lower.includes('rain') || lower.includes('aurora') || lower.includes('lakeside')) return 'blue';
  if (lower.includes('warm') || lower.includes('sand') || lower.includes('dawn') || lower.includes('library') || lower.includes('amber') || lower.includes('embers')) return 'sand';
  if (lower.includes('sage') || lower.includes('forest') || lower.includes('pine') || lower.includes('zen') || lower.includes('kyoto') || lower.includes('solarium')) return 'sage';
  return 'blue';
}

// Landing scenery is independent of an account's private wallpaper preference.
export const DEFAULT_LANDING_WALLPAPER = 'wp-video-ocean';
export function getLandingWallpaperId(): string {
  try { return localStorage.getItem('sanctra_landing_atmosphere') === 'Evening Stillness' ? 'wp-art-forest' : DEFAULT_LANDING_WALLPAPER; } catch { return DEFAULT_LANDING_WALLPAPER; }
}
