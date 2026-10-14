import {JeeFocusPicker} from '../JeeFocusPicker.tsx';
import type {JeeSyllabus} from '../../types/jeetrack.ts';
import type {JeeSessionTag} from '../../types/index.ts';
import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import type { TaskItem, Subject } from '../../types/index.ts';
import { Modal, Panel, Empty, today, dateLabel, confirmDelete } from './JeeUi.tsx';

export function JeeTasksView({
  syllabus,
  tasks,
  subjects,
  onUpdateTasks,
  onFocusTask,
}: {
  syllabus:JeeSyllabus;
  tasks: TaskItem[];
  subjects: Subject[];
  onUpdateTasks: (t: TaskItem[]) => void;
  onFocusTask: (t: TaskItem) => void;
}) {
  const [editing,setEditing]=useState<TaskItem|null>(null);
  const [text, setText] = useState('');
  const [date, setDate] = useState(today());
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [subject, setSubject] = useState('');
  const [chapter,setChapter]=useState<JeeSessionTag>();
  const [completeChapter,setCompleteChapter]=useState(false);

  const displayed = tasks
    .filter((t) => filter === 'all' || (filter === 'done' ? t.completed : !t.completed))
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  return (
    <>
      <div className="jee-heading">
        <div>
          <h1>Study Tasks & Planner</h1>
          <p>
            Shared with Sanctra’s main planner. Tasks added or updated here sync directly with your timer.
          </p>
        </div>
      </div>

      <Panel title="Add a Study Task" subtitle="Create a quick task with due date and subject">
        <form
          className="jee-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onUpdateTasks([
              ...tasks,
              {
                id: crypto.randomUUID(),
                text: text.trim(),
                completed: false,
                dueDate: date,
                category: date ? 'today' : 'unscheduled',
                subjectId: subject || undefined,
                createdAt: Date.now(),
                ...(chapter?{jee:chapter,completeJeeChapter:completeChapter}:{}),
              },
            ]);
            setText('');setCompleteChapter(false);
          }}
        >
          <div className="jee-form-row" style={{ gridTemplateColumns: '2fr 1fr auto', alignItems: 'end' }}>
            <label>
              Task description
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Solve 25 Rotational Dynamics PYQs"
                required
                maxLength={500}
              />
            </label>
            <label>
              Due date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="jee-primary" type="submit" style={{ height: 44 }}>
              <Plus size={16} /> Add task
            </button>
          </div>

          <label style={{ maxWidth: 320 }}>
            Sanctra subject
            <select value={subject} onChange={(e) => {setSubject(e.target.value);setChapter(undefined);}}>
              <option value="">No subject tag</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <JeeFocusPicker syllabus={syllabus} value={chapter} disabled={false} onChange={tag=>{
            setChapter(tag);setCompleteChapter(false);
            if(tag){const label={physics:'physics',chemistry:'chemistry',maths:'mathematics'}[tag.subject];setSubject(subjects.find(s=>s.name.toLowerCase()===label||tag.subject==='maths'&&s.name.toLowerCase()==='maths')?.id||'');}
          }}/>
          {chapter && <label className="jee-check"><input type="checkbox" checked={completeChapter} onChange={e=>setCompleteChapter(e.target.checked)}/>Completing this task also {chapter.kind==='revision'?'records one chapter revision':chapter.kind==='lecture'?'marks chapter theory complete':chapter.kind==='practice'?'marks chapter practice complete':'records task completion only'}.</label>}
        </form>
      </Panel>

      <div className="jee-segments" aria-label="Task filter">
        {(
          [
            ['active', 'Active tasks'],
            ['done', 'Completed'],
            ['all', 'All tasks'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <Panel title="Shared Task List" subtitle={`${displayed.length} tasks in current view`}>
        {displayed.length > 0 ? (
          <ul className="jee-list">
            {displayed.map((t) => (
              <li key={t.id}>
                <label className="jee-check">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() =>
                      onUpdateTasks(
                        tasks.map((row) =>
                          row.id === t.id ? { ...row, completed: !row.completed } : row
                        )
                      )
                    }
                  />
                  <span>
                    <strong style={{ textDecoration: t.completed ? 'line-through' : undefined, opacity: t.completed ? 0.6 : 1 }}>
                      {t.text}
                    </strong>
                    <small>
                      {t.dueDate ? dateLabel(t.dueDate) : 'Unscheduled'}
                      {t.jee ? ` · ${syllabus[t.jee.subject].find(c=>c.id===t.jee?.chapterId)?.name||'Chapter removed'} · ${t.jee.kind}` : ''}
                      {t.subjectId
                        ? ` · ${subjects.find((s) => s.id === t.subjectId)?.name || 'Subject removed'}`
                        : ''}
                    </small>
                  </span>
                </label>

                <div className="jee-actions">
                  {!t.completed && (
                    <button
                      type="button"
                      style={{ minHeight: 34, padding: '5px 12px', fontSize: 12.5 }}
                      onClick={() => onFocusTask(t)}
                    >
                      <Target size={13} /> Focus
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ minHeight: 34, padding: '5px 12px', fontSize: 12.5 }}
                    onClick={() => {
                      setEditing({...t});
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="jee-danger"
                    style={{ minHeight: 34, padding: '5px 12px', fontSize: 12.5 }}
                    onClick={() => {
                      if (confirmDelete('task'))
                        onUpdateTasks(tasks.filter((row) => row.id !== t.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            {filter === 'done'
              ? 'No completed tasks yet.'
              : 'No tasks in this selection. Add a task above to schedule your study.'}
          </Empty>
        )}
      </Panel>
      {editing&&<Modal title="Edit shared study task" onClose={()=>setEditing(null)}><form className="jee-form" onSubmit={e=>{e.preventDefault();onUpdateTasks(tasks.map(t=>t.id===editing.id?editing:t));setEditing(null);}}><label>Task<input required maxLength={500} value={editing.text} onChange={e=>setEditing({...editing,text:e.target.value})}/></label><label>Due date<input type="date" value={editing.dueDate||''} onChange={e=>setEditing({...editing,dueDate:e.target.value,category:e.target.value?'today':'unscheduled'})}/></label><JeeFocusPicker syllabus={syllabus} value={editing.jee} disabled={false} onChange={tag=>setEditing({...editing,jee:tag,completeJeeChapter:false})}/>{editing.jee&&<label className="jee-check"><input type="checkbox" checked={!!editing.completeJeeChapter} onChange={e=>setEditing({...editing,completeJeeChapter:e.target.checked})}/>Completing this task updates chapter progress.</label>}<button className="jee-primary">Save task</button></form></Modal>}
    </>
  );
}
