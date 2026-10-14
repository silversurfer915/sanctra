import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strictFocusAction} from '../src/utils/strictMode.ts';
import {restoreTimerDraft} from '../src/utils/timerDraft.ts';
test('strict mode pauses on losing foreground and only resumes its own pause',()=>{
 assert.equal(strictFocusAction(true,'running',false,false),'pause');
 assert.equal(strictFocusAction(true,'paused',true,true),'resume');
 assert.equal(strictFocusAction(true,'paused',true,false),null);
 assert.equal(strictFocusAction(false,'running',false,false),null);
 assert.equal(strictFocusAction(true,'break-running',false,false),null);
});
test('restoring strict study time never credits the time away',()=>{
 const d={version:2,mode:'countup',status:'running',accumulatedSeconds:10,runningSince:1000,lastUpdated:5000,targetSeconds:0,breakSeconds:0,strictMode:true} as const;
 const r=restoreTimerDraft(d,65000);
 assert.equal(r.elapsedSeconds,14); assert.equal(r.status,'paused'); assert.equal(r.runningSince,null);
 assert.equal(restoreTimerDraft({...d,strictMode:false},65000).elapsedSeconds,74);
});
