import {test} from 'node:test';import assert from 'node:assert/strict';import {publicRanking} from '../src/utils/publicRanking.ts';
test('public competitive projection preserves totals and review state while omitting timer diagnostics',()=>{
 const clock={uid:'alice',registered:true,dayStart:1,weekStart:2,monthStart:3,daySeconds:120,weekSeconds:300,monthSeconds:400,integrityStatus:'review' as const,deviceId:'private-device',timerId:'private-timer',reason:'timer_jump',clientSeconds:999};
 const result=publicRanking(clock);assert.equal(result.daySeconds,120);assert.equal(result.integrityStatus,'review');assert.equal(result.uid,'alice');assert.equal(Object.keys(result).length,9);for(const key of ['deviceId','timerId','reason','clientSeconds'])assert.equal(key in result,false);
});
