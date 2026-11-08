import type { WallpaperPreset, ThemeId } from '../types/index.ts';

export type { ThemeId };

export interface ThemeSemanticColors {
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemePreset {
  id: ThemeId;
  name: string;
  tagline: string;
  category: string;
  // Accent family with accessible states
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentWash: string;
  // Dial colors & SVG ring tokens
  gradientStops: [string, string, string]; // [start, mid, end]
  ringGlow: string; // drop-shadow filter
  ambientCoreGlow: string; // radial gradient for dial lens plate
  beadColor: string;
  beadStroke: string;
  // Tactile button tokens (21st.dev & uiverse inspiration)
  buttonBg: string;
  buttonText: string;
  buttonGlow: string;
  buttonRing: string;
  // Glassmorphic surfaces & card borders
  canvas: string;
  surface: string;
  surfaceRaised: string;
  cardBorderHover: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  // Shared semantic colors (never recolored into theme accent)
  semantic: ThemeSemanticColors;
  // Coordinated scenes
  defaultSceneId: string;
  curatedSceneIds: string[];
  // Typography tokens
  fontDisplay: string;
  fontTimer: string;
  fontBody: string;
}

export const SHARED_SEMANTIC_COLORS: ThemeSemanticColors = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  'nocturne-gold': {
    id: 'nocturne-gold',
    name: 'Nocturne Amber',
    tagline: 'Candlelight & Obsidian Horology',
    category: 'Signature Noir',
    accent: '#e5b869',
    accentHover: '#ebd085',
    accentSoft: '#f5d794',
    accentWash: 'rgba(229, 184, 105, 0.16)',
    gradientStops: ['#fff2cc', '#e5b869', '#b88628'],
    ringGlow: 'drop-shadow(0 0 20px rgba(229, 184, 105, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(229, 184, 105, 0.14) 0%, rgba(20, 24, 34, 0.08) 50%, transparent 75%)',
    beadColor: '#fffdf8',
    beadStroke: '#e5b869',
    buttonBg: '#e5b869',
    buttonText: '#12151b',
    buttonGlow: '0 4px 24px rgba(229, 184, 105, 0.45)',
    buttonRing: 'rgba(229, 184, 105, 0.6)',
    canvas: '#0b0d11',
    surface: '#12151b',
    surfaceRaised: '#181c24',
    cardBorderHover: 'rgba(229, 184, 105, 0.35)',
    text: '#f5f2eb',
    textMuted: '#a3a8b4',
    border: 'rgba(229, 184, 105, 0.12)',
    borderStrong: 'rgba(229, 184, 105, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-sanctra-noir',
    curatedSceneIds: [
      'wp-sanctra-noir',
      'wp-art-charcoal-library',
      'wp-art-rain',
      'wp-art-forest',
    ],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'cyber-cyan': {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    tagline: 'Neon Rain & Electric Flow',
    category: 'Futuristic',
    accent: '#38bdf8',
    accentHover: '#00f2fe',
    accentSoft: '#7dd3fc',
    accentWash: 'rgba(56, 189, 248, 0.18)',
    gradientStops: ['#e0f2fe', '#38bdf8', '#0284c7'],
    ringGlow: 'drop-shadow(0 0 24px rgba(56, 189, 248, 0.6))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(10, 24, 40, 0.08) 50%, transparent 75%)',
    beadColor: '#f0f9ff',
    beadStroke: '#38bdf8',
    buttonBg: '#38bdf8',
    buttonText: '#051829',
    buttonGlow: '0 4px 26px rgba(56, 189, 248, 0.5)',
    buttonRing: 'rgba(56, 189, 248, 0.6)',
    canvas: '#060d14',
    surface: '#0b1622',
    surfaceRaised: '#112030',
    cardBorderHover: 'rgba(56, 189, 248, 0.35)',
    text: '#e6f4f9',
    textMuted: '#94a9be',
    border: 'rgba(56, 189, 248, 0.12)',
    borderStrong: 'rgba(56, 189, 248, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: [
      'wp-art-rain',
      'wp-motion-aurora',
      'wp-video-ocean',
      'wp-sanctra-noir',
    ],
    fontDisplay: 'Manrope, Inter, system-ui, sans-serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'sakura-dusk': {
    id: 'sakura-dusk',
    name: 'Sakura Dusk',
    tagline: 'Twilight Mauve & Petal Glow',
    category: 'Serene Zen',
    accent: '#f472b6',
    accentHover: '#fb7185',
    accentSoft: '#fbcfe8',
    accentWash: 'rgba(244, 114, 182, 0.18)',
    gradientStops: ['#fdf2f8', '#f472b6', '#be185d'],
    ringGlow: 'drop-shadow(0 0 22px rgba(244, 114, 182, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(244, 114, 182, 0.14) 0%, rgba(28, 12, 22, 0.08) 50%, transparent 75%)',
    beadColor: '#fff1f2',
    beadStroke: '#f472b6',
    buttonBg: '#f472b6',
    buttonText: '#1f0a17',
    buttonGlow: '0 4px 24px rgba(244, 114, 182, 0.45)',
    buttonRing: 'rgba(244, 114, 182, 0.6)',
    canvas: '#0f070d',
    surface: '#190f17',
    surfaceRaised: '#241521',
    cardBorderHover: 'rgba(244, 114, 182, 0.35)',
    text: '#faecf2',
    textMuted: '#bda1ae',
    border: 'rgba(244, 114, 182, 0.12)',
    borderStrong: 'rgba(244, 114, 182, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rose-terrace',
    curatedSceneIds: [
      'wp-art-rose-terrace',
      'wp-motion-sakura',
      'wp-art-lavender-lake',
      'wp-plus-kyoto',
    ],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'emerald-solarium': {
    id: 'emerald-solarium',
    name: 'Emerald Solarium',
    tagline: 'Rainforest Canopy & Jade Zen',
    category: 'Botanical',
    accent: '#34d399',
    accentHover: '#6ee7b7',
    accentSoft: '#a7f3d0',
    accentWash: 'rgba(52, 211, 153, 0.18)',
    gradientStops: ['#ecfdf5', '#34d399', '#047857'],
    ringGlow: 'drop-shadow(0 0 22px rgba(52, 211, 153, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(52, 211, 153, 0.14) 0%, rgba(8, 28, 18, 0.08) 50%, transparent 75%)',
    beadColor: '#f0fdf4',
    beadStroke: '#34d399',
    buttonBg: '#34d399',
    buttonText: '#052014',
    buttonGlow: '0 4px 24px rgba(52, 211, 153, 0.45)',
    buttonRing: 'rgba(52, 211, 153, 0.6)',
    canvas: '#06100a',
    surface: '#0b1c12',
    surfaceRaised: '#12291b',
    cardBorderHover: 'rgba(52, 211, 153, 0.35)',
    text: '#e8f7ee',
    textMuted: '#96b8a3',
    border: 'rgba(52, 211, 153, 0.12)',
    borderStrong: 'rgba(52, 211, 153, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-forest',
    curatedSceneIds: [
      'wp-art-forest',
      'wp-plus-solarium',
      'wp-motion-rain',
      'wp-art-rain',
    ],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'starlight-violet': {
    id: 'starlight-violet',
    name: 'Starlight Violet',
    tagline: 'Cosmic Nebula & Violet Clarity',
    category: 'Celestial',
    accent: '#c084fc',
    accentHover: '#d8b4fe',
    accentSoft: '#e9d5ff',
    accentWash: 'rgba(192, 132, 252, 0.18)',
    gradientStops: ['#faf5ff', '#c084fc', '#7e22ce'],
    ringGlow: 'drop-shadow(0 0 24px rgba(192, 132, 252, 0.6))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(192, 132, 252, 0.15) 0%, rgba(22, 10, 36, 0.08) 50%, transparent 75%)',
    beadColor: '#faf5ff',
    beadStroke: '#c084fc',
    buttonBg: '#c084fc',
    buttonText: '#130924',
    buttonGlow: '0 4px 26px rgba(192, 132, 252, 0.5)',
    buttonRing: 'rgba(192, 132, 252, 0.6)',
    canvas: '#090610',
    surface: '#130e20',
    surfaceRaised: '#1c1430',
    cardBorderHover: 'rgba(192, 132, 252, 0.35)',
    text: '#f3eef8',
    textMuted: '#b2a5c4',
    border: 'rgba(192, 132, 252, 0.12)',
    borderStrong: 'rgba(192, 132, 252, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-motion-nebula',
    curatedSceneIds: [
      'wp-motion-nebula',
      'wp-plus-observatory',
      'wp-art-lavender-lake',
      'wp-motion-aurora',
    ],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'vintage-academy': {
    id: 'vintage-academy',
    name: 'Vintage Academy',
    tagline: 'Burnished Brass & Oxford Oak',
    category: 'Dark Academia',
    accent: '#d4a373',
    accentHover: '#ddb892',
    accentSoft: '#ede0d4',
    accentWash: 'rgba(212, 163, 115, 0.18)',
    gradientStops: ['#faedcd', '#d4a373', '#8a5a2b'],
    ringGlow: 'drop-shadow(0 0 20px rgba(212, 163, 115, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(212, 163, 115, 0.14) 0%, rgba(30, 20, 12, 0.08) 50%, transparent 75%)',
    beadColor: '#fffbf0',
    beadStroke: '#d4a373',
    buttonBg: '#d4a373',
    buttonText: '#1c130b',
    buttonGlow: '0 4px 24px rgba(212, 163, 115, 0.45)',
    buttonRing: 'rgba(212, 163, 115, 0.6)',
    canvas: '#0d0906',
    surface: '#17110c',
    surfaceRaised: '#221912',
    cardBorderHover: 'rgba(212, 163, 115, 0.35)',
    text: '#f7f2ea',
    textMuted: '#baa99b',
    border: 'rgba(212, 163, 115, 0.12)',
    borderStrong: 'rgba(212, 163, 115, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-charcoal-library',
    curatedSceneIds: [
      'wp-art-charcoal-library',
      'wp-sanctra-noir',
      'wp-art-rain',
      'wp-art-forest',
    ],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  // Backward-compatible alias presets
  'violet-night': {
    id: 'violet-night',
    name: 'Starlight Violet',
    tagline: 'Cosmic Nebula & Violet Clarity',
    category: 'Celestial',
    accent: '#c084fc',
    accentHover: '#d8b4fe',
    accentSoft: '#e9d5ff',
    accentWash: 'rgba(192, 132, 252, 0.18)',
    gradientStops: ['#faf5ff', '#c084fc', '#7e22ce'],
    ringGlow: 'drop-shadow(0 0 24px rgba(192, 132, 252, 0.6))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(192, 132, 252, 0.15) 0%, rgba(22, 10, 36, 0.08) 50%, transparent 75%)',
    beadColor: '#faf5ff',
    beadStroke: '#c084fc',
    buttonBg: '#c084fc',
    buttonText: '#130924',
    buttonGlow: '0 4px 26px rgba(192, 132, 252, 0.5)',
    buttonRing: 'rgba(192, 132, 252, 0.6)',
    canvas: '#090610',
    surface: '#130e20',
    surfaceRaised: '#1c1430',
    cardBorderHover: 'rgba(192, 132, 252, 0.35)',
    text: '#f3eef8',
    textMuted: '#b2a5c4',
    border: 'rgba(192, 132, 252, 0.12)',
    borderStrong: 'rgba(192, 132, 252, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-motion-nebula',
    curatedSceneIds: ['wp-motion-nebula', 'wp-plus-observatory'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'ocean-teal': {
    id: 'ocean-teal',
    name: 'Cyber Cyan',
    tagline: 'Neon Rain & Electric Flow',
    category: 'Futuristic',
    accent: '#38bdf8',
    accentHover: '#00f2fe',
    accentSoft: '#7dd3fc',
    accentWash: 'rgba(56, 189, 248, 0.18)',
    gradientStops: ['#e0f2fe', '#38bdf8', '#0284c7'],
    ringGlow: 'drop-shadow(0 0 24px rgba(56, 189, 248, 0.6))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(10, 24, 40, 0.08) 50%, transparent 75%)',
    beadColor: '#f0f9ff',
    beadStroke: '#38bdf8',
    buttonBg: '#38bdf8',
    buttonText: '#051829',
    buttonGlow: '0 4px 26px rgba(56, 189, 248, 0.5)',
    buttonRing: 'rgba(56, 189, 248, 0.6)',
    canvas: '#060d14',
    surface: '#0b1622',
    surfaceRaised: '#112030',
    cardBorderHover: 'rgba(56, 189, 248, 0.35)',
    text: '#e6f4f9',
    textMuted: '#94a9be',
    border: 'rgba(56, 189, 248, 0.12)',
    borderStrong: 'rgba(56, 189, 248, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: ['wp-art-rain', 'wp-video-ocean'],
    fontDisplay: 'Manrope, Inter, system-ui, sans-serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Cyber Cyan',
    tagline: 'Neon Rain & Electric Flow',
    category: 'Futuristic',
    accent: '#38bdf8',
    accentHover: '#00f2fe',
    accentSoft: '#7dd3fc',
    accentWash: 'rgba(56, 189, 248, 0.18)',
    gradientStops: ['#e0f2fe', '#38bdf8', '#0284c7'],
    ringGlow: 'drop-shadow(0 0 24px rgba(56, 189, 248, 0.6))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(10, 24, 40, 0.08) 50%, transparent 75%)',
    beadColor: '#f0f9ff',
    beadStroke: '#38bdf8',
    buttonBg: '#38bdf8',
    buttonText: '#051829',
    buttonGlow: '0 4px 26px rgba(56, 189, 248, 0.5)',
    buttonRing: 'rgba(56, 189, 248, 0.6)',
    canvas: '#060d14',
    surface: '#0b1622',
    surfaceRaised: '#112030',
    cardBorderHover: 'rgba(56, 189, 248, 0.35)',
    text: '#e6f4f9',
    textMuted: '#94a9be',
    border: 'rgba(56, 189, 248, 0.12)',
    borderStrong: 'rgba(56, 189, 248, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: ['wp-art-rain'],
    fontDisplay: 'Manrope, Inter, system-ui, sans-serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'rose-dusk': {
    id: 'rose-dusk',
    name: 'Sakura Dusk',
    tagline: 'Twilight Mauve & Petal Glow',
    category: 'Serene Zen',
    accent: '#f472b6',
    accentHover: '#fb7185',
    accentSoft: '#fbcfe8',
    accentWash: 'rgba(244, 114, 182, 0.18)',
    gradientStops: ['#fdf2f8', '#f472b6', '#be185d'],
    ringGlow: 'drop-shadow(0 0 22px rgba(244, 114, 182, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(244, 114, 182, 0.14) 0%, rgba(28, 12, 22, 0.08) 50%, transparent 75%)',
    beadColor: '#fff1f2',
    beadStroke: '#f472b6',
    buttonBg: '#f472b6',
    buttonText: '#1f0a17',
    buttonGlow: '0 4px 24px rgba(244, 114, 182, 0.45)',
    buttonRing: 'rgba(244, 114, 182, 0.6)',
    canvas: '#0f070d',
    surface: '#190f17',
    surfaceRaised: '#241521',
    cardBorderHover: 'rgba(244, 114, 182, 0.35)',
    text: '#faecf2',
    textMuted: '#bda1ae',
    border: 'rgba(244, 114, 182, 0.12)',
    borderStrong: 'rgba(244, 114, 182, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rose-terrace',
    curatedSceneIds: ['wp-art-rose-terrace'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'forest-mist': {
    id: 'forest-mist',
    name: 'Emerald Solarium',
    tagline: 'Rainforest Canopy & Jade Zen',
    category: 'Botanical',
    accent: '#34d399',
    accentHover: '#6ee7b7',
    accentSoft: '#a7f3d0',
    accentWash: 'rgba(52, 211, 153, 0.18)',
    gradientStops: ['#ecfdf5', '#34d399', '#047857'],
    ringGlow: 'drop-shadow(0 0 22px rgba(52, 211, 153, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(52, 211, 153, 0.14) 0%, rgba(8, 28, 18, 0.08) 50%, transparent 75%)',
    beadColor: '#f0fdf4',
    beadStroke: '#34d399',
    buttonBg: '#34d399',
    buttonText: '#052014',
    buttonGlow: '0 4px 24px rgba(52, 211, 153, 0.45)',
    buttonRing: 'rgba(52, 211, 153, 0.6)',
    canvas: '#06100a',
    surface: '#0b1c12',
    surfaceRaised: '#12291b',
    cardBorderHover: 'rgba(52, 211, 153, 0.35)',
    text: '#e8f7ee',
    textMuted: '#96b8a3',
    border: 'rgba(52, 211, 153, 0.12)',
    borderStrong: 'rgba(52, 211, 153, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-forest',
    curatedSceneIds: ['wp-art-forest'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'nocturne-gold';
export const DEFAULT_THEME_PRESET: ThemePreset = THEME_PRESETS[DEFAULT_THEME_ID];

// Curated primary presets for the theme picker UI (distinct, non-aliased)
export const CURATED_THEMES: ThemePreset[] = [
  THEME_PRESETS['nocturne-gold'],
  THEME_PRESETS['cyber-cyan'],
  THEME_PRESETS['sakura-dusk'],
  THEME_PRESETS['emerald-solarium'],
  THEME_PRESETS['starlight-violet'],
  THEME_PRESETS['vintage-academy'],
];

export function isThemeId(val: unknown): val is ThemeId {
  return typeof val === 'string' && val in THEME_PRESETS;
}

export function resolveThemeId(id?: string | null): ThemeId {
  if (id && isThemeId(id)) return id;
  if (id) {
    const lower = id.toLowerCase();
    if (lower.includes('gold') || lower.includes('nocturne') || lower.includes('amber')) return 'nocturne-gold';
    if (lower.includes('cyan') || lower.includes('teal') || lower.includes('ocean') || lower.includes('blue') || lower.includes('midnight') || lower.includes('rain')) return 'cyber-cyan';
    if (lower.includes('sakura') || lower.includes('rose') || lower.includes('dusk') || lower.includes('pink')) return 'sakura-dusk';
    if (lower.includes('emerald') || lower.includes('forest') || lower.includes('mist') || lower.includes('pine') || lower.includes('sage') || lower.includes('solarium')) return 'emerald-solarium';
    if (lower.includes('violet') || lower.includes('starlight') || lower.includes('purple') || lower.includes('nebula') || lower.includes('lavender')) return 'starlight-violet';
    if (lower.includes('vintage') || lower.includes('academy') || lower.includes('leather') || lower.includes('brass')) return 'vintage-academy';
  }
  return DEFAULT_THEME_ID;
}

export function getThemePreset(id?: string | null): ThemePreset {
  const resolved = resolveThemeId(id);
  return THEME_PRESETS[resolved];
}

export function getAllThemePresets(): ThemePreset[] {
  return CURATED_THEMES;
}

/** Injects theme CSS custom properties onto documentElement for universal styling */
export function applyThemeToDocument(preset: ThemePreset): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--theme-accent', preset.accent);
  root.style.setProperty('--theme-accent-hover', preset.accentHover);
  root.style.setProperty('--theme-accent-soft', preset.accentSoft);
  root.style.setProperty('--theme-accent-wash', preset.accentWash);
  root.style.setProperty('--theme-ring-glow', preset.ringGlow);
  root.style.setProperty('--theme-core-glow', preset.ambientCoreGlow);
  root.style.setProperty('--theme-button-bg', preset.buttonBg);
  root.style.setProperty('--theme-button-text', preset.buttonText);
  root.style.setProperty('--theme-button-glow', preset.buttonGlow);
  root.style.setProperty('--theme-button-ring', preset.buttonRing);
  root.style.setProperty('--theme-font-timer', preset.fontTimer);
  root.style.setProperty('--theme-card-border-hover', preset.cardBorderHover);
  root.style.setProperty('--theme-surface', preset.surface);
  root.style.setProperty('--theme-canvas', preset.canvas);
}

/** Check whether a given scene ID aligns with a theme's coordinated set */
export function isSceneCoordinatedWithTheme(themeId: ThemeId, sceneId: string): boolean {
  const theme = THEME_PRESETS[themeId];
  return theme.defaultSceneId === sceneId || theme.curatedSceneIds.includes(sceneId);
}

/** Retrieve all scene presets corresponding to a theme's curated list */
export function getCuratedScenesForTheme(themeId: ThemeId, presets: WallpaperPreset[]): WallpaperPreset[] {
  const theme = THEME_PRESETS[themeId];
  return theme.curatedSceneIds
    .map(id => presets.find(p => p.id === id))
    .filter((p): p is WallpaperPreset => Boolean(p));
}
