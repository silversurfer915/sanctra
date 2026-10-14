import { useState } from 'react';
import { X, Calendar, GripVertical, AlertCircle, ArrowRight } from 'lucide-react';
import type { TaskItem } from '../../types/index.ts';

interface ArrangeTasksProps {
  tasks: TaskItem[];
  today: string;
  date: string;
  onMove: (id: string, date: string, time?: string) => void;
  onClose: () => void;
}

export function ArrangeTasks({
  tasks,
  today,
  date,
  onMove,
  onClose,
}: ArrangeTasksProps) {
  const [target, setTarget] = useState(date);
  const [time, setTime] = useState('');

  const candidates = tasks.filter(
    (t) => !t.completed && (!t.dueDate || t.dueDate < today)
  );

  const overdue = candidates.filter((t) => t.dueDate && t.dueDate < today);
  const unscheduled = candidates.filter((t) => !t.dueDate);

  return (
    <section className="calendar-arrange glass-card" aria-label="Arrange tasks drawer">
      <header className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <span className="workspace-eyebrow">ARRANGE TASKS</span>
          <h2 className="font-display text-xl text-white mt-1">Place into your days</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {candidates.length} task{candidates.length === 1 ? '' : 's'} waiting for schedule
          </p>
        </div>
        <button
          type="button"
          className="calendar-icon-button"
          onClick={onClose}
          aria-label="Close task arrangement"
        >
          <X size={16} />
        </button>
      </header>

      {/* Target Date / Time Configuration */}
      <div className="py-3 border-b border-white/10 space-y-2">
        <div className="calendar-editor-row">
          <label className="text-xs text-slate-300">
            <span>Target Date</span>
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-slate-300">
            <span>Time (Optional)</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            onClick={() => setTarget(today)}
          >
            Today
          </button>
          <button
            type="button"
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            onClick={() => setTarget(date)}
          >
            Selected Day
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 py-2">
        Drag tasks onto any calendar day or time slot, or click the arrow button to move to {target}.
      </p>

      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 px-1">
              <AlertCircle size={13} />
              <span>Overdue ({overdue.length})</span>
            </div>
            {overdue.map((t) => (
              <article
                key={t.id}
                className="calendar-arrange-candidate group"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/sanctra-task', t.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical size={14} className="text-slate-500 group-hover:text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <strong className="truncate text-slate-200">{t.text}</strong>
                    <span className="calendar-overdue-tag">Due {t.dueDate}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="calendar-icon-button hover:bg-emerald-500/20 hover:text-emerald-300"
                  aria-label={`Move ${t.text} to ${target}`}
                  title={`Move to ${target}`}
                  onClick={() => onMove(t.id, target, time || undefined)}
                >
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        )}

        {/* Unscheduled Section */}
        {unscheduled.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 px-1">
              <Calendar size={13} />
              <span>Unscheduled ({unscheduled.length})</span>
            </div>
            {unscheduled.map((t) => (
              <article
                key={t.id}
                className="calendar-arrange-candidate group"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/sanctra-task', t.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical size={14} className="text-slate-500 group-hover:text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <strong className="truncate text-slate-200">{t.text}</strong>
                    <span className="calendar-unscheduled-tag">No date set</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="calendar-icon-button hover:bg-emerald-500/20 hover:text-emerald-300"
                  aria-label={`Move ${t.text} to ${target}`}
                  title={`Move to ${target}`}
                  onClick={() => onMove(t.id, target, time || undefined)}
                >
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        )}

        {!candidates.length && (
          <div className="calendar-empty">
            <p>All clear! No overdue or unscheduled tasks.</p>
          </div>
        )}
      </div>
    </section>
  );
}
