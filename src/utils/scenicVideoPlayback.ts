const curatedScenes=new Set(['lofi-meadow','ocean-waves-loop-v2','ocean-waves','ocean-landing-hd','river-still','stream-still','lake-still','fire-still','waterfall-still','rain-still']);
/** Complete, compact clips avoid a progressive player stalling on a partial range response. */
export async function loadScenicVideo(url:string,signal:AbortSignal,fetchVideo:typeof fetch=fetch):Promise<{src:string;release:()=>void}>{
 const scene=url.match(/^\/backgrounds\/video\/(?:(?:optimized-v3|quality-v4)\/)?([a-z0-9-]+)\.(?:mp4|webm)$/)?.[1];
 if(!scene||!curatedScenes.has(scene))return {src:url,release:()=>{}};
 const hdScene=scene.startsWith('ocean-')?'ocean-landing-hd':scene;
 const webm=typeof document!=='undefined'&&!!document.createElement('video').canPlayType('video/webm; codecs="vp9"');
 const response=await fetchVideo(`/backgrounds/video/quality-v4/${hdScene}.${webm?'webm':'mp4'}`,{signal,cache:'force-cache'});
 if(response.status!==200||!response.headers.get('content-type')?.toLowerCase().startsWith('video/'))throw new Error('Background video unavailable');
 const blob=await response.blob();signal.throwIfAborted();
 if(!blob.size)throw new Error('Background video is empty');
 const src=URL.createObjectURL(blob);
 return {src,release:()=>URL.revokeObjectURL(src)};
}
