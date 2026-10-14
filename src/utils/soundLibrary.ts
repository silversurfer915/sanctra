import {parseYouTubeUrl} from './youtubeHelper.ts';
export interface SavedSound {id:string;title:string;url:string}
export function createSavedSound(title:string,url:string,id:string):SavedSound {
 const name=title.trim();if(!name||name.length>80)throw new Error('Give this sound a name between 1 and 80 characters.');
 const resource=parseYouTubeUrl(url);if(!resource)throw new Error('Paste a valid YouTube video or playlist link.');
 return {id,title:name,url:resource.type==='playlist'?`https://www.youtube.com/playlist?list=${resource.id}`:`https://www.youtube.com/watch?v=${resource.id}`};
}
export function normalizeSoundLibrary(raw:unknown):SavedSound[]{
 if(!Array.isArray(raw))return [];const seen=new Set<string>();
 return raw.slice(0,25).flatMap(item=>{try{if(typeof item?.id!=='string'||seen.has(item.id))return [];const sound=createSavedSound(item.title,item.url,item.id);seen.add(item.id);return [sound];}catch{return [];}});
}
