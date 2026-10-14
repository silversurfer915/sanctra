import { Temporal } from '@js-temporal/polyfill';
import { useEffect, useRef } from 'react';
import { formatDate, instantTime } from './dates.ts';
import type { CalendarEntry } from './types.ts';

function getMinutesFromMidnight(instant: string, day: string, zone: string): number {
  const value = Temporal.Instant.from(instant).toZonedDateTimeISO(zone);
  if (value.toPlainDate().toString() < day) return 0;
  if (value.toPlainDate().toString() > day) return 1440;
  return value.hour * 60 + value.minute;
}

interface WeekGridProps {
  dates: string[];
  entries: CalendarEntry[];
  timezone: string;
  selected: string;
  onSelect: (date: string) => void;
  onOpen: (entry: CalendarEntry) => void;
  onMove: (id: string, date: string, time?: string) => void;
  onQuickAdd?: (date: string, time?: string) => void;
}

export function WeekGrid({
  dates,
  entries,
  timezone,
  selected,
  onSelect,
  onOpen,
  onMove,
  onQuickAdd,
}: WeekGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to 8 AM by default (8 * 52px = 416px) or current hour
      const first = entries.filter(e=>!e.allDay&&e.start).map(e=>Temporal.Instant.from(e.start!).toZonedDateTimeISO(timezone).hour);
      const hour = first.length ? Math.max(0, Math.min(...first) - 1) : 6;
      scrollRef.current.scrollTop = hour * 52;
    }
  }, []);

  const now = Temporal.Now.zonedDateTimeISO(timezone);
  const todayStr = now.toPlainDate().toString();

  return (
    <div className="calendar-week">
      {/* 24-Hour Scrollable Grid (with unified sticky header for pixel-perfect alignment) */}
      <div ref={scrollRef} className="calendar-week-scroll">
        <div className="calendar-week-sticky-header">
          {/* Week Header Columns */}
          <div className="calendar-week-heading">
            <span /> {/* Spacer for hours column */}
            {dates.map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={selected === d}
                onClick={() => onSelect(d)}
                className={d === todayStr ? 'is-today' : ''}
              >
                <span>{formatDate(d, { weekday: 'short' })}</span>
                <strong>{Number(d.slice(-2))}</strong>
              </button>
            ))}
          </div>

          {/* All-Day Items Row */}
          <div className="calendar-all-day">
            <small>All day</small>
            {dates.map((d) => (
              <div key={d}>
                {entries
                  .filter((e) => e.date === d && e.allDay)
                  .map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className={`calendar-mini calendar-kind-${e.kind}`}
                      style={e.color ? { borderLeftColor: e.color } : undefined}
                      onClick={() => onOpen(e)}
                    >
                      <span>{e.title}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>

        <div className="calendar-time-grid">
          {/* Hours Column */}
          <div className="calendar-hours">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h}>{String(h).padStart(2, '0')}:00</span>
            ))}
          </div>

          {/* 7 Daily Time Columns */}
          {dates.map((d) => {
            const timed = entries.filter((e) => e.date === d && !e.allDay);
            const columns: number[] = [];

            const positions = timed.map((e) => {
              const start = getMinutesFromMidnight(e.start!, d, timezone);
              const end = getMinutesFromMidnight(e.end!, d, timezone);
              let column = columns.findIndex((lastEnd) => lastEnd <= start);
              if (column < 0) column = columns.length;
              columns[column] = end;
              return { e, start, end, column };
            });

            const totalCols = Math.max(1, columns.length);

            return (
              <div
                className="calendar-time-column"
                key={d}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => {
                  ev.preventDefault();
                  const id = ev.dataTransfer.getData('text/sanctra-task');
                  const offset = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
                  const minutes = Math.max(0, Math.min(1410, Math.round(((offset / 52) * 60) / 15) * 15));
                  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
                  const min = String(minutes % 60).padStart(2, '0');
                  if (id) onMove(id, d, `${hour}:${min}`);
                }}
              >
                {/* 24 Background Clickable Hour Slots */}
                {Array.from({ length: 24 }, (_, h) => {
                  const slotTime = `${String(h).padStart(2, '0')}:00`;
                  return (
                    <button
                      type="button"
                      key={h}
                      className="calendar-time-slot group"
                      aria-label={`Select ${d} at ${slotTime}`}
                      onClick={() => onSelect(d)}
                      onDoubleClick={() => onQuickAdd?.(d, slotTime)}
                      title={`Double-click to add plan at ${slotTime}`}
                    >
                      <span className="calendar-time-slot-hint">
                        + {slotTime}
                      </span>
                    </button>
                  );
                })}

                {/* Timed Blocks */}
                {positions.map(({ e, start, end, column }) => (
                  <button
                    type="button"
                    key={e.id}
                    className={`calendar-time-block calendar-kind-${e.kind} ${
                      e.completed ? 'is-complete' : ''
                    }`}
                    style={{
                      top: (start / 60) * 52,
                      height: Math.max(26, ((end - start) / 60) * 52),
                      left: `${(column / totalCols) * 100}%`,
                      width: `${100 / totalCols}%`,
                      borderLeftColor: e.color || undefined,
                    }}
                    onClick={() => {
                      onSelect(d);
                      onOpen(e);
                    }}
                    draggable={e.kind === 'task'}
                    onDragStart={(ev) =>
                      ev.dataTransfer.setData('text/sanctra-task', e.sourceId)
                    }
                  >
                    <span>{e.title}</span>
                    <small>{instantTime(e.start!, timezone)}</small>
                  </button>
                ))}

                {/* Current Time Indicator Line */}
                {todayStr === d && (
                  <span
                    className="calendar-now-line"
                    style={{ top: ((now.hour * 60 + now.minute) / 60) * 52 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
