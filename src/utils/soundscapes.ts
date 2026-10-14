/** Bundled nature recordings plus generated noise and harmonic tones. */
export type SoundscapeId='rain'|'rain-heavy'|'ocean'|'river'|'forest'|'wind'|'fire'|'brown'|'pink'|'zen-bowl';
export interface SoundscapePreset {id:SoundscapeId;name:string;category:'Nature'|'Quiet textures';description:string;isPlusOnly?:boolean;recording?:string}
export const SOUNDSCAPE_PRESETS:SoundscapePreset[]=[
 {id:'rain',recording:'/sounds/rain.m4a',name:'Gentle rain',category:'Nature',description:'Light rain with soft, scattered droplets.'},
 {id:'rain-heavy',recording:'/sounds/storm.m4a',name:'Rain & thunder',category:'Nature',description:'Recorded rainfall and distant thunder.'},
 {id:'ocean',recording:'/sounds/waves.m4a',name:'Beach waves',category:'Nature',description:'Slow swells washing across a quiet shore.'},
 {id:'river',recording:'/sounds/stream-water.m4a',name:'Flowing stream',category:'Nature',description:'Bright water ripples over a steady current.'},
 {id:'forest',recording:'/sounds/birds-tree.m4a',name:'Birdsong',category:'Nature',description:'Recorded birds calling outdoors.'},
 {id:'wind',recording:'/sounds/wind.m4a',name:'Wind',category:'Nature',description:'Recorded outdoor wind.'},
 {id:'fire',recording:'/sounds/fire.m4a',name:'Fireside',category:'Nature',description:'Low warmth with small crackling pops.'},
 {id:'brown',name:'Brown noise',category:'Quiet textures',description:'A deep, even texture for a quieter room.'},
 {id:'pink',name:'Pink noise',category:'Quiet textures',description:'Soft, balanced noise to mask distractions.'},
 {id:'zen-bowl',name:'Harmonic chimes',category:'Quiet textures',description:'Generated harmonic tones with a gentle decay.'},
];
export interface SoundscapeSettings {activeSoundscape:SoundscapeId|null;volume:number;playWithTimer:boolean;fadeOnEnd:boolean}
export const DEFAULT_SOUNDSCAPE_SETTINGS:SoundscapeSettings={activeSoundscape:null,volume:.35,playWithTimer:false,fadeOnEnd:true};
export function normalizeSoundscapeSettings(raw:Partial<SoundscapeSettings>={}):SoundscapeSettings {
 return {activeSoundscape:SOUNDSCAPE_PRESETS.some(p=>p.id===raw.activeSoundscape)?raw.activeSoundscape!:null,volume:Number.isFinite(raw.volume)?Math.max(0,Math.min(1,raw.volume!)):.35,playWithTimer:raw.playWithTimer===true,fadeOnEnd:raw.fadeOnEnd!==false};
}
const STORAGE_KEY='sanctra_soundscape_settings_v1';
export function getSoundscapeSettings():SoundscapeSettings {try{return normalizeSoundscapeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch{return {...DEFAULT_SOUNDSCAPE_SETTINGS};}}
export function saveSoundscapeSettings(patch:Partial<SoundscapeSettings>):SoundscapeSettings {const next=normalizeSoundscapeSettings({...getSoundscapeSettings(),...patch});try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{}return next;}
type Voice={stop:()=>void};
type Session={id:SoundscapeId;gain:GainNode;voices:Voice[]};
let context:AudioContext|null=null,active:Session|null=null,generation=0;
const recordingBuffers=new Map<string,Promise<AudioBuffer>>();
async function loadRecording(ctx:AudioContext,url:string){
 let pending=recordingBuffers.get(url);
 if(!pending){pending=fetch(url).then(response=>{if(!response.ok)throw new Error('This recording could not load. Please try again.');return response.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes));recordingBuffers.set(url,pending);pending.catch(()=>recordingBuffers.delete(url));}
 return pending;
}
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(listener=>listener());
export function getSoundscapeState(){return {isPlaying:!!active,currentId:active?.id||null};}
export function subscribeSoundscapeState(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function texture(ctx:AudioContext,dest:AudioNode,id:SoundscapeId):Voice {
 const length=ctx.sampleRate*16,buffer=ctx.createBuffer(2,length,ctx.sampleRate);
 for(let channel=0;channel<2;channel++){
  const data=buffer.getChannelData(channel);let brown=0,pink=0;
  for(let i=0;i<length;i++){
   const noise=Math.random()*2-1,t=i/ctx.sampleRate;
   brown=(brown+.025*noise)/1.025;pink=.97*pink+.03*noise;
   const cycle=(1-Math.cos(t*Math.PI/4+channel*.15))/2;
   const level=id==='ocean'?.08+.2*cycle:id==='wind'?.08+.08*cycle:id==='river'?.18+.04*Math.sin(t*3):.18;
   data[i]=(id==='brown'||id==='wind'?brown*4:id==='pink'?pink*3:noise)*level;
   if(id==='fire')data[i]=brown*.9+(Math.random()<.0003?noise*.35:0);
   if(id==='rain'||id==='rain-heavy')data[i]+=Math.random()<.0002?noise*.12:0;
  }
 }
 const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=id==='brown'?550:id==='wind'?700:id==='fire'?1200:id==='ocean'?1800:id==='rain-heavy'?2200:id==='river'?3800:5000;
 source.connect(filter);filter.connect(dest);source.start();return {stop:()=>{source.stop();source.disconnect();filter.disconnect();}};
}
function chimes(ctx:AudioContext,dest:AudioNode,birds=false):Voice {
 const voices=new Set<{oscillators:OscillatorNode[];gain:GainNode}>();let disposed=false;
 const chime=()=>{if(disposed)return;const gain=ctx.createGain(),oscillators=[ctx.createOscillator(),ctx.createOscillator()];
  const duration=birds?.7:7.5,frequency=birds?900+Math.random()*600:261.63;
  gain.gain.setValueAtTime(birds?.025:.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);gain.connect(dest);
  const voice={oscillators,gain};voices.add(voice);
  oscillators.forEach((oscillator,index)=>{oscillator.frequency.setValueAtTime(frequency*(index?2:1),ctx.currentTime);if(birds)oscillator.frequency.linearRampToValueAtTime(frequency*.7*(index?2:1),ctx.currentTime+duration);oscillator.connect(gain);oscillator.start();oscillator.stop(ctx.currentTime+duration+.1);});
  oscillators[0].onended=()=>{oscillators.forEach(o=>o.disconnect());gain.disconnect();voices.delete(voice);};
 };
 chime();const interval=window.setInterval(chime,birds?6700:12000);
 return {stop:()=>{disposed=true;window.clearInterval(interval);for(const voice of voices){voice.oscillators.forEach(o=>{try{o.stop();o.disconnect();}catch{}});voice.gain.disconnect();}voices.clear();}};
}
function retire(session:Session,seconds:number){
 const ctx=context;if(!ctx)return;session.gain.gain.cancelScheduledValues(ctx.currentTime);session.gain.gain.setValueAtTime(session.gain.gain.value,ctx.currentTime);session.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+seconds);
 const cleanup=()=>{session.voices.forEach(v=>{try{v.stop();}catch{}});session.gain.disconnect();};
 if(seconds<=0)cleanup();else window.setTimeout(cleanup,seconds*1000+50);
}
export async function playSoundscape(id:SoundscapeId,volume=.35):Promise<void>{
 if(!SOUNDSCAPE_PRESETS.some(p=>p.id===id))throw new Error('Choose a sound from the library.');
 const token=++generation;
 const AudioClass=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
 if(!AudioClass)throw new Error('This browser does not support ambient audio. Try a saved YouTube sound.');
 if(!context||context.state==='closed')context=new AudioClass();
 if(context.state!=='running')await context.resume();
 if(token!==generation)return;
 if(context.state!=='running')throw new Error('Tap Play again to allow audio in this browser.');
 if(active?.id===id){setSoundscapeVolume(volume);return;}
 const recording=SOUNDSCAPE_PRESETS.find(p=>p.id===id)?.recording;
 const buffer=recording?await loadRecording(context,recording):null;
 if(token!==generation)return;
 if(active)retire(active,.25);
 const gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
 const session:Session={id,gain,voices:[]};
 try{if(buffer){const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();session.voices.push({stop:()=>{source.stop();source.disconnect();}});}else if(id==='zen-bowl')session.voices.push(chimes(context,gain));else{session.voices.push(texture(context,gain,id));if(id==='forest')session.voices.push(chimes(context,gain,true));}
  gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,volume)),context.currentTime+.4);active=session;notify();
 }catch(error){retire(session,0);active=null;notify();throw error;}
}
export function stopSoundscape(fadeSeconds=.5):void {generation++;const session=active;active=null;notify();if(session)retire(session,Math.max(0,fadeSeconds));}
export function setSoundscapeVolume(volume:number):void{if(context&&active){active.gain.gain.cancelScheduledValues(context.currentTime);active.gain.gain.setTargetAtTime(Math.max(0,Math.min(1,volume)),context.currentTime,.08);}}
