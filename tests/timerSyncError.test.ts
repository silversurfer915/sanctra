import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timerSyncMessage, TimerSyncError} from '../src/utils/timerSyncError.ts';
test('server and session failures keep their real explanation',()=>{
 assert.equal(timerSyncMessage(new TimerSyncError(409,'Start or resume your synced timer before ranking verification.')),'Start or resume your synced timer before ranking verification.');
 assert.equal(timerSyncMessage(new TimerSyncError(503,'Server timer verification is temporarily unavailable.')),'Server timer verification is temporarily unavailable.');
});
test('network failure does not assert that an unconfirmed session is counting',()=>{
 const message=timerSyncMessage(new TypeError('Failed to fetch'));
 assert.match(message,/connection/i);
 assert.doesNotMatch(message,/keeps counting|on the server/i);
});
import {createTimerSyncRetry} from '../src/utils/timerSyncError.ts';
test('failed sync retries without a running timer; success cancels pending retries',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;
 const retry=createTimerSyncRetry(()=>{calls++;});
 retry.failed(new TypeError('Failed to fetch'));
 t.mock.timers.tick(5000);
 assert.equal(calls,1);
 retry.failed(new TimerSyncError(503,'Unavailable'));
 retry.succeeded();
 t.mock.timers.tick(60000);
 assert.equal(calls,1);
 retry.dispose();
});
test('session conflicts do not get automatic backoff retries; cleanup cancels offline retries',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let calls=0;
 const retry=createTimerSyncRetry(()=>{calls++;});
 retry.failed(new TimerSyncError(409,'Another device'));
 t.mock.timers.tick(60000);
 assert.equal(calls,0);
 retry.failed(new TypeError('Failed to fetch'));
 retry.dispose();
 t.mock.timers.tick(60000);
 assert.equal(calls,0);
});
