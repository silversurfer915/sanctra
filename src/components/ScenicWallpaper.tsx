import type {UserSettings} from '../types/index.ts';
import {WALLPAPER_PRESETS,resolveWallpaperId} from '../utils/storage.ts';
import {getThemePreset, resolveThemeId} from '../utils/themeRegistry.ts';
import {VipMedia} from './VipMedia.tsx';
import {SceneImage} from './SceneImage.tsx';
import {WeatherOverlay} from './WeatherOverlay.tsx';
import {LandingAtmosphereCanvas} from './views/LandingAtmosphereCanvas.tsx';
import {backgroundImageSources} from '../utils/backgroundImages.ts';
import './background-quality.css';

export function ScenicWallpaper({settings}:{settings:UserSettings}){
  const preset=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId))||WALLPAPER_PRESETS[0];

  if (preset.id === 'wp-sanctra-noir' && !settings.customWallpaperUrl) {
    const activeTheme = getThemePreset(resolveThemeId(settings.activeThemeId));
    return (
      <div className="scenic-wallpaper-container fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#05070c]" aria-hidden="true">
        {/* Deep Pristine Velvet Obsidian Base: No murky muddy stops */}
        <div className="absolute inset-0 bg-[radial-gradient(130%_85%_at_50%_0%,#0c1220_0%,#070a12_50%,#040508_100%)]" />
        
        {/* Theme-Adaptive Radiant Core Spotlight (centered behind the clock dial) */}
        <div
          className="absolute top-[28%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[52vw] h-[52vw] max-w-[640px] max-h-[640px] rounded-full blur-[90px] transition-all duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${activeTheme.accent}1f 0%, ${activeTheme.accent}06 45%, transparent 72%)`,
          }}
        />
        
        {/* Upper Zenith Celestial Wash (subtle soft sapphire breath, zero mud) */}
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[70vw] h-[35vw] rounded-full bg-[radial-gradient(ellipse,rgba(56,189,248,0.05)_0%,transparent_70%)] blur-[100px] pointer-events-none" />

        {/* Living Atmospheric Rain Canvas & Crystalline Starlight Spores */}
        <LandingAtmosphereCanvas />

        {/* Clean, Non-Muddy Obsidian Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(130%_95%_at_50%_40%,transparent_55%,rgba(4,5,8,0.72))]" />
      </div>
    );
  }

  const image=settings.customWallpaperUrl||preset.url;
  const video=settings.plusMotionWallpaperEnabled&&!settings.customWallpaperUrl?settings.plusMotionWallpaperUrl||preset.motionUrl:undefined;
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
    </div>
  );
}
