import test from 'node:test';
import assert from 'node:assert/strict';
import { WALLPAPER_PRESETS, getThemeName, THEME_PALETTES, resolveWallpaperId, DEFAULT_USER_SETTINGS, PLUS_AVATAR_PRESETS } from '../src/utils/storage.ts';

test('signature and illustrated backgrounds resolve to coordinated palettes', () => {
  assert.ok(WALLPAPER_PRESETS.every(p => p.type === 'scenic' || p.type === 'motion' || p.type === 'weather'));
  assert.ok(WALLPAPER_PRESETS.every(p => p.url && p.thumbnail));
  assert.equal(new Set(WALLPAPER_PRESETS.map(p => p.id)).size, WALLPAPER_PRESETS.length);
  for (const preset of WALLPAPER_PRESETS) {
    assert.ok(THEME_PALETTES[getThemeName(preset.id)]);
    if (preset.type === 'scenic') {
      if (preset.isPlusOnly) {
        assert.ok(preset.url.startsWith('/backgrounds/'));
      } else {
        assert.ok(preset.url.startsWith('/backgrounds/illustrated-') || preset.url.startsWith('/backgrounds/quality-v4/'));
      }
    }
    if (preset.type === 'motion') {
      assert.ok(preset.isPlusOnly);
      assert.ok(preset.url.startsWith('/backgrounds/'));
      assert.ok(preset.motionType || preset.motionUrl);
      if (preset.motionUrl) assert.ok(preset.motionUrl.endsWith('.mp4'));
    }
    if (preset.type === 'weather') {
      assert.ok(preset.url.startsWith('/backgrounds/'));
      assert.ok(preset.weatherType);
    }
  }
  assert.equal(getThemeName('wp-theme-lavender'), 'lavender');
  assert.equal(getThemeName('wp-abstract-warm'), 'sand');
  assert.equal(getThemeName('wp-art-rain'), 'blue');
  assert.equal(getThemeName('wp-plus-haven'), 'lavender');
  assert.equal(getThemeName('wp-plus-library'), 'sand');
  assert.equal(getThemeName('wp-plus-rainy-lake'), 'blue');
  assert.equal(getThemeName('wp-art-forest'), 'sage');
  assert.equal(getThemeName('wp-art-lavender-lake'), 'lavender');
  assert.equal(getThemeName('wp-art-sand-nook'), 'sand');
  assert.equal(getThemeName('wp-art-rose-terrace'), 'rose');
  assert.equal(getThemeName('wp-art-charcoal-library'), 'charcoal');
  assert.equal(getThemeName('wp-plus-observatory'), 'blue');
  assert.equal(getThemeName('wp-plus-kyoto'), 'sage');
  assert.equal(getThemeName('wp-plus-aurora-spire'), 'sage');
  assert.equal(getThemeName('wp-plus-grand-archive'), 'sage');
  assert.equal(getThemeName('wp-plus-solarium'), 'sage');
  assert.equal(getThemeName('wp-motion-nebula'), 'blue');
  assert.equal(getThemeName('wp-motion-rain'), 'sage');
  assert.equal(getThemeName('wp-motion-aurora'), 'blue');
  assert.equal(getThemeName('wp-motion-embers'), 'sand');
  assert.equal(getThemeName('wp-motion-sakura'), 'sage');
});

test('retired selections migrate to existing themes, current selections stay intact', () => {
  for (const id of ['wp-grad-pine', 'wp-grad-amber', 'wp-grad-twilight', 'wp-sanctra-rain', 'unknown']) {
    assert.ok(WALLPAPER_PRESETS.some(p => p.id === resolveWallpaperId(id)));
  }
  assert.equal(resolveWallpaperId('wp-grad-twilight'), 'wp-art-lavender-lake');
  assert.equal(resolveWallpaperId('wp-plus-haven'), 'wp-plus-observatory');
  assert.equal(resolveWallpaperId('wp-plus-library'), 'wp-motion-nebula');
  assert.equal(resolveWallpaperId('wp-plus-rainy-lake'), 'wp-plus-kyoto');
  for (const preset of WALLPAPER_PRESETS) assert.equal(resolveWallpaperId(preset.id), preset.id);
});

test('Plus avatar presets are defined with valid animated SVG paths and metadata', () => {
  assert.equal(new Set(PLUS_AVATAR_PRESETS.map(a=>a.id)).size, PLUS_AVATAR_PRESETS.length);
  for (const av of PLUS_AVATAR_PRESETS) {
    assert.ok(av.id.startsWith('av-') || av.id.startsWith('identity-'));
    assert.ok(av.name);
    assert.ok(av.subtitle);
    assert.ok(av.url.startsWith('/avatars/plus-') || av.url.startsWith('/avatars/identity-'));
    assert.ok(av.url.endsWith('.svg'));
    assert.equal(av.isPlusOnly, true);
  }
});

test('default is Cloudside Study Desk and every retired gradient migrates to matching image scenery',()=>{
 assert.equal(DEFAULT_USER_SETTINGS.activeWallpaperId,'wp-art-rain');
 for(const id of ['wp-abstract-sage','wp-abstract-warm','wp-theme-blue','wp-theme-lavender','wp-theme-rose','wp-theme-charcoal']){
  const resolved=resolveWallpaperId(id);assert.equal(getThemeName(resolved),getThemeName(id));assert.ok(WALLPAPER_PRESETS.find(p=>p.id===resolved)?.url);
 }
});

test('removed background choices resolve to existing scenes without changing other settings',()=>{
 const retired=['wp-art-forest','wp-plus-solarium','wp-motion-aurora','wp-motion-embers','wp-motion-sakura','wp-video-rain-still','wp-weather-lake'];
 for(const id of retired){assert.ok(!WALLPAPER_PRESETS.some(p=>p.id===id));assert.ok(WALLPAPER_PRESETS.some(p=>p.id===resolveWallpaperId(id)));}
});
