import { CalendarDays, Plus, Check, Play, MapPin, Clock } from 'lucide-react';
import { formatDate, instantTime } from './dates.ts';
import { entryIcon } from './MonthGrid.tsx';
import type { CalendarEntry } from './types.ts';
import type { Subject } from '../../types/index.ts';

interface AgendaViewProps {
  dates: string[];
  today: string;
  selected: string;
  entries: CalendarEntry[];
  timezone: string;
  subjects: Subject[];
  onSelect: (date: string) => void;
  onOpen: (entry: CalendarEntry) => void;
  onQuickAdd: (date: string) => void;
  onToggleTask: (id: string) => void;
  onFocusTask: (id: string) => void;
}

export function AgendaView({
  dates,
  today,
  selected,
  entries,
  timezone,
  onSelect,
  onOpen,
  onQuickAdd,
  onToggleTask,
  onFocusTask,
}: AgendaViewProps) {
  // Get all dates in range that have entries, sorted chronologically
  const activeDates = dates.filter((d) => entries.some((e) => e.date === d));

  if (activeDates.length === 0) {
    return (
      <div className="calendar-agenda-empty glass-panel">
        <CalendarDays size={36} className="text-slate-500 mx-auto mb-3" />
        <h3 className="font-display text-lg text-white mb-1">Your schedule is serene</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
          No tasks or events scheduled for this period. Take time to breathe, or create a mindful plan.
        </p>
        <button
          type="button"
          className="workspace-primary inline-flex items-center gap-1.5"
          onClick={() => onQuickAdd(selected || today)}
        >
          <Plus size={15} />
          <span>Add plan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="calendar-agenda-timeline">
      {activeDates.map((d) => {
        const dayEntries = entries
          .filter((e) => e.date === d)
          .sort((a, b) => {
            // All-day items first, then by time
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            if (a.start && b.start) return a.start.localeCompare(b.start);
            return 0;
          });

        const isToday = d === today;
        const isSelected = d === selected;
        const taskCount = dayEntries.filter((e) => e.kind === 'task').length;
        const eventCount = dayEntries.filter((e) => e.kind === 'event').length;

        const summaryParts = [
          taskCount ? `${taskCount} task${taskCount > 1 ? 's' : ''}` : '',
          eventCount ? `${eventCount} event${eventCount > 1 ? 's' : ''}` : '',
        ].filter(Boolean);

        return (
          <section
            key={d}
            id={`agenda-day-${d}`}
            className={`calendar-agenda-group ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelect(d)}
          >
            {/* Day Header */}
            <header className="calendar-agenda-group-header">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display text-lg text-white">
                    {formatDate(d, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  {isToday && (
                    <span className="calendar-today-badge">Today</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {summaryParts.join(' · ')}
                </span>
              </div>

              <button
                type="button"
                className="calendar-icon-button"
                title={`Add plan on ${d}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdd(d);
                }}
              >
                <Plus size={15} />
              </button>
            </header>

            {/* Day Items List */}
            <div className="calendar-agenda-group-items">
              {dayEntries.map((e) => {
                const Icon = entryIcon[e.kind];
                const isTask = e.kind === 'task';

                let timeText = 'All day';
                if (!e.allDay && e.start) {
                  timeText = instantTime(e.start, timezone);
                  if (e.end) {
                    timeText += ` – ${instantTime(e.end, timezone)}`;
                  }
                }

                return (
                  <div
                    key={e.id}
                    className={`calendar-agenda-item-card calendar-kind-${e.kind} ${
                      e.completed ? 'is-complete' : ''
                    }`}
                    style={{
                      borderLeftColor: e.color || undefined,
                    }}
                    onClick={() => onOpen(e)}
                  >
                    {/* Left: Completion Checkbox (for tasks) or Icon */}
                    <div className="calendar-agenda-item-left">
                      {isTask ? (
                        <button
                          type="button"
                          className={`calendar-agenda-checkbox ${e.completed ? 'is-checked' : ''}`}
                          aria-label={e.completed ? 'Mark uncompleted' : 'Mark completed'}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onToggleTask(e.sourceId);
                          }}
                        >
                          <Check size={12} className={e.completed ? 'opacity-100' : 'opacity-0'} />
                        </button>
                      ) : (
                        <span className="calendar-agenda-icon-wrap">
                          <Icon size={15} />
                        </span>
                      )}
                    </div>

                    {/* Middle: Title, Meta, Notes */}
                    <div className="calendar-agenda-item-content">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="calendar-agenda-item-title">
                          {e.title}
                        </strong>

                        {e.subjectName && (
                          <span className="calendar-agenda-subject-pill">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: e.color || '#34d399' }}
                            />
                            <span>{e.subjectName}</span>
                          </span>
                        )}

                      </div>

                      <div className="calendar-agenda-item-meta">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <span>{timeText}</span>
                        </span>

                        {e.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" />
                            <span>{e.location}</span>
                          </span>
                        )}

                        {e.notes && (
                          <span className="calendar-agenda-item-notes truncate max-w-sm">
                            {e.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action (Focus button for tasks) */}
                    {isTask && !e.completed && (
                      <div className="calendar-agenda-item-actions">
                        <button
                          type="button"
                          className="calendar-agenda-focus-btn"
                          title="Start focus timer on this task"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onFocusTask(e.sourceId);
                          }}
                        >
                          <Play size={11} className="fill-current" />
                          <span>Focus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
