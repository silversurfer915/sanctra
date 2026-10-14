import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { JeePracticeLog, JeeSyllabus } from '../../types/jeetrack.ts';
import { Panel, Empty, DateFilters, useDateRange, SubjectSelect, Bars, subjectName, subjectColor, dateLabel, today, confirmDelete, todayFor } from './JeeUi.tsx';

type Props = {
  logs: JeePracticeLog[];
  weeklyGoal: number;
  syllabus: JeeSyllabus;
  onOpenLogPractice: () => void;
  onDeleteLog: (id: string) => void;
  onEditLog: (log: JeePracticeLog) => void;
  onUpdateGoal: (goal: number) => void;
};

export function JeePracticeView(p: Props) {
  const range = useDateRange();
  const [subject, setSubject] = useState('all');
  const [chapter, setChapter] = useState('all');
  const [goal, setGoal] = useState(String(p.weeklyGoal));

  const logs = p.logs.filter(
    (l) =>
      range.contains(l.date) &&
      (subject === 'all' || l.subject === subject) &&
      (chapter === 'all' || String(l.chapterId) === chapter)
  );

  const counts = new Map<string, number>();
  logs.forEach((l) => counts.set(l.chapterName, (counts.get(l.chapterName) || 0) + l.questions));

  // Monday to Sunday week calculations
  const monday = new Date(`${today()}T12:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekStart = todayFor(monday);
  const weekQuestions = p.logs
    .filter((l) => l.date >= weekStart && l.date <= today())
    .reduce((sum, l) => sum + l.questions, 0);

  // Daily question bars (last 14 days)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - 13 + i);
    const date = todayFor(d);
    return {
      label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      value: logs.filter((l) => l.date === date).reduce((sum, l) => sum + l.questions, 0),
      color: 'var(--jee-green)',
    };
  });

  const weekProgressPct = p.weeklyGoal > 0 ? Math.min(100, Math.round((weekQuestions / p.weeklyGoal) * 100)) : 0;

  return (
    <>
      {/* Heading */}
      <div className="jee-heading">
        <div>
          <h1>Practice Question Log</h1>
          <p>Maintain precise accountability for problem-solving volume across syllabus chapters.</p>
        </div>
        <button className="jee-primary" onClick={p.onOpenLogPractice}>
          <Plus size={16} /> Log questions
        </button>
      </div>

      {/* Weekly Goal Progress Panel */}
      <Panel
        title="Weekly Problem Target"
        subtitle="Track Monday to Sunday question volume against your weekly goal"
      >
        <div className="jee-heading" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--jee-green)' }}>
              {weekQuestions}
            </span>
            <span style={{ color: 'var(--jee-tx-muted)', fontSize: 14 }}>
              {p.weeklyGoal > 0 ? `/ ${p.weeklyGoal} questions goal` : 'questions solved this week'}
            </span>
          </div>

          <form
            className="jee-actions"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(goal);
              if (Number.isInteger(n) && n > 0 && n <= 10000) p.onUpdateGoal(n);
            }}
          >
            <label className="jee-filter" style={{ minWidth: 140 }}>
              Set weekly goal
              <input
                aria-label="Weekly question goal"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
              />
            </label>
            <button type="submit" style={{ alignSelf: 'flex-end' }}>
              Save goal
            </button>
          </form>
        </div>

        {p.weeklyGoal > 0 && (
          <div className="syl-hero-bar" style={{ height: 8 }}>
            <div
              className="syl-hero-bar-fill"
              style={{
                width: `${weekProgressPct}%`,
                background: 'linear-gradient(90deg, #34d399, #10b981)',
              }}
            />
          </div>
        )}
      </Panel>

      {/* Date Range & Chapter Filters */}
      <DateFilters filter={range} />
      <div className="jee-filters">
        <SubjectSelect
          value={subject}
          onChange={(s) => {
            setSubject(s);
            setChapter('all');
          }}
        />

        <label className="jee-filter" style={{ minWidth: 200 }}>
          Chapter
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="all">All chapters</option>
            {(subject === 'all'
              ? Object.values(p.syllabus).flat()
              : p.syllabus[subject as keyof JeeSyllabus]
            ).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Metric Summary */}
      <div className="jee-summary">
        <div>
          <strong>{logs.reduce((sum, l) => sum + l.questions, 0)}</strong>
          <span>Questions in selected period</span>
        </div>
        <div>
          <strong>{new Set(logs.map((l) => l.date)).size}</strong>
          <span>Active practice days</span>
        </div>
        <div>
          <strong>{counts.size}</strong>
          <span>Distinct chapters practiced</span>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="jee-columns">
        <Panel title="Daily Question Volume (14 Days)" subtitle="Problems solved per day">
          <Bars items={days} />
        </Panel>

        <Panel title="Subject & Chapter Distribution" subtitle="Where your practice focus went">
          <h3 style={{ marginBottom: 12 }}>Questions by Subject</h3>
          <Bars
            items={(['physics', 'chemistry', 'maths'] as const).map((s) => ({
              label: subjectName(s),
              value: logs.filter((l) => l.subject === s).reduce((sum, l) => sum + l.questions, 0),
              color: subjectColor(s),
            }))}
          />

          <h3 style={{ margin: '24px 0 12px' }}>Most Practiced Chapters</h3>
          {counts.size > 0 ? (
            <Bars
              items={[...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, value]) => ({ label, value, color: 'var(--jee-accent-light)' }))}
            />
          ) : (
            <Empty>Log practice sessions to see top chapters.</Empty>
          )}
        </Panel>
      </div>

      {/* History List */}
      <Panel title="Practice Log History" subtitle="Individual chapter solving sessions">
        {logs.length > 0 ? (
          <ul className="jee-list">
            {[...logs]
              .sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt - a.loggedAt)
              .map((l) => (
                <li key={l.id}>
                  <div>
                    <strong>
                      {l.chapterName} ·{' '}
                      <span style={{ color: 'var(--jee-green)' }}>{l.questions} questions</span>
                    </strong>
                    <small>
                      <span style={{ color: subjectColor(l.subject), fontWeight: 600 }}>
                        {subjectName(l.subject)}
                      </span>{' '}
                      · {dateLabel(l.date)}
                    </small>
                    {l.notes && <small style={{ color: 'var(--jee-tx-primary)' }}>{l.notes}</small>}
                  </div>

                  <div className="jee-actions">
                    {l.id.startsWith('session.') ? <small>Linked focus session</small> : <>
                    <button
                      type="button"
                      style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                      onClick={() => p.onEditLog(l)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="jee-danger"
                      style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                      onClick={() => {
                        if (confirmDelete('practice entry')) p.onDeleteLog(l.id);
                      }}
                    >
                      Delete
                    </button>
                    </>}
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <Empty action={<button onClick={p.onOpenLogPractice}>Log a practice session</button>}>
            No practice entries recorded in this period.
          </Empty>
        )}
      </Panel>
    </>
  );
}
