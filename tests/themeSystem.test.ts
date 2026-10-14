import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isEntitlementActive } from '../src/utils/subscriptionPlans.ts';
import type { UserSettings } from '../src/types/index.ts';
import {
  DEFAULT_USER_SETTINGS,
  getUserSettings,
  saveUserSettings,
  WALLPAPER_PRESETS,
  resolveWallpaperId,
  getSettingsStorageKey,
  getThemeName,
  THEME_PALETTES,
} from '../src/utils/storage.ts';

// Mock localStorage for node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
}

test('Wallpaper Collection: contains all 36 new curated Plus wallpapers with verified disk assets', () => {
  const plusPresets = WALLPAPER_PRESETS.filter(p => p.isPlusOnly);
  assert.equal(plusPresets.length, 42, 'Must preserve the original collection and include Sunlit Meadow');
  assert.ok(plusPresets.some(p => p.id === 'wp-video-lofi-meadow')); 

  const newPlusCollection = plusPresets.filter(p => p.url.startsWith('/backgrounds/plus-collection/'));
  assert.equal(newPlusCollection.length, 36, 'Must contain exactly 36 newly added Plus collection presets');

  const abstractPresets = newPlusCollection.filter(p => p.category.includes('Abstract'));
  assert.equal(abstractPresets.length, 12, 'Must contain 12 abstract presets');

  const scenicPresets = newPlusCollection.filter(p => p.category.includes('Sanctuary'));
  assert.equal(scenicPresets.length, 24, 'Must contain 24 scenic presets');

  for (const preset of newPlusCollection) {
    assert.equal(preset.isPlusOnly, true);
    assert.equal(resolveWallpaperId(preset.id), preset.id);

    // Verify local files exist in public/backgrounds/plus-collection/
    const fullWebpPath = path.join(process.cwd(), 'public', preset.url);
    const thumbWebpPath = path.join(process.cwd(), 'public', preset.thumbnail);
    assert.ok(fs.existsSync(fullWebpPath), `File must exist on disk: ${fullWebpPath}`);
    assert.ok(fs.existsSync(thumbWebpPath), `Thumbnail must exist on disk: ${thumbWebpPath}`);
  }
});

test('Wallpaper Settings: clean category separation between Scenic and Abstract', () => {
  const newPlusCollection = WALLPAPER_PRESETS.filter(p => p.url.startsWith('/backgrounds/plus-collection/'));
  const hasSanctuary = newPlusCollection.some(p => p.category.startsWith('Plus+ Sanctuary'));
  const hasAbstract = newPlusCollection.some(p => p.category.startsWith('Plus+ Abstract'));
  
  assert.ok(hasSanctuary, 'Must include Scenic/Sanctuary categories');
  assert.ok(hasAbstract, 'Must include Abstract categories');

  // Verify each preset belongs to either Sanctuary or Abstract
  for (const preset of newPlusCollection) {
    assert.ok(
      preset.category.startsWith('Plus+ Sanctuary') || preset.category.startsWith('Plus+ Abstract'),
      `Preset ${preset.id} must be in Sanctuary or Abstract category (got ${preset.category})`
    );
  }
});

test('Weather Presets: subtle weather choices exist and have working poster fallbacks', () => {
  const weatherPresets = WALLPAPER_PRESETS.filter(p => p.type === 'weather');
  assert.equal(weatherPresets.length, 2, 'Must retain rain and mist after retiring Lakeside Ripple');

  const weatherIds = weatherPresets.map(p => p.id);
  assert.ok(weatherIds.includes('wp-weather-rain'));
  assert.ok(weatherIds.includes('wp-weather-mist'));

  for (const preset of weatherPresets) {
    assert.ok(preset.url, `Preset ${preset.id} must have a valid poster URL`);
    assert.ok(preset.thumbnail, `Preset ${preset.id} must have a thumbnail`);
    assert.ok(preset.weatherType, `Preset ${preset.id} must specify weatherType`);
    assert.equal(resolveWallpaperId(preset.id), preset.id);
  }
});

test('Motion Presets: motion backgrounds specify valid types and URLs', () => {
  const motionPresets = WALLPAPER_PRESETS.filter(p => p.type === 'motion');
  assert.ok(motionPresets.length > 0, 'Must have motion choices');

  for (const preset of motionPresets) {
    assert.ok(preset.isPlusOnly, `Motion preset ${preset.id} must be Plus only`);
    assert.ok(preset.url, `Motion preset ${preset.id} must have poster URL`);
    assert.ok(preset.thumbnail, `Motion preset ${preset.id} must have thumbnail`);
    assert.ok(preset.motionType || preset.motionUrl, `Motion preset ${preset.id} must specify motionType or motionUrl`);
    if (preset.motionUrl) {
      assert.ok(preset.motionUrl.endsWith('.mp4'), `Motion video must be mp4: ${preset.motionUrl}`);
    }
  }
});

