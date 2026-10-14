import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScenicVideo} from '../src/utils/scenicVideoPlayback.ts';
// A full-download source must not become playable before EOF: partial progressive
// responses caused the wallpaper to start briefly and stall on the live site.
test('curated video waits for its complete body and returns a playable local blob',async()=>{
 let finish!:()=>void;
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array([1,2,3]));finish=()=>controller.close();}});
 let ready=false;
 const load=loadScenicVideo('/backgrounds/video/stream-still.mp4',new AbortController().signal,async(input)=>{
  assert.equal(input,'/backgrounds/video/quality-v4/stream-still.mp4');
  return new Response(body,{headers:{'Content-Type':'video/mp4'}});
 }).then(result=>{ready=true;return result;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(ready,false);
 finish();const result=await load;assert.match(result.src,/^blob:/);
 assert.deepEqual(new Uint8Array(await (await fetch(result.src)).arrayBuffer()),new Uint8Array([1,2,3]));
 result.release();await assert.rejects(fetch(result.src));
});
test('unavailable or HTML hosting fallback never becomes a video source',async()=>{
 for(const response of [new Response('part',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/999'}}),new Response('missing',{status:404}),new Response('<html/>',{headers:{'Content-Type':'text/html'}}),new Response('',{headers:{'Content-Type':'video/mp4'}})]){
  await assert.rejects(loadScenicVideo('/backgrounds/video/stream-still.mp4',new AbortController().signal,async()=>response));
 }
});
test('custom and unknown videos keep their URL and are not downloaded by the curated loader',async()=>{
 for(const url of ['https://example.com/custom.mp4','/custom.mp4','/backgrounds/video/unknown.mp4']){
  const result=await loadScenicVideo(url,new AbortController().signal,async()=>{throw new Error('Custom media must use its own player');});
  assert.equal(result.src,url);result.release();
 }
});
