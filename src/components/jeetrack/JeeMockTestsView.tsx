import { useState } from 'react';
import { Calendar, FileText, Plus } from 'lucide-react';
import type { JeeTest, JeeUpcomingTest } from '../../types/jeetrack.ts';
import { Panel, Empty, Trend, Bars, subjects, subjectName, subjectColor, dateLabel, confirmDelete, today } from './JeeUi.tsx';

type Props = {
  tests: JeeTest[];
  upcoming: JeeUpcomingTest[];
  onOpenLogTest: () => void;
  onOpenScheduleTest: () => void;
  onDeleteTest: (id: string) => void;
  onDeleteUpcoming: (id: string) => void;
  onEditTest: (t: JeeTest) => void;
  onEditUpcoming: (t: JeeUpcomingTest) => void;
  onReviewMistakes?:(test:JeeTest)=>void;
  onPrint: () => void;
};

export function JeeMockTestsView(p: Props) {
  const [tab, setTab] = useState<'mains' | 'advanced' | 'compare' | 'upcoming'>('mains');
  const [scope, setScope] = useState<'all' | 'full' | 'partial'>('all');
  const [paper, setPaper] = useState<'all' | 'p1' | 'p2' | 'combined'>('all');
  const [percent, setPercent] = useState(true);

  const tests = p.tests
    .filter(
      (t) =>
        (tab === 'compare' || t.exam === tab) &&
        (scope === 'all' || t.type === scope) &&
        (tab !== 'advanced' || paper === 'all' || t.paper === paper)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const avg = (rows: JeeTest[]) =>
    rows.length ? rows.reduce((sum, t) => sum + (t.total / t.max) * 100, 0) / rows.length : 0;

  const scoreBadgeClass = (pct: number) => {
    if (pct >= 60) return 'sbadge high';
    if (pct >= 40) return 'sbadge med';
    return 'sbadge low';
  };

  // Radar points
  const radar = subjects
    .map((s, i) => {
      const v = tests.length
        ? tests.reduce((sum, t) => sum + (Math.max(0, t[s]) / (t.max / 3)) * 100, 0) / tests.length
        : 0;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return `${150 + Math.cos(a) * Math.min(100, v) * 0.85},${115 + Math.sin(a) * Math.min(100, v) * 0.85}`;
    })
    .join(' ');

  return (
    <>
      {/* Heading */}
      <div className="jee-heading">
        <div>
          <h1>Mock Tests</h1>
          <p>Analyze performance, subject strengths, and score trajectories across Mains and Advanced.</p>
        </div>
        <div className="jee-actions">
          <button onClick={p.onPrint}>
            <FileText size={16} /> Print report / Save PDF
          </button>
          <button className="jee-primary" onClick={p.onOpenLogTest}>
            <Plus size={16} /> Log mock test
          </button>
          <button onClick={p.onOpenScheduleTest}>
            <Calendar size={16} /> Schedule test
          </button>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="jee-segments" aria-label="Mock test view">
        {(
          [
            ['mains', 'JEE Mains'],
            ['advanced', 'JEE Advanced'],
            ['compare', 'Compare'],
            ['upcoming', 'Scheduled tests'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'upcoming' ? (
        <Panel title="Scheduled Mock Tests" subtitle="Keep your test-taking rhythm structured">
          {p.upcoming.length > 0 ? (
            <ul className="jee-list">
              {[...p.upcoming]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>{t.session}</strong>
                      <small>
                        {subjectName(t.exam)} · {dateLabel(t.date)} · {t.type} syllabus
                        {t.date < today() ? ' · Past date' : ''}
                      </small>
                      {t.venue && <small>Venue / platform: {t.venue}</small>}
                      {t.notes && <small>{t.notes}</small>}
                    </div>
                    <div className="jee-actions">
                      <button onClick={() => p.onEditUpcoming(t)}>Edit</button>
                      <button
                        className="jee-danger"
                        onClick={() => {
                          if (confirmDelete(t.session)) p.onDeleteUpcoming(t.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <Empty action={<button onClick={p.onOpenScheduleTest}>Schedule your next mock</button>}>
              No mocks scheduled. Add your next test date and syllabus scope to plan ahead.
            </Empty>
          )}
        </Panel>
      ) : (
        <>
          {/* Filters & View Toggles */}
          <div className="jee-filters">
            <label className="jee-filter">
              Syllabus scope
              <select value={scope} onChange={(e) => setScope(e.target.value as any)}>
                <option value="all">Full & partial</option>
                <option value="full">Full syllabus</option>
                <option value="partial">Partial syllabus</option>
              </select>
            </label>

            {tab === 'advanced' && (
              <label className="jee-filter">
                Paper
                <select value={paper} onChange={(e) => setPaper(e.target.value as any)}>
                  <option value="all">All papers</option>
                  <option value="p1">Paper 1</option>
                  <option value="p2">Paper 2</option>
                  <option value="combined">Combined papers</option>
                </select>
              </label>
            )}

            <div className="jee-segments" aria-label="Units format">
              <button aria-pressed={percent} onClick={() => setPercent(true)}>
                Percentage (%)
              </button>
              <button aria-pressed={!percent} onClick={() => setPercent(false)}>
                Raw Marks
              </button>
            </div>
          </div>

          {/* Metric Summary */}
          <div className="jee-summary">
            <div>
              <strong>{tests.length}</strong>
              <span>Recorded mocks</span>
            </div>
            <div>
              <strong>{tests.length ? `${avg(tests).toFixed(1)}%` : '—'}</strong>
              <span>Average score</span>
            </div>
            <div>
              <strong>
                {tests.length ? `${Math.max(...tests.map((t) => (t.total / t.max) * 100)).toFixed(1)}%` : '—'}
              </strong>
              <span>Personal best</span>
            </div>
            <div>
              <strong>
                {tests.length
                  ? `${((tests.at(-1)!.total / tests.at(-1)!.max) * 100).toFixed(1)}%`
                  : '—'}
              </strong>
              <span>Latest test</span>
            </div>
          </div>

          {/* Score Progression Trend Chart */}
          <Panel
            title={tab === 'compare' ? 'Mains vs Advanced · Score Progression' : 'Score Progression'}
            subtitle="Normalized marks timeline across tests"
          >
            {tab === 'compare' ? (
              <div className="jee-columns">
                {(['mains', 'advanced'] as const).map((exam) => (
                  <section key={exam}>
                    <h3 style={{ marginBottom: 12 }}>JEE {subjectName(exam)}</h3>
                    <Trend
                      percent={percent}
                      items={tests
                        .filter((t) => t.exam === exam)
                        .map((t) => ({
                          label: dateLabel(t.date),
                          value: percent ? (t.total / t.max) * 100 : t.total,
                        }))}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <Trend
                percent={percent}
                items={tests.map((t) => ({
                  label: dateLabel(t.date),
                  value: percent ? (t.total / t.max) * 100 : t.total,
                }))}
              />
            )}
            <p className="jee-note">
              Percentages normalize across tests with varying maximum marks.
            </p>
          </Panel>

          {/* Subject Radar and Breakdown */}
          {tests.length > 0 && (
            <div className="jee-columns">
              <Panel
                title="Subject Balance Radar"
                subtitle="Average marks relative to 1/3 of maximum test marks"
              >
                <div className="jee-radar">
                  <svg viewBox="0 0 300 240" role="img" aria-label="Subject balance radar chart">
                    <polygon points="150,30 223.6,157.5 76.4,157.5" fill="none" />
                    <line x1="150" y1="115" x2="150" y2="30" />
                    <line x1="150" y1="115" x2="223.6" y2="157.5" />
                    <line x1="150" y1="115" x2="76.4" y2="157.5" />
                    <polygon points={radar} />
                    <text x="125" y="17" style={{ fill: subjectColor('physics') }}>
                      Physics
                    </text>
                    <text x="210" y="182" style={{ fill: subjectColor('chemistry') }}>
                      Chemistry
                    </text>
                    <text x="38" y="182" style={{ fill: subjectColor('maths') }}>
                      Maths
                    </text>
                  </svg>
                </div>
                <Bars
                  items={subjects.map((s) => ({
                    label: subjectName(s),
                    value: tests.reduce((sum, t) => sum + t[s], 0) / tests.length,
                    color: subjectColor(s),
                  }))}
                  unit=" marks"
                />
              </Panel>

              <Panel title="Score Distribution & Scope" subtitle="Performance across syllabus scopes">
                <Bars
                  items={(['full', 'partial'] as const)
                    .filter((type) => tests.some((t) => t.type === type))
                    .map((type) => ({
                      label: `${subjectName(type)} syllabus average`,
                      value: avg(tests.filter((t) => t.type === type)),
                    }))}
                  unit="%"
                />

                <h3 style={{ margin: '24px 0 12px' }}>Mocks by Percentage Band</h3>
                <Bars
                  items={Array.from({ length: 5 }, (_, i) => ({
                    label: `${i * 20}–${(i + 1) * 20}%`,
                    value: tests.filter((t) => {
                      const p = (t.total / t.max) * 100;
                      return p >= i * 20 && (i === 4 ? p <= 100 : p < (i + 1) * 20);
                    }).length,
                  }))}
                />
              </Panel>
            </div>
          )}

          {/* Test History Table */}
          <Panel title="Test History" subtitle="Complete record of all saved mocks">
            {tests.length > 0 ? (
              <div className="jee-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Date</th>
                      <th>Paper / Scope</th>
                      <th>Physics</th>
                      <th>Chemistry</th>
                      <th>Maths</th>
                      <th>Total Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tests].reverse().map((t) => {
                      const pct = (t.total / t.max) * 100;
                      return (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.session || 'Mock test'}</strong>
                            {t.notes && <p className="jee-note" style={{ margin: '2px 0 0' }}>{t.notes}</p>}
                          </td>
                          <td>{dateLabel(t.date)}</td>
                          <td>
                            {t.paper || 'Mains'} · {t.type}
                          </td>
                          <td style={{ color: subjectColor('physics'), fontWeight: 600 }}>{t.physics}</td>
                          <td style={{ color: subjectColor('chemistry'), fontWeight: 600 }}>{t.chemistry}</td>
                          <td style={{ color: subjectColor('maths'), fontWeight: 600 }}>{t.maths}</td>
                          <td>
                            <strong>{t.total}</strong>/{t.max}{' '}
                            <span className={scoreBadgeClass(pct)} style={{ marginLeft: 6 }}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            <div className="jee-actions">
                              <button
                                type="button"
                                style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                                onClick={() => p.onEditTest(t)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="jee-danger"
                                style={{ minHeight: 34, padding: '5px 10px', fontSize: 12 }}
                                onClick={() => {
                                  if (confirmDelete(t.session || 'mock test')) p.onDeleteTest(t.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty action={<button onClick={p.onOpenLogTest}>Log your first mock</button>}>
                No test records match this selection.
              </Empty>
            )}
          </Panel>
        </>
      )}
      {p.tests.some(t=>t.chapterMistakes?.length)&&<Panel title="Chapter mistake reviews" subtitle="Your recorded errors, connected to shared revision tasks">{p.tests.filter(t=>t.chapterMistakes?.length).map(t=><div className="jee-panel" key={t.id}><strong>{t.session||dateLabel(t.date)}</strong><p>{t.chapterMistakes!.reduce((sum,m)=>sum+m.mistakes,0)} missed questions · {t.chapterMistakes!.length} chapters{t.durationMinutes?` · ${t.durationMinutes} min`:''}{t.attempted!==undefined?` · ${t.attempted} attempted`:''}{t.unattempted!==undefined?` · ${t.unattempted} unattempted`:''}</p><button onClick={()=>p.onReviewMistakes?.(t)}>Review & create revision tasks</button></div>)}</Panel>}
    </>
  );
}
