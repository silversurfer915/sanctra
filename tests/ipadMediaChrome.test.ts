import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseYouTubeUrl} from '../src/utils/youtubeHelper.ts';
import {syncBrowserChrome} from '../src/utils/browserChrome.ts';

test('browser chrome follows the loaded theme rather than a stale boot palette',()=>{
 const properties=new Map([['--sanctra-boot-ink','#201b2b']]);
 let colour='#201b2b';
 const fake={documentElement:{style:{setProperty:(k:string,v:string)=>properties.set(k,v)}},querySelector:()=>({setAttribute:(_k:string,v:string)=>{colour=v;}})};
 syncBrowserChrome('#131b28',fake as unknown as Document);
 assert.equal(colour,'#131b28');assert.equal(properties.get('--sanctra-boot-ink'),'#131b28');
});

test('video and playlist embeds expose inline playback controls for iPad',()=>{
 for(const link of ['jfKfPfyJRdk','https://youtu.be/jfKfPfyJRdk','https://www.youtube.com/playlist?list=PL1234567890']){
  const resource=parseYouTubeUrl(link)!;
  const query=new URL(resource.embedUrl).searchParams;
  assert.equal(query.get('playsinline'),'1');
  assert.equal(query.get('controls'),'1');
  assert.equal(query.get('autoplay'),'0');
 }
});
