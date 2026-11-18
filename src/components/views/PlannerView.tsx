import {JeeFocusPicker} from '../JeeFocusPicker.tsx';
import type {JeeSyllabus} from '../../types/jeetrack.ts';
import type {JeeSessionTag} from '../../types/index.ts';
import {SelectControl} from '../ui/SelectControl.tsx';
import {DateControl} from '../ui/DateControl.tsx';
import {validTaskSlot,isBacklogTask} from '../../utils/taskSchedule.ts';
import React,{useMemo,useState} from 'react';
import type {TaskItem,Subject} from '../../types/index.ts';
import {getLocalDateString} from '../../utils/time.ts';
import {CheckCircle2,Plus,Trash2,ChevronLeft,ChevronRight,Edit3,Sparkles} from 'lucide-react';

interface PlannerViewProps {
  jeeSyllabus?:JeeSyllabus;
  tasks:TaskItem[]; subjects:Subject[];
  onAddTask:(text:string,category:'today'|'backlog'|'unscheduled',subjectId?:string,dueDate?:string,startTime?:string,endTime?:string,jee?:JeeSessionTag,completeJeeChapter?:boolean)=>void;
  onUpdateTask:(id:string,patch:Partial<TaskItem>)=>void; onFocusTask:(task:TaskItem)=>void;
  onToggleTask:(id:string)=>void; onDeleteTask:(id:string)=>void; onOpenAiAssistant?:()=>void;
}

