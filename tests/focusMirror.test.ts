import test from 'node:test';
import assert from 'node:assert/strict';
import {mirrorFocusSession} from '../src/utils/focusMirror.ts';

test('Mac session adoption preserves identity, paused duration and timer mode',()=>{
 const mirrored=mirrorFocusSession({sessionId:'shared',deviceId:'mac',status:'paused',mode:'stopwatch',startTime:1000,runningSince:null,accumulatedSeconds:120,targetSeconds:1800},null,'web',200000);
 assert.deepEqual(mirrored,{sessionId:'shared',status:'paused',mode:'countup',startTime:1000,runningSince:null,accumulatedSeconds:120,targetSeconds:1800,displaySeconds:120});
});
test('same session remote resume updates elapsed, unrelated browser stays a conflict',()=>{
 assert.equal(mirrorFocusSession({sessionId:'other',deviceId:'other-web',status:'running'},'mine','web'),null);
 const mirrored=mirrorFocusSession({sessionId:'shared',deviceId:'mac',status:'running',mode:'countup',startTime:1000,runningSince:100000,accumulatedSeconds:120,targetSeconds:1800},'shared','web',130000);
 assert.equal(mirrored?.displaySeconds,150);
});
