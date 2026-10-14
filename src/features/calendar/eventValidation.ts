import {Temporal} from '@js-temporal/polyfill';import type {CalendarEvent} from './types.ts';import {dateValue} from './dates.ts';
export function validateCalendarEvent(e:CalendarEvent):string[]{const errors:string[]=[];
 if(!e.id||!e.title.trim()||e.title.length>300)errors.push('Add an event title (up to 300 characters).');
 if((e.notes?.length||0)>5000||(e.location?.length||0)>500)errors.push('Notes or location are too long.');
 try{Temporal.Now.zonedDateTimeISO(e.timezone);}catch{errors.push('Choose a valid timezone.');}
 try{if(e.allDay){if(!e.startDate||!e.endDateExclusive||Temporal.PlainDate.compare(dateValue(e.endDateExclusive),dateValue(e.startDate))<=0)throw Error();if(dateValue(e.startDate).until(dateValue(e.endDateExclusive)).days>366)throw Error();}else{if(!e.start||!e.end||Temporal.Instant.compare(Temporal.Instant.from(e.end),Temporal.Instant.from(e.start))<=0||Date.parse(e.end)-Date.parse(e.start)>366*86400000)throw Error();}}catch{errors.push('Choose valid dates with an end after the start (up to one year).');}
 if(e.recurrence){try{if(!['daily','weekly'].includes(e.recurrence.frequency))throw Error();if(e.recurrence.until)dateValue(e.recurrence.until);}catch{errors.push('Choose a valid repeat end date.');}}
 if(!Number.isSafeInteger(e.revision)||e.revision<1)errors.push('The event version is invalid.');return errors;}
