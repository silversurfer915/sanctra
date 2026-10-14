export interface CalendarException {cancelled?:boolean;title?:string;start?:string;end?:string;startDate?:string;endDateExclusive?:string}
export interface CalendarEvent {
 readOnly?:boolean;
 id:string;workspaceId?:string;title:string;notes?:string;location?:string;timezone:string;allDay:boolean;
 start?:string;end?:string;startDate?:string;endDateExclusive?:string;
 recurrence?:{frequency:'daily'|'weekly';until?:string};exceptions?:Record<string,CalendarException>;
 createdAt:number;updatedAt:number;revision:number;deletedAt?:number;
}
export interface CalendarEntry {
  id: string;
  sourceId: string;
  kind: 'task' | 'event';
  title: string;
  date: string;
  allDay: boolean;
  start?: string;
  end?: string;
  completed: boolean;
  readonly: boolean;
  occurrenceKey?: string;
  subjectId?: string;
  subjectName?: string;
  color?: string;
  notes?: string;
  location?: string;
}
export interface CalendarSlot {date:string;startTime?:string;endTime?:string}
