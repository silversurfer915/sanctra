import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSavedSound,normalizeSoundLibrary} from '../src/utils/soundLibrary.ts';
import {parseYouTubeUrl} from '../src/utils/youtubeHelper.ts';
test('saved sounds reject deceptive hosts and canonicalize links',()=>{
 assert.equal(parseYouTubeUrl('https://evil.example/playlist?list=PL12345678901'),null);
 assert.equal(parseYouTubeUrl('http://youtube.com/watch?v=dQw4w9WgXcQ'),null);
 assert.throws(()=>createSavedSound('Rain','https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','a'));
 assert.deepEqual(createSavedSound(' Rain ','https://youtu.be/dQw4w9WgXcQ?t=10','a'),{id:'a',title:'Rain',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});
 const good=createSavedSound('Rain','dQw4w9WgXcQ','a');assert.deepEqual(normalizeSoundLibrary([good,good,{id:'bad',url:'evil'},null]),[good]);
});
