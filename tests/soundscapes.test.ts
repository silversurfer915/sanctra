import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playSoundscape,stopSoundscape,getSoundscapeState} from '../src/utils/soundscapes.ts';
test('a fading old sound cannot stop the newly selected sound',async()=>{
 const delayed:Function[]=[],sources:{stopped:boolean}[]=[];
 const parameter={value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}};
 class FakeAudio {state='running';sampleRate=10;currentTime=0;destination={};createGain(){return {gain:{...parameter},connect(){},disconnect(){}};}createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}createBiquadFilter(){return {frequency:{value:0},connect(){},disconnect(){}};}createBufferSource(){const source={stopped:false,connect(){},disconnect(){},start(){},stop(){this.stopped=true;}};sources.push(source);return source;}}
 const old=(globalThis as any).window;(globalThis as any).window={AudioContext:FakeAudio,setTimeout:(cb:Function)=>{delayed.push(cb);return 1;}};
 try {await playSoundscape('brown');await playSoundscape('pink');delayed.forEach(cb=>cb());assert.equal(sources[0].stopped,true);assert.equal(sources[1].stopped,false);assert.equal(getSoundscapeState().currentId,'pink');stopSoundscape(0);assert.equal(sources[1].stopped,true);assert.equal(getSoundscapeState().isPlaying,false);}finally{(globalThis as any).window=old;}
});
