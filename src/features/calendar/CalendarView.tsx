import { useMemo, useState, useEffect } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ListTodo,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import type { TaskItem, Subject } from '../../types/index.ts';
import type { CalendarEntry, CalendarEvent } from './types.ts';
import { CalendarEditor, type CalendarTaskDraft } from './CalendarEditor.tsx';
import { MonthGrid } from './MonthGrid.tsx';
import { WeekGrid } from './WeekGrid.tsx';
import { DayAgenda } from './DayAgenda.tsx';
import { AgendaView } from './AgendaView.tsx';
import { ArrangeTasks } from './ArrangeTasks.tsx';
import { addDays, dateValue, getMonthDates, formatDate } from './dates.ts';
import { projectCalendarEntries } from './projection.ts';
import { prepareCalendarMove } from './actions.ts';
import { belongsToWorkspace } from '../../utils/workspaces.ts';
import { validateCalendarEvent } from './eventValidation.ts';
import './calendar.css';

export interface CalendarViewProps {
  onOpenJeeEntry?: (id:string)=>void;
  tasks: TaskItem[];
  subjects: Subject[];
  events: CalendarEvent[];
  workspaceId: string;
  legacySpaceId: string;
  timezone: string;
  ready: boolean;
  error?: string;
  onRetry?: () => void;
  onSaveTask: (id: string | null, draft: CalendarTaskDraft) => void;
  onToggleTask: (id: string) => void;
  onFocusTask: (id: string) => void;
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onUndoEvent: () => Promise<void>;
  initialView?: 'month' | 'week' | 'agenda';
  initialOpenEditor?: boolean;
  initialOpenArrange?: boolean;
}

