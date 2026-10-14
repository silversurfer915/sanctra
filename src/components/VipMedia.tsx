import { useEffect, useRef, useState } from 'react';
import {animatedPortraitFallback} from '../utils/profilePortraits.ts';
import { isVideoMedia } from '../utils/vipMedia.ts';
import {loadScenicVideo} from '../utils/scenicVideoPlayback.ts';

export function VipMedia({url, fallback = '', name = '', className = '', decorative = false, motion = isVideoMedia(url) || /\.gif(?:[?#]|$)/i.test(url)}: {url:string;fallback?:string;name?:string;className?:string;decorative?:boolean;motion?:boolean}) {
  fallback=animatedPortraitFallback(url,fallback);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced,setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [failed,setFailed] = useState(false);
  const [fallbackFailed,setFallbackFailed] = useState(false);
  useEffect(() => { const media=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change); },[]);
  useEffect(()=>{setFailed(false);setFallbackFailed(false);},[url,fallback]);
  const source = failed || (reduced && motion) ? (fallbackFailed?'':fallback) : url;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const controller=new AbortController();
    let disposed=false;
    let release:()=>void=()=>{};
    const mediaError=()=>{if(!disposed)setFailed(true);};
    const syncPlayback=()=>{
      if(document.hidden||reduced)video.pause();
      else if(video.getAttribute('src')&&video.paused){
        video.muted=true;video.defaultMuted=true;
        void video.play().catch((error:DOMException)=>{
          if(!disposed&&!document.hidden&&error.name!=='NotAllowedError'&&error.name!=='AbortError')mediaError();
        });
      }
    };
    // Keep the poster visible until the complete curated clip is ready. Playback
    // then loops from memory rather than starting on a one-second network buffer.
    video.addEventListener('canplay',syncPlayback);
    video.addEventListener('error',mediaError);
    document.addEventListener('visibilitychange',syncPlayback);
    document.addEventListener('pointerdown',syncPlayback,{capture:true});
    document.addEventListener('keydown',syncPlayback,{capture:true});
    void loadScenicVideo(source,controller.signal).then(media=>{
      if(disposed){media.release();return;}
      release=media.release;video.src=media.src;video.load();syncPlayback();
    }).catch(()=>{if(!disposed)mediaError();});
    return()=>{
      disposed=true;controller.abort();
      document.removeEventListener('visibilitychange',syncPlayback);
      document.removeEventListener('pointerdown',syncPlayback,true);
      document.removeEventListener('keydown',syncPlayback,true);
      video.removeEventListener('canplay',syncPlayback);video.removeEventListener('error',mediaError);
      video.pause();video.removeAttribute('src');video.load();release();
    };
  },[source,reduced]);
  if (!source) return decorative ? null : <span className={className} aria-label={name}>{name.slice(0,1).toUpperCase()}</span>;
  if (isVideoMedia(source)) return <video ref={videoRef} key={source} className={className} data-playback="loading" onPlaying={e=>{e.currentTarget.dataset.playback='playing';}} onPause={e=>{e.currentTarget.dataset.playback='paused';}} muted autoPlay loop playsInline preload={decorative?"auto":"metadata"} poster={fallback || undefined} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined} />;
  return <img className={className} src={source} alt={decorative?'':name} referrerPolicy="no-referrer" onError={()=>{setFailed(true);if(source===fallback)setFallbackFailed(true);}} />;
}
