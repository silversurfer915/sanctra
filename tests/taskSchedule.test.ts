import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduledTasksForDay,validTaskSlot } from '../src/utils/taskSchedule.ts';
const task=(id:string,dueDate:string,startTime='09:00',endTime='10:00',extra={})=>({id,text:'Topic',dueDate,startTime,endTime,category:'today' as const,completed:false,createdAt:0,...extra});
test('tomorrow-only schedules are absent today and visible tomorrow',()=>{
  const tasks=[task('tomorrow','2026-10-03')];
  assert.equal(scheduledTasksForDay(tasks,new Date(2026,9,2,9,30)).list.length,0);
  assert.equal(scheduledTasksForDay(tasks,new Date(2026,9,3,9,30)).current?.id,'tomorrow');
});
test('current slots use inclusive start and exclusive end; next is chronological',()=>{
  const tasks=[task('later','2026-10-02','11:00','12:00'),task('now','2026-10-02')];
  assert.equal(scheduledTasksForDay(tasks,new Date(2026,9,2,9)).current?.id,'now');
  const state=scheduledTasksForDay(tasks,new Date(2026,9,2,10));
  assert.equal(state.current,undefined);assert.equal(state.next?.id,'later');
});
test('untimed, completed and malformed tasks cannot enter current bar',()=>{
 const tasks=[task('done','2026-10-02','09:00','10:00',{completed:true}),task('bad','2026-10-02','10:00','09:00'),task('untimed','2026-10-02','','')];
 assert.equal(scheduledTasksForDay(tasks as any,new Date(2026,9,2,9,30)).list.length,0);
 assert.equal(validTaskSlot('09:00','09:00'),false);assert.equal(validTaskSlot('25:00','26:00'),false);
});

test('focusing a task counts remaining slot time, full future slot, or rejects an expired slot',async()=>{
 const {taskFocusSeconds}=await import('../src/utils/taskSchedule.ts');const t=task('slot','2026-10-02');
 assert.equal(taskFocusSeconds(t,new Date(2026,9,2,9,15)),2700);
 assert.equal(taskFocusSeconds(t,new Date(2026,9,2,8)),3600);
 assert.equal(taskFocusSeconds(t,new Date(2026,9,2,10)),0);
 assert.equal(taskFocusSeconds(task('free','2026-10-02','',''),new Date(2026,9,2)),null);
});

test('backlog includes every overdue unfinished day and excludes completed work',async()=>{
 const {isBacklogTask}=await import('../src/utils/taskSchedule.ts');
 assert.equal(isBacklogTask(task('old','2026-10-01'),'2026-10-04'),true);
 assert.equal(isBacklogTask(task('yesterday','2026-10-03'),'2026-10-04'),true);
 assert.equal(isBacklogTask(task('today','2026-10-04'),'2026-10-04'),false);
 assert.equal(isBacklogTask(task('done','2026-10-01','09:00','10:00',{completed:true}),'2026-10-04'),false);
 assert.equal(isBacklogTask(task('manual','','','',{category:'backlog'}),'2026-10-04'),true);
});
