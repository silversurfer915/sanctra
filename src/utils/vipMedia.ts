export function validateVipMediaUrl(value: string, videoOnly = false): string {
  const url = value.trim();
  if (!url) return '';
  if (url.length > 2048) throw new Error('Media links must be at most 2048 characters.');

  if (url.startsWith('/')) {
    if (url.startsWith('//') || url.includes('\\') || /[\0\r\n]/.test(url)) {
      throw new Error('Invalid internal media path.');
    }
    const pattern = videoOnly ? /\.(mp4|webm)$/i : /\.(gif|webp|png|jpg|jpeg|avif|mp4|webm|svg)$/i;
    const pathname = url.split('?')[0].split('#')[0];
    if (!pattern.test(pathname)) {
      throw new Error(videoOnly ? 'Use a direct MP4 or WebM link.' : 'Use a direct image, GIF, SVG, MP4 or WebM link.');
    }
    return url;
  }

  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('Enter a secure HTTPS media link.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Enter a secure HTTPS media link without login details.');
  const pattern = videoOnly ? /\.(mp4|webm)$/i : /\.(gif|webp|png|jpg|jpeg|avif|mp4|webm|svg)$/i;
  if (!pattern.test(parsed.pathname)) throw new Error(videoOnly ? 'Use a direct MP4 or WebM link.' : 'Use a direct image, GIF, SVG, MP4 or WebM link.');
  return parsed.href;
}
export function isVideoMedia(url: string): boolean {
  try { return /\.(mp4|webm)$/i.test(new URL(url, 'https://sanctrastudy.live').pathname); } catch { return false; }
}

/** Verify a decoded video frame before replacing a working wallpaper. */
export async function checkVideoSource(value:string):Promise<string> {
 const url=validateVipMediaUrl(value,true);if(!url)return '';
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 await new Promise<void>((resolve,reject)=>{
  let done=false;
  const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);video.onloadeddata=null;video.onerror=null;video.removeAttribute('src');video.load();error?reject(error):resolve();};
  const timer=setTimeout(()=>finish(new Error('This video did not load. Try another direct video link.')),12000);
  video.onerror=()=>finish(new Error('This link cannot play as a background. Use an accessible MP4 or WebM video.'));
  video.onloadeddata=()=>finish(video.videoWidth&&video.videoHeight?undefined:new Error('This link does not contain a playable video.'));
  video.src=url;video.load();
 });return url;
}
/** Load an image before saving it; decoding works without reading cross-origin pixels. */
export async function checkImageSource(value:string):Promise<string> {
 const url=value.trim();if(!url)return '';
 if(!url.startsWith('/')||url.startsWith('//')){const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('Use a secure image link without login details.');}
 await new Promise<void>((resolve,reject)=>{const img=new Image();let done=false;const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;img.src='';error?reject(error):resolve();};const timer=setTimeout(()=>finish(new Error('This image did not load. Try another image link.')),10000);img.onload=()=>finish(img.naturalWidth?undefined:new Error('This image could not be decoded.'));img.onerror=()=>finish(new Error('This image link does not load. Your current appearance has been kept.'));img.referrerPolicy='no-referrer';img.src=url;});return url;
}
export async function checkProfileMedia(value:string):Promise<string> {const url=validateVipMediaUrl(value);return isVideoMedia(url)?checkVideoSource(url):checkImageSource(url);}
