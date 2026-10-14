import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveHydratedSettings,cloudPatchFields} from '../src/utils/settingsPersistence.ts';
import {DEFAULT_USER_SETTINGS,saveUserSettings,getUserSettings} from '../src/utils/storage.ts';
const uploaded='data:image/jpeg;base64,aGVsbG8=';
test('newer cloud scene clears an old uploaded image instead of resurrecting it',()=>{
 const local={...DEFAULT_USER_SETTINGS,updatedAt:1,customWallpaperUrl:uploaded,plusMotionWallpaperUrl:'https://example.com/old.mp4',plusMotionWallpaperEnabled:true};
 const remote={...DEFAULT_USER_SETTINGS,updatedAt:2,activeWallpaperId:'wp-art-lavender-lake'};
 const merged=resolveHydratedSettings(local,remote);assert.equal(merged.activeWallpaperId,remote.activeWallpaperId);assert.equal(merged.customWallpaperUrl,undefined);assert.equal(merged.plusMotionWallpaperUrl,undefined);assert.equal(merged.plusMotionWallpaperEnabled,false);
 assert.equal(resolveHydratedSettings({...local,updatedAt:3},remote).customWallpaperUrl,uploaded);
 assert.deepEqual(cloudPatchFields({settings:remote}),['settings','lastSyncedAt']);
});
test('account backgrounds survive a fresh settings read, including upload and clearing',()=>{
 const data=new Map<string,string>();const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>data.set(key,value)}});
 try{
  assert.equal(saveUserSettings({...DEFAULT_USER_SETTINGS,customWallpaperUrl:uploaded,updatedAt:1},'alice'),true);
  assert.equal(getUserSettings('alice').customWallpaperUrl,uploaded);
  assert.equal(saveUserSettings({...DEFAULT_USER_SETTINGS,activeWallpaperId:'wp-art-lavender-lake',updatedAt:2},'alice'),true);
  assert.equal(getUserSettings('alice').customWallpaperUrl,undefined);assert.equal(getUserSettings('alice').activeWallpaperId,'wp-art-lavender-lake');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{throw new Error('quota');}}});
  assert.equal(saveUserSettings(DEFAULT_USER_SETTINGS,'alice'),false);
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else Reflect.deleteProperty(globalThis,'localStorage');}
});
