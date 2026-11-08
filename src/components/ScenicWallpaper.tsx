import type {UserSettings} from '../types/index.ts';
import {WALLPAPER_PRESETS,resolveWallpaperId} from '../utils/storage.ts';
import {getThemePreset, resolveThemeId} from '../utils/themeRegistry.ts';
import {VipMedia} from './VipMedia.tsx';
import {SceneImage} from './SceneImage.tsx';
import {WeatherOverlay} from './WeatherOverlay.tsx';
import {backgroundImageSources} from '../utils/backgroundImages.ts';
import './background-quality.css';

export function ScenicWallpaper({settings}:{settings:UserSettings}){
  const preset=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId))||WALLPAPER_PRESETS[0];
  const activeTheme = getThemePreset(resolveThemeId(settings.activeThemeId));

  const image=settings.customWallpaperUrl||preset.url;
  const isMotionAllowed = !preset.isPlusOnly || settings.plusMotionWallpaperEnabled;
  const video = !settings.customWallpaperUrl && isMotionAllowed
    ? (preset.motionUrl || (settings.plusMotionWallpaperEnabled ? settings.plusMotionWallpaperUrl : undefined))
    : undefined;
  const sources=backgroundImageSources(image);
  const isWeather=preset.type==='weather'||Boolean(preset.weatherType);
  return (
    <div className="scenic-wallpaper-container fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true" style={{background:'var(--sanctra-ink)'}}>
      {sources&&<link rel="preload" as="image" type="image/webp" href={image} imageSrcSet={sources.webp} imageSizes="100vw" fetchPriority="high"/>}
      <div className="wallpaper-layer absolute inset-0">
        <SceneImage key={image} src={image} alt="" loading="eager" fetchPriority="high" decoding="sync" onError={e=>{if(e.currentTarget.src!==new URL(preset.url,window.location.href).href)e.currentTarget.src=preset.url;}} className={`scenic-illustration w-full h-full ${settings.wallpaperFitMode==='fit'?'object-contain':'object-cover'}`}/>
      </div>
      {video&&<VipMedia url={video} fallback={image} className={`vip-motion-wallpaper ${settings.wallpaperFitMode==='fit'?'wallpaper-contain':''}`} motion decorative/>}
      {isWeather&&!settings.customWallpaperUrl&&<WeatherOverlay weatherType={preset.weatherType || 'rain'} />}
      <div className="absolute inset-0 z-[2] bg-black" style={{opacity:(settings.backgroundDimness??25)/100}}/>
      <div className="absolute inset-0 z-[3]" style={{background:'linear-gradient(0deg,color-mix(in srgb,var(--sanctra-ink) 70%,transparent),transparent 50%,color-mix(in srgb,var(--sanctra-ink) 35%,transparent))'}}/>
      
      {/* Dynamic Theme-Adaptive Radiant Core Spotlight (blooms gently behind the clock dial) */}
      <div
        className="absolute top-[32%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[54vw] h-[54vw] max-w-[640px] max-h-[640px] rounded-full blur-[110px] transition-all duration-700 pointer-events-none z-[4]"
        style={{
          background: `radial-gradient(circle, ${activeTheme.accent}24 0%, ${activeTheme.accent}08 48%, transparent 72%)`,
        }}
      />

      {/* Cinematic Vignette Scrim for flawless text legibility */}
      <div className="absolute inset-0 z-[5] bg-[radial-gradient(130%_95%_at_50%_40%,transparent_50%,rgba(4,5,8,0.65))] pointer-events-none" />
    </div>
  );
}
