import type { TaskItem } from '../types/index.ts';
export function timeMinutes(value?: string) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h,m]=value.split(':').map(Number); return h*60+m;
}
export function validTaskSlot(start?: string,end?: string) {
  const a=timeMinutes(start),b=timeMinutes(end); return a!==null&&b!==null&&b>a;
}
export function scheduledTasksForDay(tasks: TaskItem[], now: Date) {
  const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const list=tasks.filter(t=>t.category!=='unscheduled'&&t.dueDate===date&&!t.completed&&validTaskSlot(t.startTime,t.endTime)).sort((a,b)=>a.startTime!.localeCompare(b.startTime!)||a.createdAt-b.createdAt);
  const minute=now.getHours()*60+now.getMinutes();
  return { list, current:list.find(t=>timeMinutes(t.startTime)!<=minute&&timeMinutes(t.endTime)!>minute),next:list.find(t=>timeMinutes(t.startTime)!>minute) };
}

/** Start immediately: a live slot uses time remaining; a future slot uses its full duration. */
export function taskFocusSeconds(task: TaskItem, now: Date) {
  if (!validTaskSlot(task.startTime,task.endTime)) return null;
  const start=new Date(`${task.dueDate}T${task.startTime}:00`),end=new Date(`${task.dueDate}T${task.endTime}:00`);
  if (!Number.isFinite(+start)||!Number.isFinite(+end)) return null;
  if (+now>=+end) return 0;
  return Math.max(1,Math.ceil((+end-Math.max(+start,+now))/1000));
}

/** Overdue work remains visible regardless of the calendar's selected day. */
export function isBacklogTask(task: TaskItem, today: string) {
  return !task.completed && (task.category === 'backlog' || Boolean(task.dueDate && task.dueDate < today));
}
