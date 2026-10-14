import type {AiImage} from './gateway.ts';
export interface PlanImage extends AiImage {name:string;preview:string}
export async function preparePlanImage(file:File):Promise<PlanImage> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
 if(file.size>12*1024*1024)throw new Error('Choose a photo smaller than 12 MB.');
 const url=URL.createObjectURL(file);
 try {
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo preview is unavailable.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const preview=canvas.toDataURL('image/jpeg',.85),data=preview.split(',')[1];
  if(data.length>4*1024*1024)throw new Error('Choose a smaller photo.');
  return {mimeType:'image/jpeg',data,name:file.name,preview};
 }catch(error){if(error instanceof Error&&/Choose|preview/.test(error.message))throw error;throw new Error('This photo could not be opened. Choose another image.');}
 finally {URL.revokeObjectURL(url);}
}
