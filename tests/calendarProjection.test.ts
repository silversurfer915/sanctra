import {test} from 'node:test';import assert from 'node:assert/strict';
import {getMonthDates,localSlotToInstants} from '../src/features/calendar/dates.ts';
import {projectCalendarEntries} from '../src/features/calendar/projection.ts';
import {validateCalendarEvent} from '../src/features/calendar/eventValidation.ts';
const base={tasks:[],events:[],workspaceId:'w',legacySpaceId:'w',timezone:'Asia/Kolkata',rangeStart:'2026-10-01',rangeEnd:'2026-11-01'};
const event={id:'e',workspaceId:'w',title:'Exam',timezone:'Asia/Kolkata',allDay:true,startDate:'2026-10-04',endDateExclusive:'2026-10-06',createdAt:1,updatedAt:1,revision:1};
test('Monday-first 42-day grid and leap day',()=>{assert.equal(getMonthDates('2026-10-04')[0],'2026-09-28');assert.equal(getMonthDates('2026-10-04').length,42);assert.ok(getMonthDates('2028-02-01').includes('2028-02-29'));});
test('all-day exclusive end and foreign/tombstone records',()=>{const result=projectCalendarEntries({...base,events:[event,{...event,id:'x',workspaceId:'x'},{...event,id:'deleted',deletedAt:2}]});assert.deepEqual(result.map(e=>e.date),['2026-10-04','2026-10-05']);});
test('overnight intersects both days; tasks retain completion',()=>{const result=projectCalendarEntries({...base,events:[{...event,allDay:false,start:'2026-10-04T18:00:00Z',end:'2026-10-04T20:00:00Z'}],tasks:[{id:'t',workspaceId:'w',text:'Maths',dueDate:'2026-10-04',completed:true,category:'today',createdAt:1}]});assert.equal(result.filter(e=>e.kind==='event').length,2);assert.equal(result.find(e=>e.kind==='task')?.completed,true);});
test('daily recurrence respects until and cancellation/override',()=>{const result=projectCalendarEntries({...base,events:[{...event,endDateExclusive:'2026-10-05',recurrence:{frequency:'daily',until:'2026-10-07'},exceptions:{'2026-10-05':{cancelled:true},'2026-10-06':{title:'Moved',startDate:'2026-10-08',endDateExclusive:'2026-10-09'}}}]});assert.deepEqual(result.map(e=>e.date),['2026-10-04','2026-10-07','2026-10-08']);});
test('slots reject DST gaps/folds and support overnight',()=>{assert.throws(()=>localSlotToInstants('2026-03-08','02:30','03:30','America/New_York'));assert.throws(()=>localSlotToInstants('2026-11-01','01:30','02:30','America/New_York'));const s=localSlotToInstants('2026-10-04','23:30','01:30','Asia/Kolkata');assert.equal(Date.parse(s.end)-Date.parse(s.start),7200000);});
test('event validation rejects zero duration and invalid dates',()=>{assert.equal(validateCalendarEvent(event).length,0);assert.ok(validateCalendarEvent({...event,endDateExclusive:event.startDate}).length);assert.ok(validateCalendarEvent({...event,startDate:'2026-02-30'}).length);});

test('previously imported events remain visible and editable after integration removal',()=>{
 const legacy={...event,title:'Saved calendar event',notes:'Keep these notes',remote:{calendarId:'old-calendar',eventId:'old-event',readonly:true}};
 const result=projectCalendarEntries({...base,events:[legacy]});
 assert.equal(result.length,2);assert.ok(result.every(entry=>entry.readonly===false));
 assert.equal(result[0].title,'Saved calendar event');assert.equal(result[0].notes,'Keep these notes');
});
