const base='/backgrounds/quality-v4/';
const nativeWidths:Record<string,number>={
 'landing-stillness':1672,'timer-stillness':1672,
 'illustrated-forest.v2':1672,'illustrated-study-desk.v2':1672,'illustrated-lavender-lake.v2':1672,
 'illustrated-sand-nook':1672,'illustrated-rose-terrace':1672,'illustrated-charcoal-library':1672,
 'ocean-landing-hd':1920,'river-still':1920,'stream-still':1920,'lake-still':1920,
 'fire-still':1920,'waterfall-still':1920,'rain-still':1920,
};
export const LANDING_BACKGROUND=`${base}landing-stillness-1672.webp`;
export const TIMER_BACKGROUND=`${base}timer-stillness-1672.webp`;
export const OCEAN_POSTER=`${base}ocean-landing-hd-1920.webp`;
export function backgroundImageSources(url:string){
 const name=url.startsWith(base)?url.slice(base.length).replace(/-\d+\.(webp|jpg)$/,''):
  url.startsWith('/backgrounds/')?url.split('/').pop()!.replace(/\.(webp|jpg)$/,''):'';
 const width=nativeWidths[name];
 if(!width)return null;
 const widths=[640,1280,width];
 const set=(format:string)=>widths.map(w=>`${base}${name}-${w}.${format} ${w}w`).join(', ');
 return {src:`${base}${name}-${width}.jpg`,webp:set('webp'),jpg:set('jpg'),width,height:Math.round(width*941/1672)};
}
