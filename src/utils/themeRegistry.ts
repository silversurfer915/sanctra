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
  // Accent family with accessible states
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentWash: string;
  // Dark charcoal canvas and surfaces
  canvas: string;
  surface: string;
  surfaceRaised: string;
  // Readable neutral text
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
  ringGlow: string;
}

export const SHARED_SEMANTIC_COLORS: ThemeSemanticColors = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  'violet-night': {
    id: 'violet-night',
    name: 'Violet Night',
    tagline: 'Deep Violet Clarity',
    accent: '#7432ff',
    accentHover: '#8548ff',
    accentSoft: '#9b67ff',
    accentWash: 'rgba(116, 50, 255, 0.16)',
    canvas: '#0a0a12',
    surface: '#11111b',
    surfaceRaised: '#181824',
    text: '#f0f0f4',
    textMuted: '#b7b7c7',
    border: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.17)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-forest',
    curatedSceneIds: [
      'wp-art-forest',
      'wp-art-charcoal-library',
      'wp-art-lavender-lake',
      'wp-motion-aurora',
    ],
    fontDisplay: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontTimer: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontBody: "'Inter Variable', Inter, system-ui, sans-serif",
    ringGlow: '0 0 44px rgba(116, 50, 255, 0.22)',
  },
  'ocean-teal': {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    tagline: 'Luminous Coastal Flow',
    accent: '#00bfa5',
    accentHover: '#1de9b6',
    accentSoft: '#64ffda',
    accentWash: 'rgba(0, 191, 165, 0.16)',
    canvas: '#070f14',
    surface: '#0d1920',
    surfaceRaised: '#13232c',
    text: '#e6f4f1',
    textMuted: '#9ebfb8',
    border: 'rgba(100, 255, 218, 0.12)',
    borderStrong: 'rgba(100, 255, 218, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-video-ocean',
    curatedSceneIds: [
      'wp-video-ocean',
      'wp-plus-solarium',
      'wp-art-forest',
      'wp-motion-aurora',
    ],
    fontDisplay: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontTimer: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontBody: "'Inter Variable', Inter, system-ui, sans-serif",
    ringGlow: '0 0 44px rgba(0, 191, 165, 0.22)',
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    tagline: 'Sapphire Midnight Depth',
    accent: '#3d7eff',
    accentHover: '#5c94ff',
    accentSoft: '#82b1ff',
    accentWash: 'rgba(61, 126, 255, 0.16)',
    canvas: '#080c16',
    surface: '#0f1726',
    surfaceRaised: '#162135',
    text: '#ebf1ff',
    textMuted: '#a3b4d4',
    border: 'rgba(130, 177, 255, 0.12)',
    borderStrong: 'rgba(130, 177, 255, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rain',
    curatedSceneIds: [
      'wp-art-rain',
      'wp-motion-nebula',
      'wp-plus-observatory',
      'wp-video-rain-still',
    ],
    fontDisplay: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontTimer: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontBody: "'Inter Variable', Inter, system-ui, sans-serif",
    ringGlow: '0 0 44px rgba(61, 126, 255, 0.22)',
  },
  'rose-dusk': {
    id: 'rose-dusk',
    name: 'Rose Dusk',
    tagline: 'Twilight Mauve Serenity',
    accent: '#e05688',
    accentHover: '#eb6e9b',
    accentSoft: '#f48fb1',
    accentWash: 'rgba(224, 86, 136, 0.16)',
    canvas: '#12090f',
    surface: '#1d101a',
    surfaceRaised: '#271723',
    text: '#f7ecf1',
    textMuted: '#c7a9b7',
    border: 'rgba(244, 143, 177, 0.12)',
    borderStrong: 'rgba(244, 143, 177, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-rose-terrace',
    curatedSceneIds: [
      'wp-art-rose-terrace',
      'wp-art-lavender-lake',
      'wp-plus-kyoto',
      'wp-motion-sakura',
    ],
    fontDisplay: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontTimer: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontBody: "'Inter Variable', Inter, system-ui, sans-serif",
    ringGlow: '0 0 44px rgba(224, 86, 136, 0.22)',
  },
  'forest-mist': {
    id: 'forest-mist',
    name: 'Forest Mist',
    tagline: 'Calm Pine Canopy',
    accent: '#2eb872',
    accentHover: '#3ecf85',
    accentSoft: '#69e7a6',
    accentWash: 'rgba(46, 184, 114, 0.16)',
    canvas: '#08100c',
    surface: '#0f1c16',
    surfaceRaised: '#162720',
    text: '#eaf5ee',
    textMuted: '#a2c0b0',
    border: 'rgba(105, 231, 166, 0.12)',
    borderStrong: 'rgba(105, 231, 166, 0.22)',
    semantic: SHARED_SEMANTIC_COLORS,
    defaultSceneId: 'wp-art-forest',
    curatedSceneIds: [
      'wp-art-forest',
      'wp-plus-solarium',
      'wp-motion-rain',
      'wp-motion-sakura',
    ],
    fontDisplay: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontTimer: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif",
    fontBody: "'Inter Variable', Inter, system-ui, sans-serif",
    ringGlow: '0 0 44px rgba(46, 184, 114, 0.22)',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'violet-night';
export const DEFAULT_THEME_PRESET: ThemePreset = THEME_PRESETS[DEFAULT_THEME_ID];

export function isThemeId(val: unknown): val is ThemeId {
  return typeof val === 'string' && val in THEME_PRESETS;
}

export function resolveThemeId(id?: string | null): ThemeId {
  if (id && isThemeId(id)) return id;
  // Map any legacy names
  if (id) {
    const lower = id.toLowerCase();
    if (lower.includes('teal') || lower.includes('ocean')) return 'ocean-teal';
    if (lower.includes('blue') || lower.includes('midnight') || lower.includes('rain')) return 'midnight-blue';
    if (lower.includes('rose') || lower.includes('dusk')) return 'rose-dusk';
    if (lower.includes('forest') || lower.includes('mist') || lower.includes('pine') || lower.includes('sage')) return 'forest-mist';
    if (lower.includes('violet') || lower.includes('lavender')) return 'violet-night';
  }
  return DEFAULT_THEME_ID;
}

export function getThemePreset(id?: string | null): ThemePreset {
  const resolved = resolveThemeId(id);
  return THEME_PRESETS[resolved];
}

export function getAllThemePresets(): ThemePreset[] {
  return Object.values(THEME_PRESETS);
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
