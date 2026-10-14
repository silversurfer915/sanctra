import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ScenicWallpaper} from '../src/components/ScenicWallpaper.tsx';
import {TimerDial} from '../src/components/TimerDial.tsx';
import {QuoteBanner} from '../src/components/QuoteBanner.tsx';
import {DEFAULT_USER_SETTINGS} from '../src/utils/storage.ts';
import '../src/index.css';import '../src/styles-sanctra.css';
function Preview(){const [ocean,setOcean]=useState(false);return <div className="sanctra-app" style={{minHeight:'100dvh',isolation:'isolate',padding:'24px'}}><ScenicWallpaper settings={{...DEFAULT_USER_SETTINGS,activeWallpaperId:ocean?'wp-video-ocean':'wp-art-forest',plusMotionWallpaperEnabled:ocean}}/><nav style={{display:'flex',gap:12,marginBottom:32}}><button className="analytics-button" onClick={()=>setOcean(false)}>Woodland Stillness</button><button className="analytics-button" onClick={()=>setOcean(true)}>Ocean Stillness</button></nav><div style={{maxWidth:900,margin:'auto'}}><QuoteBanner/><div style={{marginTop:32}}><TimerDial seconds={1500} totalTargetSeconds={1500} canSave={false} mode="pomodoro-25" status="idle" isFullscreen={false} onToggleStart={()=>{}} onRequestReset={()=>{}} onRequestSave={()=>{}} onToggleFullscreen={()=>{}} onOpenModeModal={()=>{}}/></div></div></div>};createRoot(document.getElementById('root')!).render(<Preview/>);
