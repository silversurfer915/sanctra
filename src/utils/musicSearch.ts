export interface MusicSearchResult {id:string;title:string;channel:string;thumbnail:string;url:string;}
export async function searchMusic(query:string,signal?:AbortSignal):Promise<MusicSearchResult[]> {
 const key=import.meta.env.VITE_YOUTUBE_SEARCH_API_KEY;
 if(!key)throw new Error('Music search is being connected. You can still paste a YouTube link below.');
 const params=new URLSearchParams({key,part:'snippet',q:query.trim(),type:'video',videoEmbeddable:'true',videoCategoryId:'10',maxResults:'12',safeSearch:'moderate'});
 const response=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{signal});
 const data=await response.json();if(!response.ok)throw new Error(data.error?.errors?.[0]?.reason==='quotaExceeded'?'Music search has reached its daily limit. Saved sounds and links still work.':'Music search is temporarily unavailable. Try again shortly.');
 const decode=(value:string)=>{const element=document.createElement('textarea');element.innerHTML=value;return element.value;};
 return (data.items||[]).flatMap((item:any)=>typeof item.id?.videoId==='string'?[{id:item.id.videoId,title:decode(item.snippet.title),channel:decode(item.snippet.channelTitle),thumbnail:item.snippet.thumbnails?.medium?.url||'',url:'https://www.youtube.com/watch?v='+item.id.videoId}]:[]);
}
