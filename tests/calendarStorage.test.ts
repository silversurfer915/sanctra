import {test} from 'node:test';import assert from 'node:assert/strict';
import {mergeCalendarEvents,calendarCacheKey} from '../src/features/calendar/calendarStorage.ts';
import {resolveAccountData} from '../src/utils/accountData.ts';
const e={id:'e',title:'Study',timezone:'Asia/Kolkata',allDay:true,startDate:'2026-10-04',endDateExclusive:'2026-10-05',createdAt:1,updatedAt:1,revision:1};
test('owner cache keys differ and event-only patches preserve arrays',()=>{assert.notEqual(calendarCacheKey('a'),calendarCacheKey('b'));const local={sessions:[1],subjects:[2],tasks:[3],calendarEvents:[e]};const result=resolveAccountData(local,{calendarEvents:[]});assert.deepEqual(result.calendarEvents,[]);assert.deepEqual(result.tasks,[3]);});
test('pending newer records survive snapshots; remote newer edits and tombstones win',()=>{assert.equal(mergeCalendarEvents([{...e,revision:2,title:'Local'}],[e])[0].title,'Local');assert.equal(mergeCalendarEvents([e],[{...e,revision:3,deletedAt:9}])[0].deletedAt,9);});
test('concurrent same-revision different edits are not silently merged',()=>{assert.throws(()=>mergeCalendarEvents([{...e,revision:2,title:'Local'}],[{...e,revision:2,title:'Remote'}]),/changed/);});
test('Firestore property order does not create a false conflict',()=>{const {title,...rest}=e;assert.equal(mergeCalendarEvents([e],[{...rest,title}])[0].title,'Study');});
