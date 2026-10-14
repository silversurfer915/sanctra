export interface ImageAttachment {dataUrl:string;width:number;height:number;}
export function validImageAttachment(value:unknown):value is ImageAttachment {
 const v=value as ImageAttachment|undefined;
 return !!v&&typeof v.dataUrl==='string'&&v.dataUrl.length<=180000&&/^data:image\/(?:jpeg|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.dataUrl)&&Number.isInteger(v.width)&&Number.isInteger(v.height)&&v.width>0&&v.height>0&&v.width<=1600&&v.height<=1600;
}
export async function prepareImageAttachment(file:File):Promise<ImageAttachment> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP image.');
 if(file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
 const source=URL.createObjectURL(file);
 try{
 const image=new Image();image.src=source;await image.decode();
 let scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);
 const canvas=document.createElement('canvas');let result:ImageAttachment;
 for(let attempt=0;attempt<8;attempt++){
 canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const context=canvas.getContext('2d');if(!context)throw new Error('Image processing is unavailable.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 result={dataUrl:canvas.toDataURL('image/jpeg',.82),width:canvas.width,height:canvas.height};if(validImageAttachment(result))return result;scale*=.8;
 }
 throw new Error('This image is too detailed to attach. Try a smaller image.');
 }catch(e){throw new Error(e instanceof Error?e.message:'Unable to read this image.');}finally{URL.revokeObjectURL(source);}
}

/** Keep small GIFs animated; converting them through canvas would flatten them. */
export async function prepareGifAttachment(file:File):Promise<ImageAttachment>{
 if(file.type!=='image/gif')throw new Error('Choose an animated GIF file.');
 if(file.size>128*1024)throw new Error('Choose a GIF under 128 KB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6))))throw new Error('This file is not a valid GIF.');
 const width=bytes[6]|bytes[7]<<8,height=bytes[8]|bytes[9]<<8;
 const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read this GIF.'));reader.readAsDataURL(file);});
 const image={dataUrl,width,height};if(!validImageAttachment(image))throw new Error('GIF dimensions must be between 1 and 1600 pixels.');return image;
}
