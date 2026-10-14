import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,statSync}from'node:fs';
// Prevent replacing an optimized clip with a huge or metadata-at-end upload:
// every preset must download quickly and initialize without another range seek.
test('all bundled scenic clips are compact MP4 files with metadata before video data',()=>{
 for(const name of ['ocean-landing-hd','river-still','stream-still','lake-still','fire-still','waterfall-still','rain-still']){
  const path=`public/backgrounds/video/quality-v4/${name}.mp4`;
  assert.ok(statSync(path).size<35_000_000,`${name} exceeds background download budget`);
  const bytes=readFileSync(path);let offset=0,moov=-1,mdat=-1;
  while(offset+8<=bytes.length){const size=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);assert.ok(size>=8);if(kind==='moov')moov=offset;if(kind==='mdat')mdat=offset;offset+=size;}
  assert.ok(moov>=0&&mdat>moov,`${name} must include fast-start metadata`);
 }
});
