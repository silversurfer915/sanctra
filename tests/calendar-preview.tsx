import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarView } from '../src/features/calendar/CalendarView.tsx';
import { getLocalDateString } from '../src/utils/time.ts';
import type { CalendarEvent } from '../src/features/calendar/types.ts';
import type { TaskItem, Subject } from '../src/types/index.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';


const today = getLocalDateString();
const params = new URLSearchParams(window.location.search);
const initialViewParam = (params.get('view') as 'month' | 'week' | 'agenda') || 'month';
const initialModalParam = params.get('modal') === '1';
const initialArrangeParam = params.get('arrange') === '1';

const mockSubjects: Subject[] = [
  { id: 'sub-physics', name: 'Physics Mechanics', color: '#38bdf8', createdAt: 1 },
  { id: 'sub-chem', name: 'Organic Chemistry', color: '#f59e0b', createdAt: 1 },
  { id: 'sub-math', name: 'Calculus & Vectors', color: '#a855f7', createdAt: 1 },
  { id: 'sub-bio', name: 'Cell Biology', color: '#10b981', createdAt: 1 },
];

function Preview() {
  const [blur, setBlur] = useState(12);
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 't1', workspaceId: 'w', text: 'Revise Newtonian Mechanics & Friction', dueDate: today, startTime: '09:00', endTime: '10:30', completed: false, category: 'today', subjectId: 'sub-physics', createdAt: 1 },
    { id: 't2', workspaceId: 'w', text: 'Organic Chemistry Reaction Mechanisms', dueDate: today, startTime: '11:00', endTime: '12:30', completed: true, category: 'today', subjectId: 'sub-chem', createdAt: 1 },
    { id: 't3', workspaceId: 'w', text: 'Integration by Parts Problem Set', dueDate: today, startTime: '14:00', endTime: '15:30', completed: false, category: 'today', subjectId: 'sub-math', createdAt: 1 },
    { id: 't4', workspaceId: 'w', text: 'Active Recall: Cell Membrane Structure', dueDate: today, startTime: '16:00', endTime: '17:00', completed: false, category: 'today', subjectId: 'sub-bio', createdAt: 1 },
    { id: 't5', workspaceId: 'w', text: 'Overdue: Thermodynamics Formula Sheet', dueDate: '2026-10-02', completed: false, category: 'backlog', subjectId: 'sub-physics', createdAt: 1 },
    { id: 't6', workspaceId: 'w', text: 'Unscheduled practice essay', dueDate: '', completed: false, category: 'unscheduled', createdAt: 1 },
  ]);

  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 'lunch',
      workspaceId: 'w',
      title: 'Mindful Lunch & Meditation Break',
      allDay: false,
      start: `${today}T12:30:00.000Z`,
      end: `${today}T13:30:00.000Z`,
      timezone: 'Asia/Kolkata',
      createdAt: 1,
      updatedAt: 1,
      revision: 1,
    },
    {
      id: 'colloquium',
      workspaceId: 'w',
      title: 'Department Research Seminar',
      allDay: true,
      startDate: today,
      endDateExclusive: today.slice(0, 8) + String(Number(today.slice(-2)) + 1).padStart(2, '0'),
      timezone: 'Asia/Kolkata',
      createdAt: 1,
      updatedAt: 1,
      revision: 1,
    },
  ]);

  return (
    <div
      className="sanctra-app"
      style={
        {
          minHeight: '100vh',
          padding: '16px',
          background:
            'linear-gradient(rgba(10, 20, 28, 0.75), rgba(10, 20, 28, 0.85)), url(/backgrounds/scenic/blue-mist.v2.webp) center/cover fixed',
          '--sanctra-panel-blur': `${blur}px`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 text-xs text-slate-300 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-emerald-400 uppercase tracking-widest text-[10px]">
            Preview Harness
          </span>
          <label className="flex items-center gap-2">
            <span>Glass blur:</span>
            <input
              type="range"
              value={blur}
              min={0}
              max={24}
              onChange={(e) => setBlur(+e.target.value)}
              className="accent-emerald-400 w-24"
            />
            <span>{blur}px</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="?view=month"
            className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
              initialViewParam === 'month'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            Month View
          </a>
          <a
            href="?view=week"
            className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
              initialViewParam === 'week'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            Week View
          </a>
          <a
            href="?view=agenda"
            className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
              initialViewParam === 'agenda'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            Agenda View
          </a>
        </div>
      </div>

      <CalendarView
        key={`${initialViewParam}-${initialModalParam}-${initialArrangeParam}`}
        initialView={initialViewParam}
        initialOpenEditor={initialModalParam}
        initialOpenArrange={initialArrangeParam}
        tasks={tasks}
        subjects={mockSubjects}
        events={events}
        workspaceId="w"
        legacySpaceId="w"
        timezone="Asia/Kolkata"
        ready
        onSaveTask={(id, d) =>
          setTasks((ts) =>
            id
              ? ts.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        text: d.text,
                        dueDate: d.dueDate,
                        startTime: d.startTime,
                        endTime: d.endTime,
                        subjectId: d.subjectId,
                      }
                    : t
                )
              : [
                  ...ts,
                  {
                    id: crypto.randomUUID(),
                    text: d.text,
                    dueDate: d.dueDate,
                    startTime: d.startTime,
                    endTime: d.endTime,
                    subjectId: d.subjectId,
                    completed: false,
                    category: 'today',
                    createdAt: Date.now(),
                    workspaceId: 'w',
                  },
                ]
          )
        }
        onToggleTask={(id) =>
          setTasks((ts) =>
            ts.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
          )
        }
        onFocusTask={() => {}}
        onSaveEvent={async (e) =>
          setEvents((es) => es.filter((x) => x.id !== e.id).concat(e))
        }
        onDeleteEvent={async (id) =>
          setEvents((es) => es.filter((e) => e.id !== id))
        }
        onUndoEvent={async () => {}}
      />

    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
