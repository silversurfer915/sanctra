import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STUDY_COUNTRIES,STUDY_STATUSES,studyDetailChoice,cleanStudyDetails} from '../src/utils/studyDetailsOptions.ts';
import {ANIMATED_PORTRAITS,animatedPortraitFallback,validateAnimatedPortraitUrl} from '../src/utils/profilePortraits.ts';

test('study details retain supported profile values',()=>{
 const details={status:'School Student',stream:'PCM',city:' Coimbatore ',country:' India '};
 const saved=cleanStudyDetails(details);
 assert.equal(saved.stream,'PCM');assert.equal(saved.city,'Coimbatore');
 assert.equal(studyDetailChoice('University student',STUDY_STATUSES),'University student');
 assert.ok(STUDY_COUNTRIES.includes('India'));assert.ok(STUDY_COUNTRIES.length>200);
});
test('five motion choices ship real looping GIFs and independent still fallbacks',async()=>{
 assert.equal(ANIMATED_PORTRAITS.length,5);
 for(const portrait of ANIMATED_PORTRAITS){
  const gif=await readFile('public'+portrait.url);assert.match(gif.subarray(0,6).toString(),/^GIF8[79]a$/);assert.ok(gif.includes(Buffer.from('NETSCAPE2.0')));assert.ok(gif.length<600000);
  const poster=await readFile('public'+portrait.poster);assert.equal(poster.subarray(0,4).toString(),'RIFF');
  assert.equal(animatedPortraitFallback(portrait.url,''),portrait.poster);
 }
 assert.equal(animatedPortraitFallback('https://example.com/own.gif','still'),'still');
});
test('custom animated portraits accept secure GIF and MP4 links without login details',()=>{
 assert.equal(validateAnimatedPortraitUrl(' https://example.com/portrait.gif '),'https://example.com/portrait.gif');
 assert.equal(validateAnimatedPortraitUrl('https://example.com/portrait.mp4?token=public'),'https://example.com/portrait.mp4?token=public');
 assert.throws(()=>validateAnimatedPortraitUrl('http://example.com/portrait.gif'));
 assert.throws(()=>validateAnimatedPortraitUrl('https://user:secret@example.com/portrait.mp4'));
 assert.throws(()=>validateAnimatedPortraitUrl('https://example.com/photo.jpg'));
});
