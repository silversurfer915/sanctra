import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TaskItem, Subject } from '../types/index.ts';
import { scheduledTasksForDay } from '../utils/taskSchedule.ts';

export interface CurrentTaskBarProps {
  tasks: TaskItem[];
  subjects: Subject[];
  focusedTask?: TaskItem | null;
  onFocus: (task: TaskItem) => void;
  onStopFocus?: () => void;
  onComplete: (id: string) => void;
  hideFinished?: boolean;
}

export function CurrentTaskBar({
  tasks,
  subjects,
  focusedTask,
  onFocus,
  onStopFocus,
  onComplete,
  hideFinished = false,
}: CurrentTaskBarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(tick);
  }, []);

  const { list, current, next } = scheduledTasksForDay(tasks, now);
  const scheduledTask = current || next;

  // Is the scheduled task currently the one in focus?
  const isSameFocused = Boolean(
    focusedTask && scheduledTask && focusedTask.id === scheduledTask.id
  );

  // Is there a focused task that is different from the scheduled task?
  const isDifferentFocusedTask = Boolean(
    focusedTask && (!scheduledTask || focusedTask.id !== scheduledTask.id)
  );

  if (hideFinished && !scheduledTask && !focusedTask) return null;

  const getSubjectName = (subjectId?: string) =>
    subjects.find((s) => s.id === subjectId)?.name;

  const renderTaskCard = (
    item: TaskItem,
    statusKind: 'scheduled' | 'focusing-same' | 'focusing-separate',
    isCurrentSlot: boolean
  ) => {
    const isFocusing = statusKind === 'focusing-same' || statusKind === 'focusing-separate';
    const isDone = Boolean(item.completed);
    const subjectName = getSubjectName(item.subjectId);

    return (
      <section
        key={item.id}
        className={`current-task-bar glass-card w-full rounded-2xl border border-white/15 ${
          isFocusing ? 'is-focusing' : ''
        }`}
        aria-label={isFocusing ? 'Active focus task' : "Today's scheduled task"}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {isDone ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[var(--sanctra-sage)] shrink-0" />
                <span className="text-[10px] uppercase tracking-[.18em] font-semibold text-[var(--sanctra-sage)]">
                  Completed
                </span>
              </>
            ) : isFocusing ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sanctra-sage)] animate-pulse shrink-0" />
                <span className="text-[10px] uppercase tracking-[.18em] font-semibold text-[var(--sanctra-sage)]">
                  Focusing now
                </span>
                {statusKind === 'focusing-same' && (
                  <>
                    <span className="text-[10px] text-white/30 font-normal">·</span>
                    <span className="text-[10px] uppercase tracking-[.14em] font-medium text-white/60">
                      {isCurrentSlot ? 'Scheduled' : 'Up next'}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span
                className="text-[10px] uppercase tracking-[.18em] font-semibold"
                style={{ color: 'var(--sanctra-sage, #b2cbb1)' }}
              >
                {isCurrentSlot
                  ? 'Scheduled now'
                  : next?.id === item.id
                  ? 'Up next'
                  : 'Scheduled task'}
              </span>
            )}
          </div>

          <h2
            className={`text-sm font-semibold break-words text-white ${
              isDone ? 'line-through text-white/50' : ''
            }`}
          >
            {item.text}
          </h2>

          <p className="text-xs text-[var(--sanctra-muted)] mt-1">
            {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime} · ` : ''}
            {subjectName || 'No subject'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDone ? (
            <button
              type="button"
              className="analytics-button text-[var(--sanctra-muted)]"
              onClick={() => onComplete(item.id)}
            >
              Undo
            </button>
          ) : isFocusing ? (
            <>
              {onStopFocus && (
                <button
                  type="button"
                  className="analytics-button text-[var(--sanctra-paper)]"
                  onClick={onStopFocus}
                >
                  Stop focus
                </button>
              )}
              <button
                type="button"
                className="analytics-button font-medium text-[var(--sanctra-sage)]"
                onClick={() => onComplete(item.id)}
              >
                Mark done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="analytics-button"
                onClick={() => onFocus(item)}
              >
                Focus on task
              </button>
              <button
                type="button"
                className="analytics-button"
                onClick={() => onComplete(item.id)}
              >
                Mark done
              </button>
            </>
          )}
        </div>
      </section>
    );
  };

  // If there is no scheduled task and no focused task
  if (!scheduledTask && !focusedTask) {
    return (
      <section
        className="current-task-bar glass-card w-full rounded-2xl border border-white/15"
        aria-label="Today's schedule"
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-[.18em] mb-1 font-semibold"
            style={{ color: 'var(--sanctra-sage, #b2cbb1)' }}
          >
            {list.length ? 'Today’s schedule finished' : 'No task scheduled'}
          </p>
          <p className="text-xs text-[var(--sanctra-muted)]">
            {list.length
              ? 'No more timed tasks today.'
              : 'No timed tasks scheduled today.'}
          </p>
        </div>
      </section>
    );
  }

  // If the scheduled task is the same as the focused task: render ONE merged card!
  if (isSameFocused && scheduledTask) {
    return renderTaskCard(scheduledTask, 'focusing-same', Boolean(current));
  }

  // If there's a scheduled task AND a separate focused task: render both!
  if (scheduledTask && isDifferentFocusedTask && focusedTask) {
    return (
      <div className="focus-task-stack flex flex-col gap-2.5 w-full">
        {renderTaskCard(scheduledTask, 'scheduled', Boolean(current))}
        {renderTaskCard(focusedTask, 'focusing-separate', false)}
      </div>
    );
  }

  // If there is only a scheduled task:
  if (scheduledTask) {
    return renderTaskCard(scheduledTask, 'scheduled', Boolean(current));
  }

  // If there is only a focused task (no scheduled task):
  if (focusedTask) {
    return renderTaskCard(focusedTask, 'focusing-separate', false);
  }

  return null;
}
