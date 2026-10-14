import {THEME_PALETTES,PRESET_THEME_MAP,getThemeName} from './wallpaperTheme.ts';

/** Shares the runtime resolver with first paint; no second hand-maintained palette map. */
export function earlyThemeScript(): string {
  return `try {
    const palettes = ${JSON.stringify(THEME_PALETTES)};
    const PRESET_THEME_MAP = ${JSON.stringify(PRESET_THEME_MAP)};
    const getThemeName = ${getThemeName.toString()};
    const user = JSON.parse(localStorage.getItem('sanctra_auth_user_v1') || 'null');
    const params = new URLSearchParams(location.search);
    const landing = params.get('landing') === 'true' || ((!user || user.isAnonymous) && !params.get('view'));
    const settings = JSON.parse(localStorage.getItem(user?.uid ? 'sanctra_settings_' + user.uid + '_v1' : 'sanctra_settings_v1') || '{}');
    const wallpaper = landing ? (localStorage.getItem('sanctra_landing_atmosphere') === 'Evening Stillness' ? 'wp-art-forest' : 'wp-video-ocean') : (settings.activeWallpaperId || 'wp-art-rain');
    const palette = palettes[getThemeName(wallpaper)];
    for (const [name,value] of Object.entries({ink:palette.ink,surface:palette.surface,sage:palette.accent,muted:palette.muted,'boot-ink':palette.ink})) document.documentElement.style.setProperty('--sanctra-' + name,value);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',palette.ink);
  } catch (_) {}`;
}
