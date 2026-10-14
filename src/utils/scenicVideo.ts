const nativeScenes=new Set(['ocean-waves-loop-v2','ocean-waves','ocean-landing-hd','river-still','stream-still','lake-still','fire-still','waterfall-still','rain-still']);
/** Safari streams complete HLS segments, without relying on MP4 byte-range responses. */
export function scenicVideoSource(url:string,nativeHls:boolean) {
 const match=url.match(/^\/backgrounds\/video\/([a-z0-9-]+)\.mp4$/);
 return nativeHls && match && nativeScenes.has(match[1])?`/backgrounds/video/hls/${match[1]}/index.m3u8`:url;
}
