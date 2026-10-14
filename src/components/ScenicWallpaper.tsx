import type {UserSettings} from '../types/index.ts';
import {WALLPAPER_PRESETS,resolveWallpaperId} from '../utils/storage.ts';
import {VipMedia} from './VipMedia.tsx';
import {SceneImage} from './SceneImage.tsx';
import {WeatherOverlay} from './WeatherOverlay.tsx';
import {backgroundImageSources} from '../utils/backgroundImages.ts';
import './background-quality.css';
export function ScenicWallpaper({settings}:{settings:UserSettings}){
 const preset=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId))||WALLPAPER_PRESETS[0];
 const image=settings.customWallpaperUrl||preset.url;
 const video=settings.plusMotionWallpaperEnabled&&!settings.customWallpaperUrl?settings.plusMotionWallpaperUrl||preset.motionUrl:undefined;
 const sources=backgroundImageSources(image);
 const isWeather=preset.type==='weather'||Boolean(preset.weatherType);
 return <div className="scenic-wallpaper-container fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none" aria-hidden="true" style={{background:'var(--sanctra-ink)'}}>
 {sources&&<link rel="preload" as="image" type="image/webp" href={image} imageSrcSet={sources.webp} imageSizes="100vw" fetchPriority="high"/>}
 <div className="wallpaper-layer absolute inset-0"><SceneImage key={image} src={image} alt="" loading="eager" fetchPriority="high" decoding="sync" onError={e=>{if(e.currentTarget.src!==new URL(preset.url,window.location.href).href)e.currentTarget.src=preset.url;}} className={`scenic-illustration w-full h-full ${settings.wallpaperFitMode==='fit'?'object-contain':'object-cover'}`}/></div>
 {video&&<VipMedia url={video} fallback={image} className={`vip-motion-wallpaper ${settings.wallpaperFitMode==='fit'?'wallpaper-contain':''}`} motion decorative/>}
 {isWeather&&!settings.customWallpaperUrl&&<WeatherOverlay weatherType={preset.weatherType || 'rain'} />}
 <div className="absolute inset-0 z-[2] bg-black" style={{opacity:(settings.backgroundDimness??25)/100}}/>
 <div className="absolute inset-0 z-[3]" style={{background:'linear-gradient(0deg,color-mix(in srgb,var(--sanctra-ink) 70%,transparent),transparent 50%,color-mix(in srgb,var(--sanctra-ink) 35%,transparent))'}}/>
 </div>;
}