export const PlannerView:React.FC<PlannerViewProps>=({jeeSyllabus,tasks,subjects,onAddTask,onUpdateTask,onFocusTask,onToggleTask,onDeleteTask,onOpenAiAssistant})=>{
  const [newJeeTag,setNewJeeTag]=useState<JeeSessionTag>();
  const [markChapter,setMarkChapter]=useState(false);
  const subjectFor=(tag:JeeSessionTag)=>subjects.find(s=>s.name.toLowerCase()===({physics:'physics',chemistry:'chemistry',maths:'mathematics'}[tag.subject])||tag.subject==='maths'&&s.name.toLowerCase()==='maths')?.id;
  const [selectedDate,setSelectedDate]=useState(getLocalDateString());
  const [activeTab,setActiveTab]=useState<'today'|'backlog'|'unscheduled'>('today');
  const [newTaskText,setNewTaskText]=useState(''),[taskStart,setTaskStart]=useState(''),[taskEnd,setTaskEnd]=useState(''),[taskError,setTaskError]=useState('');
  const [editingTask,setEditingTask]=useState<TaskItem|null>(null),[selectedSubjectId,setSelectedSubjectId]=useState('');
  const calendarDays=useMemo(()=>{const days=[];const base=new Date(`${selectedDate}T00:00:00`);for(let offset=-3;offset<=3;offset+=1){const date=new Date(base);date.setDate(base.getDate()+offset);days.push({dateStr:getLocalDateString(date),dayName:date.toLocaleDateString([],{weekday:'short'}),dayNum:date.getDate()});}return days;},[selectedDate]);
  const displayedTasks=tasks.filter(task=>activeTab==='today'?task.category==='today'&&task.dueDate===selectedDate:activeTab==='backlog'?isBacklogTask(task,getLocalDateString()):task.category==='unscheduled');
  const todayCount=tasks.filter(task=>task.category==='today'&&task.dueDate===selectedDate).length,backlogCount=tasks.filter(task=>isBacklogTask(task,getLocalDateString())).length,unscheduledCount=tasks.filter(task=>task.category==='unscheduled').length;
  const moveDay=(amount:number)=>{const date=new Date(`${selectedDate}T00:00:00`);date.setDate(date.getDate()+amount);setSelectedDate(getLocalDateString(date));};
  const handleCreateTask=(event:React.FormEvent)=>{event.preventDefault();if(!newTaskText.trim())return;if(activeTab==='today'&&(taskStart||taskEnd)&&!validTaskSlot(taskStart,taskEnd)){setTaskError('Choose both times, with the end after the start.');return;}setTaskError('');onAddTask(newTaskText.trim(),activeTab,selectedSubjectId||undefined,activeTab==='today'?selectedDate:undefined,activeTab==='today'?taskStart||undefined:undefined,activeTab==='today'?taskEnd||undefined:undefined,newJeeTag,markChapter);setNewTaskText('');setTaskStart('');setTaskEnd('');};
  return <div className="planner-view w-full max-w-4xl mx-auto px-4 py-4 space-y-6 animate-in fade-in duration-300">
    <header className="flex flex-wrap gap-4 items-center justify-between pb-1">
      <div>
        <p className="text-xs tracking-[.2em] uppercase mb-1 font-display font-bold text-rust">Plan your quests</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Your tasks</h1>
        <p className="text-sm text-ink-dim mt-1">A clear plan for your next focused session.</p>
      </div>
    </header>

    <div className="task-overview-grid">
      <article className="workspace-panel">
        <small>Completed today</small>
        <strong>{tasks.filter(task=>task.completed&&task.dueDate===getLocalDateString()).length}</strong>
      </article>
      <article className="workspace-panel">
        <small>Backlog</small>
        <strong>{backlogCount}</strong>
      </article>
      <article className="workspace-panel">
        <small>Unscheduled</small>
        <strong>{unscheduledCount}</strong>
        <span>Tasks ready to place on your calendar</span>
      </article>
    </div>

    <div className="planner-date-toolbar">
      <div className="planner-calendar flex items-center justify-center gap-2">
        <button type="button" onClick={()=>moveDay(-1)} className="planner-nav-arrow" aria-label="Previous day">
          <ChevronLeft className="w-4 h-4"/>
        </button>
        <div className="planner-days flex items-center gap-2 overflow-x-auto py-1">
          {calendarDays.map(day=>{
            const selected = day.dateStr === selectedDate;
            const today = day.dateStr === getLocalDateString();
            return (
              <button
                key={day.dateStr}
                type="button"
                aria-pressed={selected}
                onClick={()=>setSelectedDate(day.dateStr)}
                className={`planner-day-tile ${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''}`}
              >
                <span className="planner-day-name">{day.dayName}</span>
                <strong className="planner-day-num">{day.dayNum}</strong>
                {today && <span className="planner-today-dot">TODAY</span>}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={()=>moveDay(1)} className="planner-nav-arrow" aria-label="Next day">
          <ChevronRight className="w-4 h-4"/>
        </button>
        <button type="button" onClick={()=>setSelectedDate(getLocalDateString())} className="planner-today-btn">
          Today
        </button>
      </div>
      <div className="planner-date-control">
        <DateControl label="Planner date" value={selectedDate} onChange={setSelectedDate}/>
      </div>
    </div>

    <div className="planner-tabs flex items-center gap-2 p-1.5" role="tablist">
      {([['today',"Today's Tasks",todayCount],['backlog','Backlog',backlogCount],['unscheduled','Unscheduled',unscheduledCount]] as const).map(([id,label,count])=>(
        <button
          key={id}
          type="button"
          role="tab"
          data-task-tab={id}
          aria-pressed={activeTab===id}
          aria-selected={activeTab===id}
          onClick={()=>setActiveTab(id)}
          className={`planner-tab-btn ${activeTab===id ? 'is-active' : ''}`}
        >
          <span>{label}</span>
          <span className="planner-tab-count">{count}</span>
        </button>
      ))}
      {onOpenAiAssistant && (
        <button
          type="button"
          onClick={onOpenAiAssistant}
          className="planner-ai-btn"
          title="Plan tasks with Sanctra AI"
        >
          <Sparkles className="w-3.5 h-3.5"/>
          <span className="hidden sm:inline">AI Schedule</span>
        </button>
      )}
    </div>

    <form onSubmit={handleCreateTask} className="planner-task-composer p-3 flex flex-wrap items-center gap-2.5">
      <input
        type="text"
        maxLength={200}
        aria-label="New task"
        placeholder={activeTab==='today'?`What do you need to do on ${selectedDate}?`:activeTab==='backlog'?'Add a task to your backlog...':'Add an unscheduled task...'}
        value={newTaskText}
        onChange={event=>setNewTaskText(event.target.value)}
        className="flex-1 min-w-0 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
      {subjects.length>0 && (
        <SelectControl
          label="Task subject"
          value={selectedSubjectId}
          onChange={id=>{setSelectedSubjectId(id);setNewJeeTag(undefined);}}
          options={[{value:'',label:'No subject'},...subjects.map(subject=>({value:subject.id,label:subject.name}))]}
        />
      )}
      {activeTab==='today' && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label>From <input className="analytics-select" aria-label="Task start time" type="time" value={taskStart} onChange={event=>setTaskStart(event.target.value)}/></label>
          <label>To <input className="analytics-select" aria-label="Task end time" type="time" value={taskEnd} onChange={event=>setTaskEnd(event.target.value)}/></label>
        </div>
      )}
      {taskError && <p role="alert" className="text-xs text-rust w-full font-bold">{taskError}</p>}
      <button
        type="submit"
        disabled={!newTaskText.trim()}
        className="planner-add-btn"
      >
        <Plus className="w-4 h-4 stroke-[3]"/>
        <span>Add</span>
      </button>
      {jeeSyllabus && (
        <details className="w-full">
          <summary className="text-xs cursor-pointer px-3 py-2 font-bold text-ink-dim">Link a JEE chapter</summary>
          <JeeFocusPicker syllabus={jeeSyllabus} value={newJeeTag} disabled={false} onChange={tag=>{setNewJeeTag(tag);setMarkChapter(false);if(tag)setSelectedSubjectId(subjectFor(tag)||'');}}/>
          {newJeeTag && (
            <label className="text-xs flex gap-2 font-medium text-ink-dim mt-2">
              <input type="checkbox" checked={markChapter} onChange={e=>setMarkChapter(e.target.checked)}/>
              Completing this task updates this chapter’s {newJeeTag.kind==='revision'?'revision count':newJeeTag.kind==='lecture'?'theory completion':'practice completion'}.
            </label>
          )}
        </details>
      )}
    </form>

    <div className="planner-quest-list space-y-2.5">
      {displayedTasks.length===0 ? (
        <div className="planner-empty-box p-10 text-center text-xs">
          <CheckCircle2 className="w-8 h-8 text-ink-dim mx-auto mb-2 opacity-60"/>
          <p className="font-bold text-ink text-sm">All clear!</p>
          <p className="mt-0.5 text-ink-dim">No tasks in this list. Add one above to plan your focus session.</p>
        </div>
      ) : (
        displayedTasks.map(task=>{
          const subject = subjects.find(candidate=>candidate.id===task.subjectId);
          return (
            <article
              key={task.id}
              className={`task-quest-card ${task.completed ? 'is-completed' : ''}`}
            >
              {/* Top corner: due time stamp or completed stamp */}
              <div className="task-card-stamp-corner">
                {task.completed ? (
                  <span className="task-stamp-done">DONE</span>
                ) : task.startTime && task.endTime ? (
                  <span className="task-stamp-time">{task.startTime} – {task.endTime}</span>
                ) : null}
              </div>

              <div className="task-card-main">
                {/* Stamp-style checkbox */}
                <button
                  type="button"
                  onClick={()=>onToggleTask(task.id)}
                  className={`task-stamp-checkbox ${task.completed ? 'is-checked' : ''}`}
                  aria-label={`${task.completed?'Reopen':'Complete'} ${task.text}`}
                  title={task.completed?'Reopen task':'Complete task'}
                >
                  {task.completed ? (
                    <span className="task-stamp-check">✓</span>
                  ) : null}
                </button>

                <div className="task-card-content">
                  <span className={`task-card-text ${task.completed ? 'is-struck' : ''}`}>
                    {task.text}
                  </span>

                  <div className="task-card-tags">
                    {/* Subject as a small paper tag */}
                    {subject && (
                      <span
                        className="task-subject-tag"
                        style={{ borderLeftColor: subject.color || 'var(--l-gold)' }}
                      >
                        <span
                          className="task-tag-dot"
                          style={{ backgroundColor: subject.color || 'var(--l-gold)' }}
                        />
                        {subject.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="task-card-actions">
                {!task.completed && (
                  <button
                    type="button"
                    className="task-focus-btn"
                    onClick={()=>onFocusTask(task)}
                    aria-label={`Focus on ${task.text}`}
                  >
                    Focus
                  </button>
                )}
                <button
                  type="button"
                  className="task-icon-btn"
                  aria-label={`Edit task ${task.text}`}
                  onClick={()=>{setEditingTask({...task});setTaskError('');}}
                >
                  <Edit3 size={13}/>
                </button>
                <button
                  type="button"
                  onClick={()=>onDeleteTask(task.id)}
                  className="task-icon-btn is-danger"
                  aria-label={`Delete task ${task.text}`}
                  title="Delete task"
                >
                  <Trash2 size={13}/>
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
    {editingTask&&<div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><form className="glass-modal rounded-3xl p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto space-y-4" role="dialog" aria-modal="true" aria-label="Edit task schedule" onSubmit={event=>{event.preventDefault();if((editingTask.startTime||editingTask.endTime)&&!validTaskSlot(editingTask.startTime,editingTask.endTime)){setTaskError('End time must be after start time.');return;}onUpdateTask(editingTask.id,editingTask);setEditingTask(null);setTaskError('');}}><h2 className="font-display text-xl">Plan this focus block</h2><label className="block text-xs">Topic or task<input required maxLength={200} className="analytics-select w-full mt-2" value={editingTask.text} onChange={event=>setEditingTask({...editingTask,text:event.target.value})}/></label><label className="block text-xs">Subject<select className="analytics-select w-full mt-2" value={editingTask.subjectId||''} onChange={event=>setEditingTask({...editingTask,subjectId:event.target.value,jee:undefined,completeJeeChapter:false})}><option value="">No subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>{jeeSyllabus&&<><JeeFocusPicker syllabus={jeeSyllabus} value={editingTask.jee} disabled={false} onChange={tag=>setEditingTask({...editingTask,jee:tag,subjectId:tag?subjectFor(tag):editingTask.subjectId,completeJeeChapter:false})}/>{editingTask.jee&&<label className="flex gap-2 text-xs"><input type="checkbox" checked={!!editingTask.completeJeeChapter} onChange={e=>setEditingTask({...editingTask,completeJeeChapter:e.target.checked})}/>Completing this task updates chapter progress.</label>}</>}<label className="block text-xs">Scheduled date<input type="date" required className="analytics-select w-full mt-2" value={editingTask.dueDate} onChange={event=>setEditingTask({...editingTask,dueDate:event.target.value,category:'today'})}/></label><div className="flex flex-wrap gap-3"><label className="text-xs">From<input type="time" className="analytics-select block mt-2" value={editingTask.startTime||''} onChange={event=>setEditingTask({...editingTask,startTime:event.target.value,category:'today'})}/></label><label className="text-xs">To<input type="time" className="analytics-select block mt-2" value={editingTask.endTime||''} onChange={event=>setEditingTask({...editingTask,endTime:event.target.value,category:'today'})}/></label></div>{taskError&&<p role="alert" className="text-xs text-rose-300">{taskError}</p>}<div className="flex flex-wrap gap-2"><button type="button" className="analytics-button" onClick={()=>setEditingTask({...editingTask,startTime:'',endTime:''})}>Remove times</button><button type="button" className="analytics-button" onClick={()=>setEditingTask(null)}>Cancel</button><button className="analytics-button" type="submit">Save task</button></div></form></div>}
  </div>;
};
