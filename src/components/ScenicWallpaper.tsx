import type {UserSettings} from '../types/index.ts';
import {WALLPAPER_PRESETS,resolveWallpaperId} from '../utils/storage.ts';
import {VipMedia} from './VipMedia.tsx';
import {SceneImage} from './SceneImage.tsx';
import {WeatherOverlay} from './WeatherOverlay.tsx';
import {LandingAtmosphereCanvas} from './views/LandingAtmosphereCanvas.tsx';
import {backgroundImageSources} from '../utils/backgroundImages.ts';
import './background-quality.css';

export function ScenicWallpaper({settings}:{settings:UserSettings}){
  const preset=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId))||WALLPAPER_PRESETS[0];

  if (preset.id === 'wp-sanctra-noir' && !settings.customWallpaperUrl) {
    return (
      <div className="scenic-wallpaper-container fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#07090e]" aria-hidden="true">
        {/* Deep Multi-chromatic Ambient Caustics */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_25%,#0d1526_0%,#080b12_55%,#040609_100%)]" />
        
        {/* Amber Solar Core Glow centered behind the dial */}
        <div className="absolute top-[22%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[52vw] h-[52vw] max-w-[680px] max-h-[680px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18)_0%,rgba(229,184,105,0.06)_45%,transparent_70%)] blur-[100px]" />
        
        {/* Top-left Prussian Blue / Cyan Caustic */}
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.16)_0%,rgba(30,58,138,0.10)_45%,transparent_70%)] blur-[95px]" />
        
        {/* Bottom-right Twilight Wisteria Violet Aura */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[46vw] h-[46vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.14)_0%,rgba(99,102,241,0.07)_45%,transparent_70%)] blur-[100px]" />
        
        {/* Bottom-left Emerald Moss Caustic */}
        <div className="absolute bottom-[-10%] left-[16%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12)_0%,transparent_70%)] blur-[95px]" />

        {/* Living Atmospheric Rain Canvas, Cozy Bokeh & Spores */}
        <LandingAtmosphereCanvas />

        {/* Subtle Vignette Mask */}
        <div className="absolute inset-0 bg-[radial-gradient(130%_95%_at_50%_40%,transparent_50%,rgba(6,8,12,0.80))]" />
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
