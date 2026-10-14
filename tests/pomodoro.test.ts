import test from 'node:test';
import assert from 'node:assert/strict';
import {POMODORO_PRESETS,normalizePomodoroConfig,pomodoroBreakSeconds,isPomodoroMode} from '../src/utils/pomodoro.ts';
test('approved presets provide focus, short break, long break and interval',()=>{
 assert.deepEqual(POMODORO_PRESETS.map(p=>[p.focusMinutes,p.shortBreakMinutes,p.longBreakMinutes,p.sessionsBeforeLongBreak]),[[25,5,15,4],[50,10,30,4],[90,20,40,4]]);
});
test('long break follows each completed interval and then short breaks resume',()=>{
 const config={focusMinutes:12,shortBreakMinutes:2,longBreakMinutes:8,sessionsBeforeLongBreak:3};
 assert.deepEqual([1,2,3,4,5,6].map(n=>pomodoroBreakSeconds(config,n)),[120,120,480,120,120,480]);
});
test('invalid persisted values fall back and valid custom settings survive normalization',()=>{
 const config={focusMinutes:37,shortBreakMinutes:7,longBreakMinutes:23,sessionsBeforeLongBreak:5};
 assert.deepEqual(normalizePomodoroConfig(config),config);
 assert.deepEqual(normalizePomodoroConfig({focusMinutes:0,shortBreakMinutes:Infinity,longBreakMinutes:-1,sessionsBeforeLongBreak:1.5}),POMODORO_PRESETS[0]);
});
test('custom and all preset modes use breaks; countdown remains a single block',()=>{
 for(const mode of ['pomodoro-25','pomodoro-50','pomodoro-90','pomodoro-custom'])assert.equal(isPomodoroMode(mode),true);
 assert.equal(isPomodoroMode('custom'),false);
});
test('custom settings stay isolated per user and the cycle survives a draft reload',async()=>{
 const {saveUserSettings,getUserSettings,DEFAULT_USER_SETTINGS,saveTimerDraft,getTimerDraft}=await import('../src/utils/storage.ts');
 const data=new Map<string,string>();const previous=globalThis.localStorage;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}});
 try{
  const config={focusMinutes:37,shortBreakMinutes:7,longBreakMinutes:23,sessionsBeforeLongBreak:5};
  saveUserSettings({...DEFAULT_USER_SETTINGS,pomodoroConfig:config},'alice');
  assert.deepEqual(getUserSettings('alice').pomodoroConfig,config);
  assert.equal(getUserSettings('bob').pomodoroConfig,undefined);
  saveTimerDraft({mode:'pomodoro-custom',status:'paused',version:2,accumulatedSeconds:42,runningSince:null,targetSeconds:2220,breakSeconds:420,lastUpdated:1000,pomodoroConfig:config,pomodoroCompletedSessions:4});
  assert.equal(getTimerDraft()?.pomodoroCompletedSessions,4);
  assert.equal(pomodoroBreakSeconds(getTimerDraft()!.pomodoroConfig!,getTimerDraft()!.pomodoroCompletedSessions!+1),1380);
 }finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});}
});