test('Plus Gating: isEntitlementActive correctly enforces Plus membership status', () => {
  const inactiveSub = {
    isPlus: false,
    status: 'inactive' as const,
    currentPeriodEnd: Date.now() + 100000,
    currentPeriodStart: Date.now() - 100000,
  };
  const activeSub = {
    isPlus: true,
    status: 'active' as const,
    currentPeriodEnd: Date.now() + 100000,
    currentPeriodStart: Date.now() - 100000,
  };
  const expiredSub = {
    isPlus: true,
    status: 'active' as const,
    currentPeriodEnd: Date.now() - 1000,
    currentPeriodStart: Date.now() - 100000,
  };

  assert.equal(isEntitlementActive(null), false);
  assert.equal(isEntitlementActive(inactiveSub as any), false);
  assert.equal(isEntitlementActive(activeSub as any), true);
  assert.equal(isEntitlementActive(expiredSub as any), false);
});

test('Wallpaper Persistence: DEFAULT_USER_SETTINGS has default wallpaper and glass settings', () => {
  assert.equal(DEFAULT_USER_SETTINGS.activeWallpaperId, 'wp-art-rain');
  assert.equal(DEFAULT_USER_SETTINGS.uiGlassBlur, 12);
  assert.equal(DEFAULT_USER_SETTINGS.backgroundDimness, 25);
  assert.equal(DEFAULT_USER_SETTINGS.wallpaperFitMode, 'fill');
});

test('Wallpaper Persistence: guest mode persists and restores settings via localStorage', () => {
  localStorage.clear();

  const settings = getUserSettings(null);
  assert.equal(settings.activeWallpaperId, 'wp-art-rain');

  // Save guest user update
  saveUserSettings({
    ...settings,
    activeWallpaperId: 'wp-art-rose-terrace',
    uiGlassBlur: 16,
    backgroundDimness: 35,
  }, null);

  const reloaded = getUserSettings(null);
  assert.equal(reloaded.activeWallpaperId, 'wp-art-rose-terrace');
  assert.equal(reloaded.uiGlassBlur, 16);
  assert.equal(reloaded.backgroundDimness, 35);
});

test('Wallpaper Persistence: authenticated user isolation works correctly', () => {
  localStorage.clear();

  const userId = 'user-test-789';
  saveUserSettings({
    ...DEFAULT_USER_SETTINGS,
    activeWallpaperId: 'wp-art-charcoal-library',
    uiGlassBlur: 8,
  }, userId);

  const userSettings = getUserSettings(userId);
  assert.equal(userSettings.activeWallpaperId, 'wp-art-charcoal-library');
  assert.equal(userSettings.uiGlassBlur, 8);

  // Key storage check
  const expectedKey = getSettingsStorageKey(userId);
  assert.ok(localStorage.getItem(expectedKey));
});

test('Wallpaper Persistence: corrupt or unknown wallpaper ID falls back without error', () => {
  localStorage.clear();

  const corrupted = {
    ...DEFAULT_USER_SETTINGS,
    activeWallpaperId: 'corrupted-nonexistent-wallpaper',
  };
  localStorage.setItem('sanctra_settings_v1', JSON.stringify(corrupted));

  const restored = getUserSettings(null);
  assert.equal(restored.activeWallpaperId, 'wp-art-rain', 'Unknown wallpaper falls back to default wp-art-rain');
});

test('Typography Setup: Manrope and Inter variables defined, Playfair Display removed', () => {
  const cssPath = path.join(process.cwd(), 'src', 'styles-sanctra.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Check modern variable font tokens
  assert.ok(
    cssContent.includes('--font-display:\'Manrope Variable\'') || cssContent.includes('--font-display: \'Manrope Variable\''),
    'Must define --font-display with Manrope Variable'
  );
  assert.ok(
    cssContent.includes('--font-body:\'Inter Variable\'') || cssContent.includes('--font-body: \'Inter Variable\''),
    'Must define --font-body with Inter Variable'
  );
  assert.ok(
    cssContent.includes('--sanctra-serif:\'Manrope Variable\'') || cssContent.includes('--sanctra-serif: \'Manrope Variable\''),
    'Must point --sanctra-serif to Manrope Variable'
  );

  // Ensure Playfair Display is retired
  assert.ok(
    !cssContent.includes('Playfair Display'),
    'Must NOT contain Playfair Display in styles-sanctra.css'
  );

  // Check landing.css as well
  const landingCssPath = path.join(process.cwd(), 'src', 'components', 'views', 'landing.css');
  const landingCss = fs.readFileSync(landingCssPath, 'utf8');
  assert.ok(
    !landingCss.includes('Playfair Display'),
    'Must NOT contain Playfair Display in landing.css'
  );
});

test('Coordinated Palettes: all wallpapers map to harmonious glass tint themes', () => {
  const allThemes = ['sage', 'sand', 'blue', 'lavender', 'rose', 'charcoal'];
  for (const theme of allThemes) {
    const palette = THEME_PALETTES[theme as keyof typeof THEME_PALETTES];
    assert.ok(palette, `Palette for ${theme} must exist`);
    assert.ok(palette.ink.startsWith('#'), `${theme} ink must be a hex color`);
    assert.ok(palette.surface.startsWith('#'), `${theme} surface must be a hex color`);
    assert.ok(palette.accent.startsWith('#'), `${theme} accent must be a hex color`);
    assert.ok(palette.muted.startsWith('#'), `${theme} muted must be a hex color`);
  }

  for (const preset of WALLPAPER_PRESETS) {
    const theme = getThemeName(preset.id);
    assert.ok(allThemes.includes(theme), `Wallpaper ${preset.id} must map to a valid theme (got ${theme})`);
  }
});
