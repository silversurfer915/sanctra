import { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { X, Trash2, Clock } from 'lucide-react';
import type { TaskItem, Subject } from '../../types/index.ts';
import type { CalendarEntry, CalendarEvent } from './types.ts';
import { addDays, instantDate, instantTime, dateValue } from './dates.ts';
import { validateCalendarEvent } from './eventValidation.ts';

export interface CalendarTaskDraft {
  text: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  subjectId?: string;
}

interface CalendarEditorProps {
  entry?: CalendarEntry;
  event?: CalendarEvent;
  task?: TaskItem;
  selectedDate: string;
  initialTime?: string;
  timezone: string;
  subjects: Subject[];
  onSaveTask: (id: string | null, draft: CalendarTaskDraft) => void;
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onClose: () => void;
}

export function CalendarEditor(p: CalendarEditorProps) {
  const existing = p.event;
  const zone = existing?.timezone || p.timezone;

  const [kind, setKind] = useState<'task' | 'event'>(
    p.entry?.kind === 'task' ? 'task' : 'event'
  );
  const [title, setTitle] = useState(p.entry?.title || '');
  const [date, setDate] = useState(
    existing && !existing.allDay
      ? instantDate(p.entry?.start || existing.start!, zone)
      : p.entry?.date || p.selectedDate
  );
  const [endDate, setEndDate] = useState(
    existing?.allDay
      ? addDays(existing.endDateExclusive!, -1)
      : existing
      ? instantDate(p.entry?.end || existing.end!, zone)
      : p.selectedDate
  );
  const [start, setStart] = useState(
    p.task?.startTime ||
      (existing && !existing.allDay
        ? instantTime(p.entry?.start || existing.start!, zone)
        : p.initialTime || '09:00')
  );
  const [end, setEnd] = useState(
    p.task?.endTime ||
      (existing && !existing.allDay
        ? instantTime(p.entry?.end || existing.end!, zone)
        : p.initialTime
        ? `${String(Math.min(23, Number(p.initialTime.slice(0, 2)) + 1)).padStart(2, '0')}:${p.initialTime.slice(3)}`
        : '10:00')
  );
  const [allDay, setAllDay] = useState(
    p.task ? !p.task.startTime : existing?.allDay ?? false
  );
  const timezone = zone;
  const [subject, setSubject] = useState(p.task?.subjectId || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [repeat, setRepeat] = useState(existing?.recurrence?.frequency || 'none');
  const [until, setUntil] = useState(existing?.recurrence?.until || '');
  const [scope, setScope] = useState<'series' | 'occurrence'>('occurrence');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);


  // Compute duration preview
  let durationText = '';
  if (!allDay && start && end) {
    const sMin = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
    const eMin = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
    if (eMin > sMin) {
      const diff = eMin - sMin;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      durationText = `${h ? `${h} hr ` : ''}${m ? `${m} min` : ''}`.trim();
    }
  }

  const save = async () => {
    setError('');
    try {
      if (!title.trim()) throw new Error('Please enter a title.');

      if (kind === 'task') {
        p.onSaveTask(p.task?.id || null, {
          text: title.trim(),
          dueDate: date,
          startTime: allDay ? undefined : start,
          endTime: allDay ? undefined : end,
          subjectId: subject || undefined,
        });
        p.onClose();
        return;
      }

      setBusy(true);
      dateValue(date);
      dateValue(endDate);

      const times = allDay
        ? { startDate: date, endDateExclusive: addDays(endDate, 1) }
        : {
            start: Temporal.PlainDateTime.from(`${date}T${start}`)
              .toZonedDateTime(timezone, { disambiguation: 'reject' })
              .toInstant()
              .toString(),
            end: Temporal.PlainDateTime.from(`${endDate}T${end}`)
              .toZonedDateTime(timezone, { disambiguation: 'reject' })
              .toInstant()
              .toString(),
          };

      const now = Date.now();
      let event: CalendarEvent = {
        id: existing?.id || crypto.randomUUID(),
        workspaceId: existing?.workspaceId,
        title: title.trim(),
        notes,
        location,
        timezone,
        allDay,
        ...times,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        revision: (existing?.revision || 0) + 1,
        ...(repeat === 'none'
          ? {}
          : { recurrence: { frequency: repeat as 'daily' | 'weekly', ...(until ? { until } : {}) } }),
      };

      if (existing?.recurrence && scope === 'occurrence') {
        event = {
          ...existing,
          revision: existing.revision + 1,
          updatedAt: now,
          exceptions: {
            ...existing.exceptions,
            [p.entry?.occurrenceKey || date]: { title: title.trim(), ...times },
          },
        };
      } else if (existing?.exceptions) {
        event.exceptions = existing.exceptions;
      }

      const errors = validateCalendarEvent(event);
      if (errors.length) throw new Error(errors[0]);

      await p.onSaveEvent(event);
      p.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!window.confirm('Delete this calendar event?')) return;
    setBusy(true);
    try {
      if (existing.recurrence && scope === 'occurrence') {
        await p.onSaveEvent({
          ...existing,
          revision: existing.revision + 1,
          updatedAt: Date.now(),
          exceptions: {
            ...existing.exceptions,
            [p.entry?.occurrenceKey || date]: { cancelled: true },
          },
        });
      } else {
        await p.onDeleteEvent(existing.id);
      }
      p.onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove this event.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="calendar-modal-backdrop" onClick={p.onClose}>
      <section
        className="calendar-editor glass-modal"
        role="dialog"
        aria-modal="true"
        aria-label={p.entry ? 'Edit calendar item' : 'Add to calendar'}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') p.onClose();
        }}
      >
        <header>
          <div>
            <span className="workspace-eyebrow">
              {p.entry ? 'EDIT PLAN' : 'NEW PLAN'}
            </span>
            <h2>{p.entry ? 'Edit your plan' : 'Make room for a plan'}</h2>
          </div>
          <button
            type="button"
            className="calendar-icon-button"
            onClick={p.onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab switch for new entries */}
        {!p.entry && (
          <div className="calendar-view-tabs mb-4 w-full flex">
            {(['task', 'event'] as const).map((k) => (
              <button
                type="button"
                key={k}
                className="flex-1 text-center"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {k === 'task' ? 'Study Task' : 'Calendar Event'}
              </button>
            ))}
          </div>
        )}

        <form
          className="calendar-editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="calendar-editor-body">
            <label>
              <span>Title</span>
              <input
                autoFocus
                required
                maxLength={300}
                placeholder={kind === 'task' ? 'e.g. Physics Problem Set 4' : 'e.g. Biology Lab / Meeting'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                
              />
            </label>

            <div className="calendar-editor-row">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  
                />
              </label>

              {kind === 'event' && (
                <label>
                  <span>Last Day</span>
                  <input
                    type="date"
                    required
                    min={date}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    
                  />
                </label>
              )}
            </div>

            <label className="calendar-toggle-row">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                
                className="sr-only"
              />
              <span className={`calendar-toggle-pill ${allDay ? 'is-active' : ''}`}>
                <span className="calendar-toggle-knob" />
              </span>
              <span className="text-xs text-slate-200 select-none">All day</span>
            </label>

            {!allDay && (
              <div className="space-y-1.5">
                <div className="calendar-editor-row">
                  <label>
                    <span>Starts</span>
                    <input
                      type="time"
                      required
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      
                    />
                  </label>
                  <label>
                    <span>Ends</span>
                    <input
                      type="time"
                      required
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      
                    />
                  </label>
                </div>
                {durationText && (
                  <div className="text-[11px] text-emerald-400/90 flex items-center gap-1.5 px-1 font-medium">
                    <Clock size={12} />
                    <span>Duration: {durationText}</span>
                  </div>
                )}
              </div>
            )}

            {kind === 'task' ? (
              <label>
                <div className="flex items-center justify-between">
                  <span>Subject</span>
                  {subject && (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-300 font-normal">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{
                          backgroundColor:
                            p.subjects.find((s) => s.id === subject)?.color || '#34d399',
                        }}
                      />
                      <span>{p.subjects.find((s) => s.id === subject)?.name}</span>
                    </span>
                  )}
                </div>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">No specific subject</option>
                  {p.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                {existing?.recurrence && (
                  <label>
                    <span>Edit scope</span>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as typeof scope)}
                      
                    >
                      <option value="occurrence">This occurrence only</option>
                      <option value="series">Entire recurring series</option>
                    </select>
                  </label>
                )}

                {(!existing?.recurrence || scope === 'series') && (
                  <div className="calendar-editor-row">
                    <label>
                      <span>Repeat</span>
                      <select
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        
                      >
                        <option value="none">Doesn't repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </label>

                    {repeat !== 'none' && (
                      <label>
                        <span>Until (optional)</span>
                        <input
                          type="date"
                          min={date}
                          value={until}
                          onChange={(e) => setUntil(e.target.value)}
                          
                        />
                      </label>
                    )}
                  </div>
                )}

                <label>
                  <span>Location</span>
                  <input
                    placeholder="e.g. Study Hall / Room 204"
                    value={location}
                    maxLength={500}
                    onChange={(e) => setLocation(e.target.value)}
                    
                  />
                </label>

                <label>
                  <span>Notes</span>
                  <textarea
                    placeholder="Add details, links, or instructions…"
                    value={notes}
                    maxLength={5000}
                    onChange={(e) => setNotes(e.target.value)}
                    
                  />
                </label>
              </>
            )}

            {error && (
              <p role="alert" className="calendar-error">
                {error}
              </p>
            )}
          </div>

          <footer className="calendar-editor-footer">
            {existing ? (
              <button
                type="button"
                className="analytics-button text-red-400 hover:text-red-300"
                disabled={busy}
                onClick={() => void remove()}
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="analytics-button"
                onClick={p.onClose}
              >
                Cancel
              </button>
              <button
                className="workspace-primary"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Saving…' : p.entry ? 'Save changes' : 'Save plan'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
