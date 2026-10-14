import { useState } from 'react';
import { CheckSquare, CalendarDays, Plus } from 'lucide-react';
import type { CalendarEntry } from './types.ts';
import { formatDate, addDays, instantTime } from './dates.ts';

export const entryIcon = {
  task: CheckSquare,
  event: CalendarDays,
};

interface Props {
  dates: string[];
  month: string;
  selected: string;
  today: string;
  entries: CalendarEntry[];
  timezone: string;
  onSelect: (date: string) => void;
  onOpen: (entry: CalendarEntry) => void;
  onMove: (id: string, date: string) => void;
  onQuickAdd?: (date: string) => void;
}

export function MonthGrid(p: Props) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  return (
    <div
      className="calendar-month"
      role="grid"
      aria-label={formatDate(p.month, { month: 'long', year: 'numeric' })}
    >
      <div className="calendar-weekdays" role="row">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span role="columnheader" key={day}>
            {day}
          </span>
        ))}
      </div>

      <div className="calendar-month-days">
        {p.dates.map((date) => {
          const items = p.entries.filter((e) => e.date === date);
          const isSelected = date === p.selected;
          const isToday = date === p.today;
          const isAdjacent = date.slice(0, 7) !== p.month.slice(0, 7);
          const isDragOver = dragOverDate === date;

          return (
            <div
              role="gridcell"
              aria-selected={isSelected}
              className={`calendar-day ${isAdjacent ? 'is-adjacent' : ''} ${
                isSelected ? 'is-selected' : ''
              } ${isDragOver ? 'is-drag-over' : ''}`}
              key={date}
              onClick={() => p.onSelect(date)}
              onDoubleClick={() => p.onQuickAdd?.(date)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverDate !== date) setDragOverDate(date);
              }}
              onDragLeave={() => {
                if (dragOverDate === date) setDragOverDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDate(null);
                const id = e.dataTransfer.getData('text/sanctra-task');
                if (id) p.onMove(id, date);
              }}
            >
              <div className="calendar-day-header">
                <button
                  type="button"
                  className={`calendar-date ${isToday ? 'is-today' : ''}`}
                  aria-label={formatDate(date, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  aria-pressed={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onSelect(date);
                  }}
                  onKeyDown={(e) => {
                    const offset = (
                      {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -7,
                        ArrowDown: 7,
                      } as Record<string, number>
                    )[e.key];
                    if (offset) {
                      e.preventDefault();
                      p.onSelect(addDays(date, offset));
                    }
                  }}
                >
                  {Number(date.slice(-2))}
                </button>

                {p.onQuickAdd && (
                  <button
                    type="button"
                    className="calendar-quick-add"
                    aria-label={`Add item to ${date}`}
                    title="Add item"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onSelect(date);
                      p.onQuickAdd?.(date);
                    }}
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              <div className="calendar-day-items">
                {items.slice(0, 3).map((item) => {
                  const Icon = entryIcon[item.kind];
                  const hasColor = Boolean(item.color);

                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`calendar-mini calendar-kind-${item.kind} ${
                        item.completed ? 'is-complete' : ''
                      }`}
                      style={hasColor ? { borderLeftColor: item.color } : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onSelect(date);
                        p.onOpen(item);
                      }}
                      draggable={item.kind === 'task'}
                      onDragStart={(e) =>
                        e.dataTransfer.setData('text/sanctra-task', item.sourceId)
                      }
                      title={`${item.title} ${
                        !item.allDay && item.start
                          ? `(${instantTime(item.start, p.timezone)})`
                          : ''
                      }`}
                    >
                      <Icon size={12} />
                      <span>
                        {!item.allDay && item.start
                          ? `${instantTime(item.start, p.timezone)} `
                          : ''}
                        {item.title}
                      </span>
                    </button>
                  );
                })}

                {items.length > 3 && (
                  <button
                    type="button"
                    className="calendar-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onSelect(date);
                    }}
                  >
                    +{items.length - 3} more
                  </button>
                )}

                <div className="calendar-mobile-dots" aria-hidden="true">
                  {items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={`calendar-mobile-dot dot-${item.kind}`}
                      style={item.color ? { backgroundColor: item.color } : undefined}
                    />
                  ))}
                  {items.length > 3 && <span className="calendar-mobile-dot dot-more" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
