import { Plus, Check, Play, CalendarDays } from 'lucide-react';
import { entryIcon } from './MonthGrid.tsx';
import { formatDate, instantTime } from './dates.ts';
import type { CalendarEntry } from './types.ts';

interface DayAgendaProps {
  date: string;
  entries: CalendarEntry[];
  timezone: string;
  onOpen: (entry: CalendarEntry) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
}

export function DayAgenda({
  date,
  entries,
  timezone,
  onOpen,
  onAdd,
  onToggle,
  onFocus,
}: DayAgendaProps) {
  const taskCount = entries.filter((e) => e.kind === 'task').length;
  const eventCount = entries.filter((e) => e.kind === 'event').length;

  const countSummary = [
    taskCount ? `${taskCount} task${taskCount > 1 ? 's' : ''}` : '',
    eventCount ? `${eventCount} event${eventCount > 1 ? 's' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="calendar-agenda glass-card" aria-label="Selected day agenda">
      <header>
        <div>
          <span className="workspace-eyebrow">YOUR DAY</span>
          <h2>{formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
          <p>{countSummary || 'No plans scheduled'}</p>
        </div>
        <button
          type="button"
          className="calendar-icon-button"
          aria-label="Add plan for this day"
          title="Add plan"
          onClick={onAdd}
        >
          <Plus size={18} />
        </button>
      </header>

      {!entries.length && (
        <div className="calendar-empty">
          <CalendarDays size={32} className="text-slate-400 mb-2 opacity-60" />
          <p className="font-medium text-slate-300">A clear, quiet day.</p>
          <p className="text-xs text-slate-400 mt-1">
            Enjoy your free focus time or schedule a study session.
          </p>
          <button
            type="button"
            className="workspace-primary mt-4 inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
            onClick={onAdd}
          >
            <Plus size={14} />
            <span>Add plan</span>
          </button>
        </div>
      )}

      <div className="calendar-agenda-items">
        {entries.map((e) => {
          const Icon = entryIcon[e.kind];
          const hasColor = Boolean(e.color);

          return (
            <article
              className={`calendar-agenda-card kind-${e.kind} ${
                e.completed ? 'is-complete' : ''
              }`}
              key={e.id}
            >
              <div
                className="calendar-agenda-icon"
                style={hasColor ? { color: e.color } : undefined}
              >
                <Icon size={16} />
              </div>

              <button
                type="button"
                className="calendar-agenda-info"
                onClick={() => onOpen(e)}
              >
                <strong className={e.completed ? 'line-through opacity-50' : ''}>
                  {e.title}
                </strong>
                <span>
                  {e.allDay
                    ? 'All day'
                    : `${instantTime(e.start!, timezone)} – ${instantTime(e.end!, timezone)}`}
                  {e.subjectName ? ` · ${e.subjectName}` : ''}
                  {e.readonly ? ' · Read-only' : ''}
                </span>
              </button>

              <div className="calendar-agenda-actions">
                {e.kind === 'task' && (
                  <>
                    <button
                      type="button"
                      className={`calendar-check-btn ${e.completed ? 'is-checked' : ''}`}
                      aria-label={`${e.completed ? 'Mark incomplete' : 'Complete'} ${e.title}`}
                      title={e.completed ? 'Mark incomplete' : 'Complete task'}
                      onClick={() => onToggle(e.sourceId)}
                    >
                      <Check size={14} />
                    </button>

                    {!e.completed && (
                      <button
                        type="button"
                        className="calendar-focus-btn"
                        aria-label={`Start focus session for ${e.title}`}
                        title="Focus on this task"
                        onClick={() => onFocus(e.sourceId)}
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Focus</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
