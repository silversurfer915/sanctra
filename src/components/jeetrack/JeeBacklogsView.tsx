import { useState } from 'react';
import { CheckCircle2, Flame, Plus, RotateCcw } from 'lucide-react';
import type { JeeBacklog } from '../../types/jeetrack.ts';
import { Panel, Empty, SubjectSelect, subjectName, subjectColor, dateLabel, confirmDelete, today } from './JeeUi.tsx';

type Props = {
  backlogs: JeeBacklog[];
  streak: number;
  bestStreak: number;
  onOpenAddBacklog: () => void;
  onToggleBacklog: (id: string) => void;
  onDeleteBacklog: (id: string) => void;
  onEditBacklog: (b: JeeBacklog) => void;
};

export function JeeBacklogsView(p: Props) {
  const [completed, setCompleted] = useState(false);
  const [subject, setSubject] = useState('all');
  const [priority, setPriority] = useState('all');

  const order = { high: 0, med: 1, low: 2 };
  const rows = p.backlogs
    .filter(
      (b) =>
        b.done === completed &&
        (subject === 'all' || b.subject === subject) &&
        (priority === 'all' || b.priority === priority)
    )
    .sort(
      (a, b) =>
        order[a.priority] - order[b.priority] ||
        (a.due || '9999').localeCompare(b.due || '9999')
    );

  const activeCount = p.backlogs.filter((b) => !b.done).length;

  return (
    <>
      {/* Heading */}
      <div className="jee-heading">
        <div>
          <h1>Backlog Manager</h1>
          <p>Convert weak areas and missed chapters into structured, high-yield catch-up tasks.</p>
        </div>
        <button className="jee-primary" onClick={p.onOpenAddBacklog}>
          <Plus size={16} /> Add backlog
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="jee-summary">
        <div>
          <strong>{activeCount}</strong>
          <span>Active backlog topics</span>
        </div>
        <div>
          <strong style={{ color: p.streak > 0 ? 'var(--jee-danger)' : undefined }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {p.streak > 0 && <Flame size={20} />} {p.streak} days
            </span>
          </strong>
          <span>Current completion streak</span>
        </div>
        <div>
          <strong>{p.bestStreak} days</strong>
          <span>Personal best streak</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="jee-filters">
        <div className="jee-segments" aria-label="Backlog status">
          <button aria-pressed={!completed} onClick={() => setCompleted(false)}>
            Active ({activeCount})
          </button>
          <button aria-pressed={completed} onClick={() => setCompleted(true)}>
            Cleared ({p.backlogs.filter((b) => b.done).length})
          </button>
        </div>

        <SubjectSelect value={subject} onChange={setSubject} />

        <label className="jee-filter">
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="med">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </label>
      </div>

      {/* List Panel */}
      <Panel
        title={completed ? 'Cleared Backlogs' : 'Active Backlogs'}
        subtitle={
          completed
            ? 'Topics and chapters you have completed'
            : 'Target these systematically during your revision slots'
        }
      >
        {rows.length > 0 ? (
          <ul className="jee-list">
            {rows.map((b) => {
              const isOverdue = !b.done && b.due && b.due < today();

              return (
                <li key={b.id}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{b.title}</strong>
                      <span className={`jee-tag ${b.priority}`}>
                        {b.priority === 'med' ? 'Medium' : subjectName(b.priority)}
                      </span>
                    </div>

                    <small>
                      <span style={{ color: subjectColor(b.subject), fontWeight: 600 }}>
                        {subjectName(b.subject)}
                      </span>
                      {b.due ? ` · Due ${dateLabel(b.due)}` : ''}
                      {isOverdue && (
                        <span style={{ color: 'var(--jee-danger)', fontWeight: 700, marginLeft: 6 }}>
                          (Overdue)
                        </span>
                      )}
                      {b.doneDate ? ` · Cleared ${dateLabel(b.doneDate)}` : ''}
                    </small>

                    {b.details && <p className="jee-note">{b.details}</p>}
                  </div>

                  <div className="jee-actions">
                    <button
                      type="button"
                      className={b.done ? undefined : 'jee-primary'}
                      style={!b.done ? { minHeight: 36, padding: '6px 12px', fontSize: 12.5 } : undefined}
                      onClick={() => p.onToggleBacklog(b.id)}
                    >
                      {b.done ? (
                        <>
                          <RotateCcw size={13} /> Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} /> Mark cleared
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      style={{ minHeight: 36, padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => p.onEditBacklog(b)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="jee-danger"
                      style={{ minHeight: 36, padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => {
                        if (confirmDelete(b.title)) p.onDeleteBacklog(b.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty action={!completed ? <button onClick={p.onOpenAddBacklog}>Add backlog</button> : undefined}>
            {completed
              ? 'No cleared backlogs in this selection.'
              : 'No active backlogs in this selection! You are fully caught up.'}
          </Empty>
        )}
      </Panel>
    </>
  );
}
