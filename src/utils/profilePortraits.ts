import {validateVipMediaUrl,checkProfileMedia} from './vipMedia.ts';
export const ANIMATED_PORTRAITS = [
 {id:'owl',name:'Book Owl',note:'A thoughtful little companion'},
 {id:'fox',name:'Fern Fox',note:'Quiet woodland character'},
 {id:'koi',name:'Copper Koi',note:'A gentle curve of motion'},
 {id:'moth',name:'Luna Moth',note:'Soft sage wings'},
 {id:'cat',name:'Scarf Cat',note:'A cosy study companion'},
].map(p=>({...p,url:`/avatars/motion/${p.id}.gif`,poster:`/avatars/motion/${p.id}.webp`}));
export const STATIC_PORTRAITS = ANIMATED_PORTRAITS.map(p=>({name:p.name,url:p.poster}));
export function animatedPortraitFallback(url:string,fallback:string):string {
 return ANIMATED_PORTRAITS.find(p=>p.url===url)?.poster||fallback;
}
export function validateAnimatedPortraitUrl(value:string):string {
 const url=validateVipMediaUrl(value);
 if(url&&!/\.(gif|mp4|webm)(?:[?#]|$)/i.test(url))throw new Error('Use a direct HTTPS GIF, MP4 or WebM link for an animated portrait.');
 return url;
}
export async function checkAnimatedPortraitUrl(value:string):Promise<string> {
 const url=validateAnimatedPortraitUrl(value);return url?checkProfileMedia(url):'';
}
