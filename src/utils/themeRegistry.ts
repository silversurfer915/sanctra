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
  'starlight-violet': {
    id: 'starlight-violet',
    name: 'Pastel Lavender',
    tagline: 'Dreamy Lilac Hues & Soft Clarity',
    category: 'Pastel Flora',
    accent: '#C4B5FD',
    accentHover: '#DDD6FE',
    accentSoft: '#EDE9FE',
    accentWash: 'rgba(196, 181, 253, 0.16)',
    gradientStops: ['#FAF5FF', '#DDD6FE', '#C4B5FD'],
    ringGlow: 'drop-shadow(0 0 22px rgba(196, 181, 253, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(196, 181, 253, 0.22) 0%, rgba(196, 181, 253, 0.05) 50%, transparent 75%)',
    beadColor: '#FAF5FF',
    beadStroke: '#C4B5FD',
    buttonBg: '#C4B5FD',
    buttonText: '#1E1238',
    buttonGlow: '0 4px 22px rgba(196, 181, 253, 0.45)',
    buttonRing: 'rgba(196, 181, 253, 0.65)',
    canvas: '#090710',
    surface: '#130F20',
    surfaceRaised: '#1C162E',
    cardBorderHover: 'rgba(196, 181, 253, 0.38)',
    text: '#F5F2FA',
    textMuted: '#AFA8C2',
    border: 'rgba(196, 181, 253, 0.14)',
    borderStrong: 'rgba(196, 181, 253, 0.26)',
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

  'emerald-solarium': {
    id: 'emerald-solarium',
    name: 'Pastel Mint',
    tagline: 'Refreshing Matcha & Calm Solarium',
    category: 'Pastel Botanical',
    accent: '#A7F3D0',
    accentHover: '#C6F6D5',
    accentSoft: '#D1FAE5',
    accentWash: 'rgba(167, 243, 208, 0.16)',
    gradientStops: ['#F0FDF4', '#D1FAE5', '#A7F3D0'],
    ringGlow: 'drop-shadow(0 0 22px rgba(167, 243, 208, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(167, 243, 208, 0.22) 0%, rgba(167, 243, 208, 0.05) 50%, transparent 75%)',
    beadColor: '#F0FDF4',
    beadStroke: '#A7F3D0',
    buttonBg: '#A7F3D0',
    buttonText: '#062518',
    buttonGlow: '0 4px 22px rgba(167, 243, 208, 0.45)',
    buttonRing: 'rgba(167, 243, 208, 0.65)',
    canvas: '#06100B',
    surface: '#0D1C14',
    surfaceRaised: '#14291E',
    cardBorderHover: 'rgba(167, 243, 208, 0.38)',
    text: '#F0FAF4',
    textMuted: '#A0BCAB',
    border: 'rgba(167, 243, 208, 0.14)',
    borderStrong: 'rgba(167, 243, 208, 0.26)',
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

  'vintage-academy': {
    id: 'vintage-academy',
    name: 'Pastel Peach',
    tagline: 'Warm Apricot Sorbet & Gentle Sunlight',
    category: 'Pastel Warmth',
    accent: '#FED7AA',
    accentHover: '#FFEDD5',
    accentSoft: '#FFF7ED',
    accentWash: 'rgba(254, 215, 170, 0.16)',
    gradientStops: ['#FFF7ED', '#FFEDD5', '#FED7AA'],
    ringGlow: 'drop-shadow(0 0 22px rgba(254, 215, 170, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(254, 215, 170, 0.22) 0%, rgba(254, 215, 170, 0.05) 50%, transparent 75%)',
    beadColor: '#FFFBF5',
    beadStroke: '#FED7AA',
    buttonBg: '#FED7AA',
    buttonText: '#2C1605',
    buttonGlow: '0 4px 22px rgba(254, 215, 170, 0.45)',
    buttonRing: 'rgba(254, 215, 170, 0.65)',
    canvas: '#100A06',
    surface: '#1C130D',
    surfaceRaised: '#281B13',
    cardBorderHover: 'rgba(254, 215, 170, 0.38)',
    text: '#FAF4EF',
    textMuted: '#BAACA2',
    border: 'rgba(254, 215, 170, 0.14)',
    borderStrong: 'rgba(254, 215, 170, 0.26)',
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

  'cyber-cyan': {
    id: 'cyber-cyan',
    name: 'Pastel Sky',
    tagline: 'Powder Blue Breeze & Clear Horizon',
    category: 'Pastel Horizon',
    accent: '#BAE6FD',
    accentHover: '#E0F2FE',
    accentSoft: '#F0F9FF',
    accentWash: 'rgba(186, 230, 253, 0.16)',
    gradientStops: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
    ringGlow: 'drop-shadow(0 0 22px rgba(186, 230, 253, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(186, 230, 253, 0.22) 0%, rgba(186, 230, 253, 0.05) 50%, transparent 75%)',
    beadColor: '#F0F9FF',
    beadStroke: '#BAE6FD',
    buttonBg: '#BAE6FD',
    buttonText: '#082136',
    buttonGlow: '0 4px 22px rgba(186, 230, 253, 0.45)',
    buttonRing: 'rgba(186, 230, 253, 0.65)',
    canvas: '#060C12',
    surface: '#0C1722',
    surfaceRaised: '#132232',
    cardBorderHover: 'rgba(186, 230, 253, 0.38)',
    text: '#EEF6FA',
    textMuted: '#9EB0BF',
    border: 'rgba(186, 230, 253, 0.14)',
    borderStrong: 'rgba(186, 230, 253, 0.26)',
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
    name: 'Pastel Rose',
    tagline: 'Blush Peony & Ballet Slipper Pink',
    category: 'Pastel Petal',
    accent: '#FBCFE8',
    accentHover: '#FCE7F3',
    accentSoft: '#FFF1F2',
    accentWash: 'rgba(251, 207, 232, 0.16)',
    gradientStops: ['#FFF1F2', '#FCE7F3', '#FBCFE8'],
    ringGlow: 'drop-shadow(0 0 22px rgba(251, 207, 232, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(251, 207, 232, 0.22) 0%, rgba(251, 207, 232, 0.05) 50%, transparent 75%)',
    beadColor: '#FFF1F2',
    beadStroke: '#FBCFE8',
    buttonBg: '#FBCFE8',
    buttonText: '#2D0E20',
    buttonGlow: '0 4px 22px rgba(251, 207, 232, 0.45)',
    buttonRing: 'rgba(251, 207, 232, 0.65)',
    canvas: '#10070D',
    surface: '#1C1018',
    surfaceRaised: '#281724',
    cardBorderHover: 'rgba(251, 207, 232, 0.38)',
    text: '#FBF1F5',
    textMuted: '#C0A6B4',
    border: 'rgba(251, 207, 232, 0.14)',
    borderStrong: 'rgba(251, 207, 232, 0.26)',
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

  'nocturne-gold': {
    id: 'nocturne-gold',
    name: 'Pastel Vanilla',
    tagline: 'Warm Buttercream & Alabaster Glow',
    category: 'Pastel Warmth',
    accent: '#FEF08A',
    accentHover: '#FEF9C3',
    accentSoft: '#FEFCE8',
    accentWash: 'rgba(254, 240, 138, 0.16)',
    gradientStops: ['#FEFCE8', '#FEF9C3', '#FEF08A'],
    ringGlow: 'drop-shadow(0 0 22px rgba(254, 240, 138, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(254, 240, 138, 0.22) 0%, rgba(254, 240, 138, 0.05) 50%, transparent 75%)',
    beadColor: '#FEFCE8',
    beadStroke: '#FEF08A',
    buttonBg: '#FEF08A',
    buttonText: '#272107',
    buttonGlow: '0 4px 22px rgba(254, 240, 138, 0.45)',
    buttonRing: 'rgba(254, 240, 138, 0.65)',
    canvas: '#0E0C06',
    surface: '#19160D',
    surfaceRaised: '#252014',
    cardBorderHover: 'rgba(254, 240, 138, 0.38)',
    text: '#FAF8EE',
    textMuted: '#B8B29C',
    border: 'rgba(254, 240, 138, 0.14)',
    borderStrong: 'rgba(254, 240, 138, 0.26)',
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

  // Backward-compatible alias presets
  'violet-night': {
    id: 'violet-night',
    name: 'Pastel Lavender',
    tagline: 'Dreamy Lilac Hues & Soft Clarity',
    category: 'Pastel Flora',
    accent: '#C4B5FD',
    accentHover: '#DDD6FE',
    accentSoft: '#EDE9FE',
    accentWash: 'rgba(196, 181, 253, 0.16)',
    gradientStops: ['#FAF5FF', '#DDD6FE', '#C4B5FD'],
    ringGlow: 'drop-shadow(0 0 22px rgba(196, 181, 253, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(196, 181, 253, 0.22) 0%, rgba(196, 181, 253, 0.05) 50%, transparent 75%)',
    beadColor: '#FAF5FF',
    beadStroke: '#C4B5FD',
    buttonBg: '#C4B5FD',
    buttonText: '#1E1238',
    buttonGlow: '0 4px 22px rgba(196, 181, 253, 0.45)',
    buttonRing: 'rgba(196, 181, 253, 0.65)',
    canvas: '#090710',
    surface: '#130F20',
    surfaceRaised: '#1C162E',
    cardBorderHover: 'rgba(196, 181, 253, 0.38)',
    text: '#F5F2FA',
    textMuted: '#AFA8C2',
    border: 'rgba(196, 181, 253, 0.14)',
    borderStrong: 'rgba(196, 181, 253, 0.26)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-motion-nebula',
    curatedSceneIds: ['wp-motion-nebula', 'wp-plus-observatory'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'ocean-teal': {
    id: 'ocean-teal',
    name: 'Pastel Sky',
    tagline: 'Powder Blue Breeze & Clear Horizon',
    category: 'Pastel Horizon',
    accent: '#BAE6FD',
    accentHover: '#E0F2FE',
    accentSoft: '#F0F9FF',
    accentWash: 'rgba(186, 230, 253, 0.16)',
    gradientStops: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
    ringGlow: 'drop-shadow(0 0 22px rgba(186, 230, 253, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(186, 230, 253, 0.22) 0%, rgba(186, 230, 253, 0.05) 50%, transparent 75%)',
    beadColor: '#F0F9FF',
    beadStroke: '#BAE6FD',
    buttonBg: '#BAE6FD',
    buttonText: '#082136',
    buttonGlow: '0 4px 22px rgba(186, 230, 253, 0.45)',
    buttonRing: 'rgba(186, 230, 253, 0.65)',
    canvas: '#060C12',
    surface: '#0C1722',
    surfaceRaised: '#132232',
    cardBorderHover: 'rgba(186, 230, 253, 0.38)',
    text: '#EEF6FA',
    textMuted: '#9EB0BF',
    border: 'rgba(186, 230, 253, 0.14)',
    borderStrong: 'rgba(186, 230, 253, 0.26)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: ['wp-art-rain', 'wp-video-ocean'],
    fontDisplay: 'Manrope, Inter, system-ui, sans-serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Pastel Sky',
    tagline: 'Powder Blue Breeze & Clear Horizon',
    category: 'Pastel Horizon',
    accent: '#BAE6FD',
    accentHover: '#E0F2FE',
    accentSoft: '#F0F9FF',
    accentWash: 'rgba(186, 230, 253, 0.16)',
    gradientStops: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
    ringGlow: 'drop-shadow(0 0 22px rgba(186, 230, 253, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(186, 230, 253, 0.22) 0%, rgba(186, 230, 253, 0.05) 50%, transparent 75%)',
    beadColor: '#F0F9FF',
    beadStroke: '#BAE6FD',
    buttonBg: '#BAE6FD',
    buttonText: '#082136',
    buttonGlow: '0 4px 22px rgba(186, 230, 253, 0.45)',
    buttonRing: 'rgba(186, 230, 253, 0.65)',
    canvas: '#060C12',
    surface: '#0C1722',
    surfaceRaised: '#132232',
    cardBorderHover: 'rgba(186, 230, 253, 0.38)',
    text: '#EEF6FA',
    textMuted: '#9EB0BF',
    border: 'rgba(186, 230, 253, 0.14)',
    borderStrong: 'rgba(186, 230, 253, 0.26)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: ['wp-art-rain'],
    fontDisplay: 'Manrope, Inter, system-ui, sans-serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'rose-dusk': {
    id: 'rose-dusk',
    name: 'Pastel Rose',
    tagline: 'Blush Peony & Ballet Slipper Pink',
    category: 'Pastel Petal',
    accent: '#FBCFE8',
    accentHover: '#FCE7F3',
    accentSoft: '#FFF1F2',
    accentWash: 'rgba(251, 207, 232, 0.16)',
    gradientStops: ['#FFF1F2', '#FCE7F3', '#FBCFE8'],
    ringGlow: 'drop-shadow(0 0 22px rgba(251, 207, 232, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(251, 207, 232, 0.22) 0%, rgba(251, 207, 232, 0.05) 50%, transparent 75%)',
    beadColor: '#FFF1F2',
    beadStroke: '#FBCFE8',
    buttonBg: '#FBCFE8',
    buttonText: '#2D0E20',
    buttonGlow: '0 4px 22px rgba(251, 207, 232, 0.45)',
    buttonRing: 'rgba(251, 207, 232, 0.65)',
    canvas: '#10070D',
    surface: '#1C1018',
    surfaceRaised: '#281724',
    cardBorderHover: 'rgba(251, 207, 232, 0.38)',
    text: '#FBF1F5',
    textMuted: '#C0A6B4',
    border: 'rgba(251, 207, 232, 0.14)',
    borderStrong: 'rgba(251, 207, 232, 0.26)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rose-terrace',
    curatedSceneIds: ['wp-art-rose-terrace'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: '"Instrument Serif", Georgia, serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },

  'forest-mist': {
    id: 'forest-mist',
    name: 'Pastel Mint',
    tagline: 'Refreshing Matcha & Calm Solarium',
    category: 'Pastel Botanical',
    accent: '#A7F3D0',
    accentHover: '#C6F6D5',
    accentSoft: '#D1FAE5',
    accentWash: 'rgba(167, 243, 208, 0.16)',
    gradientStops: ['#F0FDF4', '#D1FAE5', '#A7F3D0'],
    ringGlow: 'drop-shadow(0 0 22px rgba(167, 243, 208, 0.55))',
    ambientCoreGlow: 'radial-gradient(circle, rgba(167, 243, 208, 0.22) 0%, rgba(167, 243, 208, 0.05) 50%, transparent 75%)',
    beadColor: '#F0FDF4',
    beadStroke: '#A7F3D0',
    buttonBg: '#A7F3D0',
    buttonText: '#062518',
    buttonGlow: '0 4px 22px rgba(167, 243, 208, 0.45)',
    buttonRing: 'rgba(167, 243, 208, 0.65)',
    canvas: '#06100B',
    surface: '#0D1C14',
    surfaceRaised: '#14291E',
    cardBorderHover: 'rgba(167, 243, 208, 0.38)',
    text: '#F0FAF4',
    textMuted: '#A0BCAB',
    border: 'rgba(167, 243, 208, 0.14)',
    borderStrong: 'rgba(167, 243, 208, 0.26)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-forest',
    curatedSceneIds: ['wp-art-forest'],
    fontDisplay: '"Instrument Serif", Georgia, serif',
    fontTimer: 'Manrope, Inter, system-ui, sans-serif',
    fontBody: 'Inter, -apple-system, system-ui, sans-serif',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'starlight-violet';
export const DEFAULT_THEME_PRESET: ThemePreset = THEME_PRESETS[DEFAULT_THEME_ID];

// Curated primary presets for the theme picker UI (distinct, non-aliased)
export const CURATED_THEMES: ThemePreset[] = [
  THEME_PRESETS['starlight-violet'],
  THEME_PRESETS['emerald-solarium'],
  THEME_PRESETS['vintage-academy'],
  THEME_PRESETS['cyber-cyan'],
  THEME_PRESETS['sakura-dusk'],
  THEME_PRESETS['nocturne-gold'],
];

export function isThemeId(val: unknown): val is ThemeId {
  return typeof val === 'string' && val in THEME_PRESETS;
}

export function resolveThemeId(id?: string | null): ThemeId {
  if (id && isThemeId(id)) return id;
  if (id) {
    const lower = id.toLowerCase();
    if (lower.includes('lavender') || lower.includes('violet') || lower.includes('starlight') || lower.includes('purple') || lower.includes('lilac')) return 'starlight-violet';
    if (lower.includes('mint') || lower.includes('emerald') || lower.includes('forest') || lower.includes('mist') || lower.includes('sage') || lower.includes('matcha')) return 'emerald-solarium';
    if (lower.includes('peach') || lower.includes('vintage') || lower.includes('academy') || lower.includes('apricot') || lower.includes('warm')) return 'vintage-academy';
    if (lower.includes('sky') || lower.includes('cyan') || lower.includes('teal') || lower.includes('ocean') || lower.includes('blue') || lower.includes('cloud')) return 'cyber-cyan';
    if (lower.includes('rose') || lower.includes('sakura') || lower.includes('pink') || lower.includes('blush') || lower.includes('peony')) return 'sakura-dusk';
    if (lower.includes('vanilla') || lower.includes('gold') || lower.includes('nocturne') || lower.includes('butter') || lower.includes('cream')) return 'nocturne-gold';
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

/** Injects theme CSS custom properties onto documentElement for universal dynamic styling */
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
  root.style.setProperty('--theme-card-border', `${preset.accent}24`);
  root.style.setProperty('--theme-card-border-hover', preset.cardBorderHover);
  root.style.setProperty('--theme-card-glow', `${preset.accent}14`);
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
