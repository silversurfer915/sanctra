import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {WALLPAPER_PRESETS} from '../src/utils/storage.ts';
import {THEME_PALETTES,PRESET_THEME_MAP,getThemeName} from '../src/utils/wallpaperTheme.ts';
import {earlyThemeScript} from '../src/utils/earlyTheme.ts';
function boot(id:string,landing=false,scene?:string) {
 const properties:Record<string,string>={};
 const cache:Record<string,string>={'sanctra_auth_user_v1':JSON.stringify({uid:'test-user'}),'sanctra_settings_test-user_v1':JSON.stringify({activeWallpaperId:id})};
 if(scene)cache.sanctra_landing_atmosphere=scene;
 vm.runInNewContext(earlyThemeScript(),{URLSearchParams,location:{search:landing?'?landing=true':''},localStorage:{getItem:(key:string)=>cache[key]??null},document:{documentElement:{style:{setProperty:(key:string,value:string)=>properties[key]=value}},querySelector:()=>null}});
 return properties;
}
test('all shipped wallpapers have deliberate palettes and identical first-paint/runtime colors',()=>{
 for(const preset of WALLPAPER_PRESETS){
  assert.ok(PRESET_THEME_MAP[preset.id],`${preset.id} has no explicit palette`);
  const palette=THEME_PALETTES[getThemeName(preset.id)],paint=boot(preset.id);
  assert.equal(paint['--sanctra-sage'],palette.accent,preset.name);
  assert.equal(paint['--sanctra-surface'],palette.surface,preset.name);
  assert.equal(paint['--sanctra-boot-ink'],palette.ink,preset.name);
 }
 assert.equal(getThemeName('wp-plus-abstract-pink-silk'),'rose');
 assert.equal(getThemeName('wp-plus-abstract-lavender'),'lavender');
 assert.equal(getThemeName('wp-plus-abstract-cirrus'),'blue');
 assert.equal(getThemeName('wp-art-charcoal-library'),'charcoal');
});
test('landing atmosphere does not inherit account wallpaper, and saved atmosphere is respected',()=>{
 assert.equal(boot('wp-art-forest',true)['--sanctra-sage'],THEME_PALETTES.blue.accent);
 assert.equal(boot('wp-art-rain',true,'Evening Stillness')['--sanctra-sage'],THEME_PALETTES.sage.accent);
});

// User-selected backgrounds must not turn forms, navigation, or modals green/blue.
test('scenery changes accents while all reading surfaces stay neutral and accessible',()=>{
 const luminance=(hex:string)=>{const rgb=hex.slice(1).match(/../g)!.map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 for(const palette of Object.values(THEME_PALETTES)){
  assert.equal(palette.ink,THEME_PALETTES.lavender.ink);
  assert.equal(palette.surface,THEME_PALETTES.lavender.surface);
  assert.equal(palette.muted,THEME_PALETTES.lavender.muted);
  assert.ok((luminance(palette.muted)+.05)/(luminance(palette.surface)+.05)>=4.5);
  assert.ok((luminance(palette.accent)+.05)/(luminance(palette.ink)+.05)>=4.5);
 }
});
