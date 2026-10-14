import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { JeeStudyHour } from '../../types/jeetrack.ts';
import { Panel, Empty, DateFilters, useDateRange, SubjectSelect, Bars, subjectName, subjectColor, dateLabel, hoursLabel, today, todayFor, confirmDelete } from './JeeUi.tsx';

type Props = {
  hours: JeeStudyHour[];
  onLogHours: () => void;
  onEditHours: (h: JeeStudyHour) => void;
  onDeleteHours: (id: string) => void;
};

export function JeeHoursView(p: Props) {
  const range = useDateRange('all');
  const [subject, setSubject] = useState('all');

  const hours = p.hours.filter(
    (h) => range.contains(h.date) && (subject === 'all' || h.subject === subject)
  );
  const total = hours.reduce((sum, h) => sum + h.total, 0);
  const active = new Set(hours.filter((h) => h.total > 0).map((h) => h.date)).size;

  // 12-week (84 days) consistency heatmap
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - 83 + i);
    const date = todayFor(d);
    return {
      date,
      total: hours.filter((h) => h.date === date).reduce((sum, h) => sum + h.total, 0),
    };
  });

  const maxDaily = Math.max(1, ...days.map((d) => d.total));
  const bestDay = [...days].sort((a, b) => b.total - a.total)[0];

  // Helper for heatmap colors
  const getCellBg = (val: number) => {
    if (!val) return 'rgba(255, 255, 255, 0.04)';
    const intensity = Math.min(1, val / Math.max(4, maxDaily));
    return `rgba(96, 165, 250, ${0.2 + intensity * 0.75})`;
  };

  return (
    <>
      {/* Heading */}
      <div className="jee-heading">
        <div>
          <h1>Study Hours & Heatmap</h1>
          <p>Your saved Sanctra sessions and JEE manual entries together. Unlinked sessions keep their original time without guessed chapters or activities.</p>
        </div>
        <button className="jee-primary" onClick={p.onLogHours}>
          <Plus size={16} /> Log manual hours
        </button>
      </div>

      {/* Date Range & Subject Filters */}
      <DateFilters filter={range} />
      <div className="jee-filters">
        <SubjectSelect value={subject} onChange={setSubject} />
      </div>

      {/* Summary Metrics */}
      <div className="jee-summary">
        <div>
          <strong>{hoursLabel(total)}</strong>
          <span>Time in selected period</span>
        </div>
        <div>
          <strong>{active}</strong>
          <span>Active study days</span>
        </div>
        <div>
          <strong>{active ? hoursLabel(total / active) : '—'}</strong>
          <span>Average per active day</span>
        </div>
        <div>
          <strong>{bestDay?.total ? hoursLabel(bestDay.total) : '—'}</strong>
          <span>{bestDay?.total ? `Best day (${dateLabel(bestDay.date)})` : 'Best day'}</span>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="jee-columns">
        {/* Heatmap & Recent Daily Bars */}
        <Panel
          title="Consistency Heatmap (12 Weeks)"
          subtitle="Daily intensity from Sanctra timers & manual logs"
        >
          <div
            className="jee-heatmap"
            role="img"
            aria-label={`Study activity: ${
              days
                .filter((d) => d.total)
                .map((d) => `${d.date}: ${hoursLabel(d.total)}`)
                .join('; ') || 'No hours logged'
            }`}
          >
            {days.map((d) => (
              <span
                key={d.date}
                title={`${dateLabel(d.date)}: ${hoursLabel(d.total)}`}
                style={{ background: getCellBg(d.total) }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--jee-tx-muted)', marginBottom: 14 }}>
            <span>84 days ago</span>
            <span>Today</span>
          </div>

          <h3 style={{ margin: '18px 0 10px' }}>Daily Hours (Last 7 Days)</h3>
          <Bars
            items={days.slice(-7).map((d) => ({
              label: dateLabel(d.date),
              value: d.total,
              color: 'var(--jee-blue)',
            }))}
            unit="h"
          />
        </Panel>

        {/* Breakdown by Type & Subject */}
        <Panel title="Study Breakdown" subtitle="Distribution across modalities and subjects">
          <h3 style={{ marginBottom: 12 }}>Time by Activity Type</h3>
          <Bars
            items={(
              [
                ['lecture', 'Lecture', '#60a5fa'],
                ['practice', 'Practice', '#34d399'],
                ['revision', 'Revision', '#a695ff'],
                ['mockAnalysis', 'Mock analysis', '#fb923c'],
                ['unclassified', 'Unlinked study', '#cbd5e1'],
              ] as const
            ).map(([k, label, color]) => ({
              label,
              value: hours.reduce((sum,h)=>sum+(k==='unclassified'?Math.max(0,h.total-h.lecture-h.practice-h.revision-h.mockAnalysis):h[k]),0),
              color,
            }))}
            unit="h"
          />

          <h3 style={{ margin: '24px 0 12px' }}>Time by Subject</h3>
          <Bars
            items={(
              [
                ['physics', 'Physics', subjectColor('physics')],
                ['chemistry', 'Chemistry', subjectColor('chemistry')],
                ['maths', 'Mathematics', subjectColor('maths')],
                ['all', 'General / Other', '#94a3b8'],
              ] as const
            ).map(([s, label, color]) => ({
              label,
              value: hours.filter((h) => h.subject === s).reduce((sum, h) => sum + h.total, 0),
              color,
            }))}
            unit="h"
          />
        </Panel>
      </div>

      {/* History Table / List */}
      <Panel title="Study Log History" subtitle="Individual focus and study entries">
        {hours.length > 0 ? (
          <ul className="jee-list">
            {[...hours]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((h) => (
                <li key={h.id}>
                  <div>
                    <strong>
                      {hoursLabel(h.total)} ·{' '}
                      <span style={{ color: h.subject !== 'all' ? subjectColor(h.subject) : undefined }}>
                        {h.subject === 'all' ? 'General / unlinked study' : subjectName(h.subject)}
                      </span>
                    </strong>
                    <small>
                      {dateLabel(h.date)} ·{' '}
                      {h.source === 'timer' ? '⚡ Synced from Sanctra timer' : 'Manual study entry'}
                    </small>
                    <small>
                      {[
                        ['Lecture', h.lecture],
                        ['Practice', h.practice],
                        ['Revision', h.revision],
                        ['Mock analysis', h.mockAnalysis],
                      ]
                        .filter(([, n]) => Number(n) > 0)
                        .map(([label, n]) => `${label}: ${hoursLabel(Number(n))}`)
                        .join(' · ')}
                    </small>
                    {h.notes && <small style={{ color: 'var(--jee-tx-primary)' }}>{h.notes}</small>}
                  </div>

                  {h.source !== 'timer' ? (
                    <div className="jee-actions">
                      <button
                        type="button"
                        style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                        onClick={() => p.onEditHours(h)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="jee-danger"
                        style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                        onClick={() => {
                          if (confirmDelete('manual study entry')) p.onDeleteHours(h.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="jee-tag low">Timer auto-sync</span>
                  )}
                </li>
              ))}
          </ul>
        ) : (
          <Empty action={<button onClick={p.onLogHours}>Log study time</button>}>
            No hours recorded in this period. Start focus on a JEE chapter to tag timer sessions automatically.
          </Empty>
        )}
      </Panel>
    </>
  );
}
