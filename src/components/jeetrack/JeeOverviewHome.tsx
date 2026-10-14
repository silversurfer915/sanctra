import { Award, BookOpen, CheckCircle2, Flame, ListTodo, Plus, Target, Clock, ArrowRight } from 'lucide-react';
import type { JeeTrackState, JeeTrackSubTab } from '../../types/jeetrack.ts';
import { Panel, Empty, Trend, StatCard, subjects, subjectName, subjectColor, dateLabel, today } from './JeeUi.tsx';

type Props = {
  state: JeeTrackState;
  onNavigateTab: (t: JeeTrackSubTab) => void;
  onOpenLogTest: () => void;
  onOpenScheduleTest: () => void;
  onOpenLogPractice: () => void;
  onOpenAddBacklog: () => void;
  onToggleBacklog: (id: string) => void;
  onOpenSettings: () => void;
};

export function JeeOverviewHome(p: Props) {
  const s = p.state;

  // Tests data
  const mainsTests = s.tests.filter((t) => t.exam === 'mains').sort((a, b) => b.date.localeCompare(a.date));
  const advTests = s.tests.filter((t) => t.exam === 'advanced').sort((a, b) => b.date.localeCompare(a.date));
  const latestMains = mainsTests[0];
  const latestAdv = advTests[0];

  const scoreBadgeClass = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 60) return 'sbadge high';
    if (pct >= 40) return 'sbadge med';
    return 'sbadge low';
  };

  // Today's study hours
  const todayDate = today();
  const todayHoursList = s.hours.filter((h) => h.date === todayDate);
  const tLec = todayHoursList.reduce((sum, h) => sum + h.lecture, 0);
  const tPrac = todayHoursList.reduce((sum, h) => sum + h.practice, 0);
  const tRev = todayHoursList.reduce((sum, h) => sum + h.revision, 0);
  const tTotal = tLec + tPrac + tRev;
  const lPct = tTotal ? Math.round((tLec / tTotal) * 100) : 0;
  const pPct = tTotal ? Math.round((tPrac / tTotal) * 100) : 0;
  const rPct = tTotal ? Math.max(0, 100 - lPct - pPct) : 0;

  // Syllabus progress
  const allChapters = Object.values(s.syllabus).flat();
  const allComplete = allChapters.filter((c) => c.theory && c.practice).length;
  const overallSyllabusPct = allChapters.length ? Math.round((allComplete / allChapters.length) * 100) : 0;

  // Upcoming mock tests
  const upcoming = s.upcoming.filter((t) => t.date >= todayDate).sort((a, b) => a.date.localeCompare(b.date));
  const dayCount = (date: string) =>
    Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(`${todayDate}T00:00:00`).getTime()) / 86400000);

  // Urgent backlogs
  const urgentBacklogs = s.backlogs
    .filter((b) => !b.done && (b.priority === 'high' || (b.due && b.due <= todayDate)))
    .slice(0, 4);

  // Exam Targets
  const targetDates = Object.entries(s.examDates || {}).filter(([, date]) => !!date) as [string, string][];

  return (
    <>
      {/* Top Header */}
      <div className="jee-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Your comprehensive JEE preparation hub. Target year {s.targetYear}.
          </p>
        </div>
        <div className="jee-actions">
          <button className="jee-primary" onClick={p.onOpenLogTest}>
            <Plus size={16} /> Log mock
          </button>
          <button onClick={p.onOpenLogPractice}>
            <Target size={16} /> Log practice
          </button>
          <button onClick={p.onOpenAddBacklog}>
            <ListTodo size={16} /> Add backlog
          </button>
        </div>
      </div>

      {/* 4-Stat Metric Grid */}
      <div className="ov-stat-grid">
        {/* Latest Mains Mock */}
        <StatCard
          title="Latest Mains Mock"
          value={latestMains ? `${latestMains.total}/${latestMains.max}` : '—'}
          badge={
            latestMains && (
              <span className={scoreBadgeClass(latestMains.total, latestMains.max)}>
                {Math.round((latestMains.total / latestMains.max) * 100)}%
              </span>
            )
          }
          subtitle={latestMains ? dateLabel(latestMains.date) : 'No Mains mocks yet'}
          icon={<Award size={18} />}
          color="var(--jee-phy)"
        />

        {/* Latest Advanced Mock */}
        <StatCard
          title="Latest Advanced Mock"
          value={latestAdv ? `${latestAdv.total}/${latestAdv.max}` : '—'}
          badge={
            latestAdv && (
              <span className={scoreBadgeClass(latestAdv.total, latestAdv.max)}>
                {Math.round((latestAdv.total / latestAdv.max) * 100)}%
              </span>
            )
          }
          subtitle={latestAdv ? dateLabel(latestAdv.date) : 'No Advanced mocks yet'}
          icon={<Award size={18} />}
          color="var(--jee-mat)"
        />

        {/* Streak Flame Card */}
        <StatCard
          title="Backlog Streak"
          value={`${s.backlogStreak || 0}d`}
          badge={
            s.backlogBestStreak > 0 ? (
              <span className="sbadge high">Best: {s.backlogBestStreak}d</span>
            ) : undefined
          }
          subtitle={s.backlogStreak > 0 ? 'Consecutive clear days' : 'Clear a backlog today!'}
          icon={<Flame size={18} />}
          color="var(--jee-danger)"
        />

        {/* Pending Backlogs / Tasks */}
        <StatCard
          title="Active Backlogs"
          value={s.backlogs.filter((b) => !b.done).length}
          subtitle={urgentBacklogs.length > 0 ? `${urgentBacklogs.length} urgent topics` : 'All topics on schedule'}
          icon={<ListTodo size={18} />}
          color="var(--jee-accent-light)"
        />
      </div>

      {/* 2-Column Responsive Grid (iPad & Desktop optimized) */}
      <div className="jee-columns">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Today's Study Card */}
          <div className="today-study-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="jee-stat-card-title">Today’s Study Time</span>
              <button
                type="button"
                onClick={() => p.onNavigateTab('hours')}
                style={{
                  fontSize: '12px',
                  minHeight: '32px',
                  padding: '4px 10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--jee-accent-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Study history <ArrowRight size={13} />
              </button>
            </div>

            <div className="today-study-hours">
              {Number(tTotal.toFixed(1))}h <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--jee-tx-muted)' }}>today</span>
            </div>

            <div className="today-chips">
              <span className="today-chip lec">
                <Clock size={11} /> Lecture {lPct}%
              </span>
              <span className="today-chip prac">
                <Target size={11} /> Practice {pPct}%
              </span>
              <span className="today-chip rev">
                <BookOpen size={11} /> Revision {rPct}%
              </span>
            </div>

            {tTotal > 0 ? (
              <div className="today-seg-bar">
                <div style={{ width: `${lPct}%`, background: '#60a5fa' }} />
                <div style={{ width: `${pPct}%`, background: '#34d399' }} />
                <div style={{ width: `${rPct}%`, background: '#a695ff' }} />
              </div>
            ) : (
              <p className="jee-note" style={{ margin: 0 }}>
                No study time logged yet today.
              </p>
            )}
          </div>

          {/* Mock Score Progression */}
          <Panel
            title="Mock Performance"
            subtitle="Score progression across recent tests"
            action={
              <button onClick={() => p.onNavigateTab('tests')}>
                All tests <ArrowRight size={14} />
              </button>
            }
          >
            <Trend
              items={[...s.tests]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-8)
                .map((t) => ({
                  label: dateLabel(t.date),
                  value: (t.total / t.max) * 100,
                }))}
            />
          </Panel>

          {/* Upcoming Mocks */}
          <Panel
            title="Next Mock Tests"
            subtitle="Scheduled full & partial syllabus tests"
            action={
              <button onClick={p.onOpenScheduleTest}>
                <Plus size={14} /> Schedule
              </button>
            }
          >
            {upcoming.length > 0 ? (
              <ul className="jee-list">
                {upcoming.slice(0, 3).map((t) => {
                  const days = dayCount(t.date);
                  const isToday = days === 0;

                  return (
                    <li key={t.id}>
                      <div>
                        <strong>{t.session}</strong>
                        <small>
                          JEE {subjectName(t.exam)} · {dateLabel(t.date)} · {t.type} syllabus
                          {t.venue ? ` @ ${t.venue}` : ''}
                        </small>
                      </div>

                      {isToday ? (
                        <button
                          type="button"
                          className="jee-primary"
                          style={{
                            background: 'var(--jee-grad-fire)',
                            minHeight: 34,
                            padding: '6px 12px',
                            fontSize: 12,
                          }}
                          onClick={p.onOpenLogTest}
                        >
                          <Plus size={13} /> Add Score
                        </button>
                      ) : (
                        <span className="jee-tag low">
                          {days === 1 ? 'Tomorrow' : `${days} days away`}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty action={<button onClick={p.onOpenScheduleTest}>Schedule next mock</button>}>
                No upcoming mocks scheduled. Plan your next test to stay aligned.
              </Empty>
            )}
          </Panel>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Syllabus Progress Card */}
          <Panel
            title="Syllabus Progress"
            subtitle="Overall & subject-level completion"
            action={
              <button onClick={() => p.onNavigateTab('syllabus')}>
                Open syllabus <ArrowRight size={14} />
              </button>
            }
          >
            {/* Overall Syllabus Track */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Overall Completion</span>
                <span style={{ fontWeight: 700, color: 'var(--jee-accent-light)' }}>
                  {overallSyllabusPct}% · {allComplete}/{allChapters.length}
                </span>
              </div>
              <div className="syl-hero-bar" style={{ height: 8 }}>
                <div className="syl-hero-bar-fill" style={{ width: `${overallSyllabusPct}%` }} />
              </div>
            </div>

            {/* Subject Tracks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subjects.map((sub) => {
                const chs = s.syllabus[sub];
                const done = chs.filter((c) => c.theory && c.practice).length;
                const pct = chs.length ? Math.round((done / chs.length) * 100) : 0;
                const col = subjectColor(sub);

                return (
                  <div key={sub}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: col }}>{subjectName(sub)}</span>
                      <span style={{ color: 'var(--jee-tx-muted)', fontSize: 12 }}>
                        {done}/{chs.length} chapters · {pct}%
                      </span>
                    </div>
                    <div className="syl-hero-bar" style={{ height: 6 }}>
                      <div
                        className="syl-hero-bar-fill"
                        style={{ width: `${pct}%`, background: col }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Needs Attention / Urgent Backlogs */}
          <Panel
            title="Needs Attention"
            subtitle="Overdue or high priority backlog topics"
            action={
              <button onClick={() => p.onNavigateTab('backlog')}>
                View all <ArrowRight size={14} />
              </button>
            }
          >
            {urgentBacklogs.length > 0 ? (
              <ul className="jee-list">
                {urgentBacklogs.map((b) => (
                  <li key={b.id}>
                    <div>
                      <strong>{b.title}</strong>
                      <small>
                        <span style={{ color: subjectColor(b.subject), fontWeight: 600 }}>
                          {subjectName(b.subject)}
                        </span>
                        {b.due ? ` · Due ${dateLabel(b.due)}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      style={{ minHeight: 34, padding: '6px 12px', fontSize: 12 }}
                      onClick={() => p.onToggleBacklog(b.id)}
                    >
                      <CheckCircle2 size={13} /> Mark cleared
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty action={<button onClick={p.onOpenAddBacklog}>Add backlog</button>}>
                No high-priority or overdue backlogs! You are on track.
              </Empty>
            )}
          </Panel>

          {/* Exam Targets Countdown */}
          <Panel
            title="Exam Planning Targets"
            subtitle="Countdown to your target exams"
            action={<button onClick={p.onOpenSettings}>Edit targets</button>}
          >
            {targetDates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {targetDates.map(([key, date]) => {
                  const days = dayCount(date);
                  const title =
                    key === 'mainsJan'
                      ? 'JEE Mains (Jan Session)'
                      : key === 'mainsApr'
                      ? 'JEE Mains (Apr Session)'
                      : 'JEE Advanced';

                  return (
                    <div key={key} className="jee-target-card">
                      <div>
                        <strong style={{ fontSize: 14 }}>{title}</strong>
                        <div style={{ fontSize: 12, color: 'var(--jee-tx-muted)', marginTop: 2 }}>
                          {dateLabel(date)}
                        </div>
                      </div>
                      <div className="jee-target-days">
                        {days <= 0 ? 'Today or past' : `${days} days left`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="jee-note">
                Set your target entrance-exam dates in Profile & goals above. These countdowns are separate from your scheduled mocks.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
