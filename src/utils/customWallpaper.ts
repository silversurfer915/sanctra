import {checkImageSource} from './vipMedia.ts';
export const MAX_WALLPAPER_DATA_LENGTH=360000;
export function validateWallpaperImageUrl(value:string):string{
 const raw=value.trim();if(!raw||raw.length>2048)throw new Error('Enter an image link under 2,048 characters.');
 let url:URL;try{url=new URL(raw);}catch{throw new Error('Use a secure HTTPS image link.');}
 if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use a secure HTTPS image link without login details.');
 if(/\.(mp4|webm|m3u8)(?:$)/i.test(url.pathname))throw new Error('Use an image link here. Video links belong under “Use your own video”.');
 return url.href;
}
export async function checkWallpaperImageUrl(value:string){return checkImageSource(validateWallpaperImageUrl(value));}
export function validateWallpaperImageFile(file:{type:string;size:number}){
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Choose a JPEG, PNG, WebP or AVIF image.');
 if(!file.size||file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
}
/** Keep the account-synced wallpaper well below Firestore's document size limit. */
export async function prepareWallpaperImage(file:File):Promise<string>{
 validateWallpaperImageFile(file);const source=URL.createObjectURL(file);
 try{
 const image=new Image();image.src=source;await image.decode();
 if(!image.naturalWidth||!image.naturalHeight)throw new Error('This image could not be read. Try another image.');
 let scale=Math.min(1,2560/image.naturalWidth,2560/image.naturalHeight);
 const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)throw new Error('Image processing is unavailable in this browser.');
 for(let attempt=0;attempt<10;attempt++){
 canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 const result=canvas.toDataURL('image/jpeg',.85);if(result.length<=MAX_WALLPAPER_DATA_LENGTH)return result;scale*=.85;
 }
 throw new Error('This image is too detailed to save. Try a smaller image.');
 }catch(error){throw new Error(error instanceof Error?error.message:'Unable to read this image. Try another image.');}finally{URL.revokeObjectURL(source);}
}