export function CalendarView(p: CalendarViewProps) {
  const today = Temporal.Now.zonedDateTimeISO(p.timezone).toPlainDate().toString();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<'month' | 'week' | 'agenda'>(() => {
    try {
      return p.initialView || (localStorage.getItem('sanctra_calendar_view') as 'month' | 'week' | 'agenda') || 'month';
    } catch {
      return p.initialView || 'month';
    }
  });
  const [filters, setFilters] = useState({
    task: true,
    event: true,
    completed: true,
  });
  const [editor, setEditor] = useState<CalendarEntry | null | undefined>(p.initialOpenEditor ? null : undefined);
  const [editorPreDate, setEditorPreDate] = useState<string | null>(null);
  const [editorPreTime, setEditorPreTime] = useState<string | null>(null);
  const [arrange, setArrange] = useState(Boolean(p.initialOpenArrange));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [move, setMove] = useState<{ id: string; patch: Partial<TaskItem>; issues: string[] } | null>(null);
  const [undo, setUndo] = useState<{ id: string; before: TaskItem; after: Partial<TaskItem> } | null>(null);

  const dates =
    view === 'week'
      ? Array.from({ length: 7 }, (_, i) =>
          addDays(selected, -dateValue(selected).dayOfWeek + 1 + i)
        )
      : getMonthDates(selected);

  const start = dates[0];
  const end = addDays(dates[dates.length - 1], 1);

  const all = useMemo(
    () =>
      projectCalendarEntries({
        ...p,
        rangeStart: start,
        rangeEnd: end,
      }),
    [p.tasks, p.events, p.subjects, p.workspaceId, p.legacySpaceId, p.timezone, start, end]
  );

  const entries = all.filter(
    (e) => filters[e.kind] && (filters.completed || !e.completed)
  );

  const tasks = p.tasks.filter((t) => belongsToWorkspace(t, p.workspaceId, p.legacySpaceId));

  // Count candidates for Arrange Tasks badge
  const arrangeCount = tasks.filter((t) => !t.completed && (!t.dueDate || t.dueDate < today)).length;

  const select = (date: string) => {
    setSelected(date);
    setError('');
  };

  const open = (entry: CalendarEntry) => {
    if(entry.readonly && entry.sourceId.startsWith('jee.')) {p.onOpenJeeEntry?.(entry.sourceId);return;}
    setSelected(entry.date);
    setEditorPreDate(entry.date);
    setEditor(entry);
  };

  const openNew = (dateToUse?: string, timeToUse?: string) => {
    const d = dateToUse || selected;
    setEditorPreDate(d);
    setEditorPreTime(timeToUse || null);
    setEditor(null);
  };

  const saveTask = (id: string | null, draft: CalendarTaskDraft) => {
    const task = tasks.find((t) => t.id === id) || {
      id: 'new',
      text: draft.text,
      dueDate: '',
      completed: false,
      category: 'today' as const,
      createdAt: Date.now(),
    };
    const result = prepareCalendarMove(
      task,
      { date: draft.dueDate, startTime: draft.startTime, endTime: draft.endTime },
      tasks
    );
    if (result.issues.length) {
      throw new Error(`${result.issues.join('; ')}. Choose a free time slot.`);
    }
    p.onSaveTask(id, draft);
  };

  const applyMove = (id: string, patch: Partial<TaskItem>) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setUndo({ id, before: task, after: patch });
    p.onSaveTask(id, {
      text: task.text,
      dueDate: patch.dueDate!,
      startTime: patch.startTime,
      endTime: patch.endTime,
      subjectId: task.subjectId,
    });
    select(patch.dueDate!);
    setMove(null);
  };

  const moveTask = (id: string, date: string, time?: string) => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const duration =
        task.startTime && task.endTime
          ? Number(task.endTime.slice(0, 2)) * 60 +
            Number(task.endTime.slice(3)) -
            (Number(task.startTime.slice(0, 2)) * 60 + Number(task.startTime.slice(3)))
          : 60;
      let finish = task.endTime;
      if (time) {
        const mins = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + duration;
        if (mins > 1439) {
          throw new Error('This task would extend past midnight. Choose an earlier start.');
        }
        finish = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      }
      const result = prepareCalendarMove(
        task,
        { date, startTime: time || task.startTime, endTime: finish },
        tasks
      );
      if (result.issues.length) setMove({ id, ...result });
      else applyMove(id, result.patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Choose a valid date.');
    }
  };

  const undoMove = () => {
    if (!undo) return;
    const current = tasks.find((t) => t.id === undo.id);
    if (
      !current ||
      current.dueDate !== undo.after.dueDate ||
      current.startTime !== undo.after.startTime ||
      current.endTime !== undo.after.endTime
    ) {
      setError('This task changed after the move. Reopen it to make another edit.');
      return;
    }
    p.onSaveTask(undo.id, {
      text: current.text,
      dueDate: undo.before.dueDate || '',
      startTime: undo.before.startTime,
      endTime: undo.before.endTime,
      subjectId: current.subjectId,
    });
    setUndo(null);
  };

  const navigate = (offset: number) =>
    select(
      (view === 'week'
        ? dateValue(selected).add({ days: offset * 7 })
        : dateValue(selected).add({ months: offset })
      ).toString()
    );

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        select(today);
      } else if (e.key === 'm' || e.key === 'M') {
        setView('month');
      } else if (e.key === 'w' || e.key === 'W') {
        setView('week');
      } else if (e.key === 'a' || e.key === 'A') {
        setView('agenda');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [today]);

  const exportEvents = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            calendarEvents: p.events.filter((e) =>
              belongsToWorkspace(e, p.workspaceId, p.legacySpaceId)
            ),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sanctra-calendar.json';
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Calendar exported.');
    setTimeout(() => setNotice(null), 3000);
  };

  const importEvents = async (file: File) => {
    try {
      if (file.size > 2000000) throw new Error('Choose a calendar backup under 2 MB.');
      const parsed = JSON.parse(await file.text());
      if (!parsed.version || !Array.isArray(parsed.calendarEvents)) {
        throw new Error('Choose a valid Sanctra calendar backup file.');
      }
      const now = Date.now();
      const newEvents: CalendarEvent[] = parsed.calendarEvents
        .filter((e: CalendarEvent) => !e.deletedAt)
        .map((e: CalendarEvent) => ({
          ...e,
          id: crypto.randomUUID(),
          workspaceId: p.workspaceId,
          remote: undefined,
          createdAt: now,
          updatedAt: now,
          revision: 1,
        }));
      for (const e of newEvents) {
        const issues = validateCalendarEvent(e);
        if (issues.length) throw new Error(issues[0]);
      }
      for (const e of newEvents) await p.onSaveEvent(e);
      setNotice(`Successfully imported ${newEvents.length} event(s).`);
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import calendar.');
    }
  };

  return (
    <div className="calendar-page">
      {/* 1. Header */}
      <header className="calendar-page-header">
        <div>
          <span className="workspace-eyebrow">A LITTLE ROOM TO PLAN</span>
          <h1>Your calendar</h1>
          <p>Tasks, events and milestones, brought together peacefully.</p>
        </div>

        <div className="calendar-page-actions">
          <button
            type="button"
            className="calendar-add-plan-btn"
            disabled={!p.ready}
            onClick={() => openNew(selected)}
            title="Create a new study task or scheduled block"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add plan</span>
          </button>
        </div>
      </header>

      {/* 2. Main Board */}
      <section className="calendar-board glass-card">
        {/* Toolbar */}
        <div className="calendar-toolbar">
          <div className="calendar-date-navigation">
            <button
              type="button"
              className="calendar-icon-button"
              aria-label="Previous period"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} />
            </button>

            <h2>
              {formatDate(selected, {
                month: 'long',
                year: 'numeric',
              })}
            </h2>

            <button
              type="button"
              className="calendar-icon-button"
              aria-label="Next period"
              onClick={() => navigate(1)}
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="analytics-button text-xs py-1.5 px-3"
              onClick={() => select(today)}
            >
              Today
            </button>
          </div>

          {/* View mode segmented pill control */}
          <div className="calendar-view-tabs" role="tablist">
            {(['month', 'week', 'agenda'] as const).map((v) => (
              <button
                type="button"
                key={v}
                role="tab"
                aria-selected={view === v}
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  try {
                    localStorage.setItem('sanctra_calendar_view', v);
                  } catch {}
                }}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Actions Bar */}
        <div className="calendar-filters">
          <button
            type="button"
            className="calendar-filter-chip"
            aria-pressed={filters.task}
            onClick={() => setFilters((s) => ({ ...s, task: !s.task }))}
          >
            <span className="calendar-dot calendar-dot-task" />
            <span>Tasks</span>
          </button>

          <button
            type="button"
            className="calendar-filter-chip"
            aria-pressed={filters.event}
            onClick={() => setFilters((s) => ({ ...s, event: !s.event }))}
          >
            <span className="calendar-dot calendar-dot-event" />
            <span>Events</span>
          </button>

          <button
            type="button"
            className="calendar-filter-chip"
            aria-pressed={filters.completed}
            onClick={() => setFilters((s) => ({ ...s, completed: !s.completed }))}
          >
            <span className="calendar-dot calendar-dot-completed" />
            <span>Completed</span>
          </button>

          <button
            type="button"
            className="calendar-arrange-btn"
            onClick={() => setArrange(!arrange)}
            aria-expanded={arrange}
          >
            <ListTodo size={14} />
            <span>Arrange tasks</span>
            {arrangeCount > 0 && (
              <span className="calendar-badge-count">{arrangeCount}</span>
            )}
          </button>

          <span className="calendar-timezone-badge">
            {p.timezone.replaceAll('_', ' ')}
          </span>

          <button
            type="button"
            className="calendar-icon-button w-8 h-8"
            onClick={exportEvents}
            aria-label="Export calendar events"
            title="Export events"
          >
            <Download size={13} />
          </button>

          <label
            className="calendar-icon-button w-8 h-8 cursor-pointer"
            title="Import event backup"
          >
            <Upload size={13} />
            <span className="sr-only">Import calendar events</span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              disabled={!p.ready}
              onChange={(e) => {
                if (e.target.files?.[0]) void importEvents(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {/* Notices & Alerts */}
        {notice && (
          <p role="status" className="calendar-undo mb-3 text-emerald-400">
            {notice}
          </p>
        )}

        {(error || p.error) && (
          <p role="alert" className="calendar-error">
            {error || p.error}{p.error&&p.onRetry&&<button type="button" className="calendar-pill" onClick={p.onRetry}>Retry connection</button>}
          </p>
        )}

        {undo && (
          <p className="calendar-undo" role="status">
            Task moved.{' '}
            <button type="button" onClick={undoMove}>
              Undo
            </button>
          </p>
        )}

        {move && (
          <div role="alert" className="calendar-error flex items-center justify-between">
            <span>{move.issues.join('; ')}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="underline"
                onClick={() => applyMove(move.id, move.patch)}
              >
                Move anyway
              </button>
              <button
                type="button"
                className="underline opacity-80"
                onClick={() => setMove(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Grid + Sidebar Layout */}
        <div className="calendar-layout">
          <div className="calendar-main">
            {view === 'month' ? (
              <MonthGrid
                dates={dates}
                month={selected}
                selected={selected}
                today={today}
                entries={entries}
                timezone={p.timezone}
                onSelect={select}
                onOpen={open}
                onMove={moveTask}
                onQuickAdd={(date) => openNew(date)}
              />
            ) : view === 'week' ? (
              <WeekGrid
                dates={dates}
                selected={selected}
                entries={entries}
                timezone={p.timezone}
                onSelect={select}
                onOpen={open}
                onMove={moveTask}
                onQuickAdd={(date, time) => openNew(date, time)}
              />
            ) : (
              <AgendaView
                dates={dates}
                today={today}
                selected={selected}
                entries={entries}
                timezone={p.timezone}
                subjects={p.subjects}
                onSelect={select}
                onOpen={open}
                onQuickAdd={(date) => openNew(date)}
                onToggleTask={p.onToggleTask}
                onFocusTask={p.onFocusTask}
              />
            )}
          </div>

          {/* Right Side Panel */}
          <div className="calendar-side">
            {arrange ? (
              <ArrangeTasks
                tasks={tasks}
                today={today}
                date={selected}
                onMove={moveTask}
                onClose={() => setArrange(false)}
              />
            ) : (
              <DayAgenda
                date={selected}
                entries={entries.filter((e) => e.date === selected)}
                timezone={p.timezone}
                onOpen={open}
                onAdd={() => openNew(selected)}
                onToggle={p.onToggleTask}
                onFocus={p.onFocusTask}
              />
            )}

            <button
              type="button"
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-2 flex items-center justify-center gap-1.5"
              onClick={() =>
                void p.onUndoEvent().catch((e) => setError(e.message))
              }
            >
              <RotateCcw size={12} />
              <span>Undo last event edit</span>
            </button>
          </div>
        </div>
      </section>

      {/* Editor Modal */}
      {editor !== undefined && (
        <CalendarEditor
          entry={editor || undefined}
          event={p.events.find((e) => e.id === editor?.sourceId)}
          task={tasks.find((t) => t.id === editor?.sourceId)}
          selectedDate={editorPreDate || selected}
          initialTime={editorPreTime || undefined}
          timezone={p.timezone}
          subjects={p.subjects}
          onSaveTask={saveTask}
          onSaveEvent={(e) => p.onSaveEvent({ ...e, workspaceId: p.workspaceId })}
          onDeleteEvent={p.onDeleteEvent}
          onClose={() => {
            setEditor(undefined);
            setEditorPreDate(null);
            setEditorPreTime(null);
          }}
        />
      )}
    </div>
  );
}
