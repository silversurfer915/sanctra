import {test} from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{PROFILE_COLLECTIONS,collectionSettings}from'../src/utils/profileCollections.ts';
import{validateVipMediaUrl}from'../src/utils/vipMedia.ts';
test('every identity collection contains scalable artwork and safe coordinated media',async()=>{
 for(const c of PROFILE_COLLECTIONS){const settings=collectionSettings(c.id);assert.equal(settings.plusProfileCoverUrl,c.cover);assert.equal(settings.plusAnimatedAvatarUrl,c.avatar);assert.equal(settings.plusAvatarEffect,c.aura);
 for(const path of [c.cover,c.avatar]){assert.equal(validateVipMediaUrl(path),path);const bytes=await readFile('public'+path);if(path.endsWith('.webp')){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length>100_000,'Collection banners must use the full artwork, not a small thumbnail');continue;}const svg=bytes.toString();assert.ok(svg.includes('viewBox='));assert.ok(svg.includes('prefers-reduced-motion'));assert.equal(/<script|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),false);}}
 assert.deepEqual(collectionSettings('unknown'),{});
});
