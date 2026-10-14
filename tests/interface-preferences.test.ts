import test from 'node:test';
import assert from 'node:assert/strict';
import {getUserSettings,saveUserSettings,DEFAULT_USER_SETTINGS} from '../src/utils/storage.ts';
test('glass clarity and private study details survive account settings storage',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)}});
 try{const details={country:'India',city:'Chennai',status:'School student',stream:'PCM',coaching:'Self-study'};
 saveUserSettings({...DEFAULT_USER_SETTINGS,uiGlassBlur:0,studyDetails:details},'member');assert.equal(getUserSettings('member').uiGlassBlur,0);assert.deepEqual(getUserSettings('member').studyDetails,details);
 for(const [input,expected] of [[99,24],[-12,0],[NaN,12]] as const){saveUserSettings({...DEFAULT_USER_SETTINGS,uiGlassBlur:input},'member');assert.equal(getUserSettings('member').uiGlassBlur,expected);}
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else delete (globalThis as {localStorage?:unknown}).localStorage;}
});
