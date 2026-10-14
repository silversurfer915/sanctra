import {Temporal} from '@js-temporal/polyfill';
export const dateValue=(date:string)=>Temporal.PlainDate.from(date,{overflow:'reject'});
export const addDays=(date:string,n:number)=>dateValue(date).add({days:n}).toString();
export const dateDistance=(from:string,to:string)=>dateValue(from).until(dateValue(to)).days;
export function getMonthDates(date:string):string[]{const first=dateValue(date).with({day:1});const start=first.subtract({days:first.dayOfWeek-1});return Array.from({length:42},(_,i)=>start.add({days:i}).toString());}
export function localSlotToInstants(date:string,start:string,end:string,timezone:string):{start:string;end:string}{
 const day=dateValue(date);const a=Temporal.PlainTime.from(start),b=Temporal.PlainTime.from(end);
 const endDay=Temporal.PlainTime.compare(b,a)<0?day.add({days:1}):day;
 const first=day.toPlainDateTime(a).toZonedDateTime(timezone,{disambiguation:'reject'}),last=endDay.toPlainDateTime(b).toZonedDateTime(timezone,{disambiguation:'reject'});
 if(Temporal.ZonedDateTime.compare(last,first)<=0)throw new Error('End time must be after the start time.');
 return {start:first.toInstant().toString(),end:last.toInstant().toString()};
}
export const instantDate=(instant:string,zone:string)=>Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toPlainDate().toString();
export const instantTime=(instant:string,zone:string)=>Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toPlainTime().toString({smallestUnit:'minute'});
export function formatDate(date:string,options:Intl.DateTimeFormatOptions={month:'long',day:'numeric'}){return new Intl.DateTimeFormat(undefined,{...options,timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));}
