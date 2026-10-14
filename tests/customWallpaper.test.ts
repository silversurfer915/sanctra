import test from 'node:test';import assert from 'node:assert/strict';
import {validateWallpaperImageUrl,validateWallpaperImageFile} from '../src/utils/customWallpaper.ts';
test('custom wallpaper allows secure image URLs and rejects video or executable schemes',()=>{
 assert.equal(validateWallpaperImageUrl(' https://images.example.com/background?id=1 '),'https://images.example.com/background?id=1');
 for(const url of ['javascript:alert(1)','data:image/svg+xml;base64,abc','https://user:pass@example.com/a.jpg','https://example.com/a.mp4','//example.com/a.jpg'])assert.throws(()=>validateWallpaperImageUrl(url));
});
test('custom image upload rejects unsupported and oversized files before decoding',()=>{
 validateWallpaperImageFile({type:'image/png',size:1024});
 assert.throws(()=>validateWallpaperImageFile({type:'video/mp4',size:1024}));
 assert.throws(()=>validateWallpaperImageFile({type:'image/jpeg',size:21*1024*1024}));
});
