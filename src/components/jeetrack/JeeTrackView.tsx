import {deriveUnlinkedSessionHours} from '../../utils/jeeTrackStore.ts';
import {sharedJeeBacklogs, deriveJeePractice} from '../../utils/jeeIntegration.ts';
import { useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Home, Award, BookOpen, Target, Clock, ListTodo, Sparkles, Settings, Download } from 'lucide-react';
import type { AuthUser, StudySession, Subject, TaskItem } from '../../types/index.ts';
import type {
  JeeTrackState,
  JeeTrackSubTab,
  JeeTest,
  JeeUpcomingTest,
  JeePracticeLog,
  JeeBacklog,
  JeeStudyHour,
  JeeSubject,
  JeeChapter,
} from '../../types/jeetrack.ts';
import type { JeeTrackStore } from './useJeeTrackStore.ts';
import { deriveJeeSessionHours, deriveJeeStreaks } from '../../utils/jeeTrackStore.ts';
import { JeeOverviewHome } from './JeeOverviewHome.tsx';
import { JeeMockTestsView } from './JeeMockTestsView.tsx';
import { JeeSyllabusView } from './JeeSyllabusView.tsx';
import { JeePracticeView } from './JeePracticeView.tsx';
import { JeeBacklogsView } from './JeeBacklogsView.tsx';
import { JeeHoursView } from './JeeHoursView.tsx';
import { JeeAiInsightsView } from './JeeAiInsightsView.tsx';
import { JeeTasksView } from './JeeTasksView.tsx';
import { JeeProfileModal } from './JeeProfileModal.tsx';
import {
  LogTestModal,
  ScheduleTestModal,
  LogPracticeModal,
  AddBacklogModal,
  AddCustomChapterModal,
  LogHoursModal,
  ExportImportModal,
} from './JeeModals.tsx';
import { Modal, dateLabel, subjectName, today, hoursLabel } from './JeeUi.tsx';
import './jee-track.css';

export interface JeeTrackViewProps {
  dailyGoalHours?:number;
  onOpenSharedGoals?:()=>void;
  onOpenAnalytics?:()=>void;
  store: JeeTrackStore;
  onFocusTask: (task: TaskItem) => void;
  user: AuthUser;
  sessions: StudySession[];
  subjects: Subject[];
  tasks: TaskItem[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onStartFocus: (
    subject: JeeSubject,
    chapterId: number,
    kind: 'lecture' | 'practice' | 'revision' | 'mockAnalysis'
  ) => void;
  onDisable: () => void;
  plus?: boolean;
  onReviewPlan?: (instructions: string) => void;
  initialTab?: JeeTrackSubTab;
}

type ModalState =
  | { kind: 'test'; initial?: JeeTest }
  | { kind: 'schedule'; initial?: JeeUpcomingTest }
  | { kind: 'practice'; initial?: JeePracticeLog; preset?: { subject: JeeSubject; chapterId: number } }
  | { kind: 'backlog'; initial?: JeeBacklog }
  | { kind: 'hours'; initial?: JeeStudyHour }
  | { kind: 'chapter' | 'backup' | 'settings' }
  | null;

const tabs: { id: JeeTrackSubTab; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={16} /> },
  { id: 'tests', label: 'Mock tests', icon: <Award size={16} /> },
  { id: 'syllabus', label: 'Syllabus', icon: <BookOpen size={16} /> },
  { id: 'practice', label: 'Practice', icon: <Target size={16} /> },
  { id: 'hours', label: 'Hours', icon: <Clock size={16} /> },
  { id: 'tasks', label: 'Tasks', icon: <ListTodo size={16} /> },
  { id: 'backlog', label: 'Backlog', icon: <ListTodo size={16} /> },
  { id: 'insights', label: 'Coach', icon: <Sparkles size={16} /> },
];

function upsert<T extends { id: string }>(rows: T[], item: T) {
  return rows.some((row) => row.id === item.id)
    ? rows.map((row) => (row.id === item.id ? item : row))
    : [...rows, item];
}

export function JeeTrackView(p: JeeTrackViewProps) {
  const store = p.store;
  const [tab, setTab] = useState<JeeTrackSubTab>(p.initialTab || 'overview');
  const [revision,setRevision]=useState<{subject:JeeSubject;chapterId:number}|null>(null);
  const [revisionDate,setRevisionDate]=useState(today());
  const [reviewTest,setReviewTest]=useState<JeeTest|null>(null);
  const [resetPractice,setResetPractice]=useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState('');
  useEffect(()=>{if(p.initialTab)setTab(p.initialTab);},[p.initialTab]);

  const data = store.state;
  const sourceHours = deriveJeeSessionHours(p.sessions);
  const state = deriveJeeStreaks({
    ...data,
    backlogs:sharedJeeBacklogs(data,p.tasks,p.subjects),
    practiceLogs:[...data.practiceLogs,...deriveJeePractice(p.sessions,data)],
    hours: [...data.hours.filter((h) => h.source !== 'timer'), ...sourceHours],
  });

  const change = (fn: (s: JeeTrackState) => JeeTrackState) => {
    try {
      const accepted = store.update((s) => ({ ...fn(s), insights: null }));
      if (!accepted)
        throw new Error('The change was not saved. Check the fields and the sync status, then retry.');
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your change could not be saved. Please retry.');
      return false;
    }
  };

  const close = () => setModal(null);

  const toggleBacklog = (id: string) => {
    if(id.startsWith('task.')){p.onUpdateTasks(p.tasks.map(t=>t.id===id.slice(5)?{...t,completed:!t.completed}:t));return;}
    return change((s) =>
      deriveJeeStreaks({
        ...s,
        backlogs: s.backlogs.map((b) =>
          b.id === id ? { ...b, done: !b.done, doneDate: b.done ? undefined : today() } : b
        ),
      })
    );
  };

  const acceptedSave = (fn: (s: JeeTrackState) => JeeTrackState) => {
    if (!change(fn))
      throw new Error('This record could not be saved. Correct the fields or retry syncing.');
  };

  const saveTest = (t: JeeTest) => acceptedSave((s) => ({ ...s, tests: upsert(s.tests, t) }));
  const saveSchedule = (t: JeeUpcomingTest) =>
    acceptedSave((s) => ({ ...s, upcoming: upsert(s.upcoming, t) }));
  const savePractice = (log: JeePracticeLog) =>
    acceptedSave((s) => ({ ...s, practiceLogs: upsert(s.practiceLogs, log) }));
  const saveBacklog = (b: JeeBacklog) =>
    acceptedSave((s) => deriveJeeStreaks({ ...s, backlogs: upsert(s.backlogs, b) }));
  const saveHours = (h: JeeStudyHour) => acceptedSave((s) => ({ ...s, hours: upsert(s.hours, h) }));

  return (
    <div className="jee-track">
      {/* Platform Header */}
      <div className="jee-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <strong className="jee-report-logo">JEE Track</strong>
          <span className="jee-status" role="status">
            {
              (
                {
                  loading: 'Loading your records…',
                  synced: 'Saved to your account',
                  saving: 'Saving…',
                  offline: 'Offline · changes are queued',
                  error: 'Changes need syncing',
                  'signed-out': 'Sign in to sync',
                } as Record<string, string>
              )[store.syncStatus]
            }
          </span>
        </div>
        <div className="jee-actions">
          <button onClick={() => setModal({ kind: 'backup' })}>
            <Download size={16} /> Backup
          </button>
          <button onClick={() => setModal({ kind: 'settings' })}>
            <Settings size={16} /> Profile & goals
          </button>
        </div>
      </div>

      {store.error && (
        <div className="jee-error" role="alert">
          {store.error}
          <button onClick={store.retry}>Retry sync</button>
        </div>
      )}

      {error && (
        <p className="jee-error" role="alert">
          {error}
        </p>
      )}

      {store.legacyAvailable && (
        <div className="jee-panel">
          <p>
            Older JEE data was found on this device. It may contain sample values from the unfinished
            preview. Chapter completion flags are retained because user edits cannot be distinguished
            from sample progress. Only import if these are your own records; otherwise keep this fresh
            account state.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Import the older device records into your account? Sample records from the unfinished preview will be removed. Download a backup first if you already have records.'
                )
              ) {
                store.importLegacy();
              }
            }}
          >
            Import older device records
          </button>
        </div>
      )}

      {/* Navigation Subtabs Strip */}
      <nav className="jee-tabs" aria-label="JEE Track sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab Content Panels */}
      {store.loading ? (
        <section className="jee-panel" aria-busy="true">
          <h1>Loading your preparation</h1>
          <p>Your account’s saved records are being loaded.</p>
        </section>
      ) : (
        <>
          {tab === 'overview' && (
            <JeeOverviewHome
              state={state}
              onNavigateTab={setTab}
              onOpenLogTest={() => setModal({ kind: 'test' })}
              onOpenScheduleTest={() => setModal({ kind: 'schedule' })}
              onOpenLogPractice={() => setModal({ kind: 'practice' })}
              onOpenAddBacklog={() => setModal({ kind: 'backlog' })}
              onToggleBacklog={toggleBacklog}
              onOpenSettings={() => setModal({ kind: 'settings' })}
            />
          )}

          {tab === 'tests' && (
            <JeeMockTestsView
              tests={state.tests}
              upcoming={state.upcoming}
              onOpenLogTest={() => setModal({ kind: 'test' })}
              onOpenScheduleTest={() => setModal({ kind: 'schedule' })}
              onDeleteTest={(id) => change((s) => ({ ...s, tests: s.tests.filter((t) => t.id !== id) }))}
              onDeleteUpcoming={(id) =>
                change((s) => ({ ...s, upcoming: s.upcoming.filter((t) => t.id !== id) }))
              }
              onEditTest={(initial) => setModal({ kind: 'test', initial })}
              onEditUpcoming={(initial) => setModal({ kind: 'schedule', initial })}
              onReviewMistakes={test=>{setResetPractice(false);setReviewTest(test);}}
              onPrint={() => window.print()}
            />
          )}

          {tab === 'syllabus' && (
            <JeeSyllabusView
              syllabus={state.syllabus}
              onToggleTheory={(subject, id) =>
                change((s) => ({
                  ...s,
                  syllabus: {
                    ...s.syllabus,
                    [subject]: s.syllabus[subject].map((c) =>
                      c.id === id ? { ...c, theory: !c.theory } : c
                    ),
                  },
                }))
              }
              onTogglePractice={(subject, id) =>
                change((s) => ({
                  ...s,
                  syllabus: {
                    ...s.syllabus,
                    [subject]: s.syllabus[subject].map((c) =>
                      c.id === id ? { ...c, practice: !c.practice } : c
                    ),
                  },
                }))
              }
              onIncrementRevision={(subject, id, delta = 1) =>
                change((s) => ({
                  ...s,
                  syllabus: {
                    ...s.syllabus,
                    [subject]: s.syllabus[subject].map((c) =>
                      c.id === id ? { ...c, revisions: Math.max(0, (c.revisions || 0) + delta) } : c
                    ),
                  },
                }))
              }
              onOpenAddChapter={() => setModal({ kind: 'chapter' })}
              onScheduleRevision={(subject,chapterId)=>{setRevisionDate(today());setRevision({subject,chapterId});}}
              onLogPractice={(subject, chapterId) =>
                setModal({ kind: 'practice', preset: { subject, chapterId } })
              }
              onStartFocus={p.onStartFocus}
              onDeleteChapter={(subject, id) =>
                change((s) => ({
                  ...s,
                  syllabus: {
                    ...s.syllabus,
                    [subject]: s.syllabus[subject].filter((c) => c.id !== id),
                  },
                }))
              }
            />
          )}

          {tab === 'practice' && (
            <JeePracticeView
              logs={state.practiceLogs}
              syllabus={state.syllabus}
              weeklyGoal={state.weeklyPracticeGoal}
              onOpenLogPractice={() => setModal({ kind: 'practice' })}
              onDeleteLog={(id) =>
                change((s) => ({
                  ...s,
                  practiceLogs: s.practiceLogs.filter((l) => l.id !== id),
                }))
              }
              onEditLog={(initial) => setModal({ kind: 'practice', initial })}
              onUpdateGoal={(weeklyPracticeGoal) => change((s) => ({ ...s, weeklyPracticeGoal }))}
            />
          )}

          {tab === 'backlog' && (
            <JeeBacklogsView
              backlogs={state.backlogs}
              streak={state.backlogStreak}
              bestStreak={state.backlogBestStreak}
              onOpenAddBacklog={() => setModal({ kind: 'backlog' })}
              onToggleBacklog={toggleBacklog}
              onDeleteBacklog={(id) =>
                id.startsWith('task.')?p.onUpdateTasks(p.tasks.filter(t=>t.id!==id.slice(5))):change((s) => deriveJeeStreaks({...s,backlogs:s.backlogs.filter(b=>b.id!==id)}))
              }
              onEditBacklog={(initial) => initial.id.startsWith('task.')?setTab('tasks'):setModal({ kind: 'backlog', initial })}
            />
          )}

          {tab === 'hours' && <div className="jee-panel"><p>Older Sanctra sessions are included below as unlinked study time. To add a JEE chapter and activity, open shared analytics and edit the session.</p><button onClick={p.onOpenAnalytics}>Open shared analytics</button></div>}
          {tab === 'hours' && (
            <JeeHoursView
              hours={[...state.hours,...deriveUnlinkedSessionHours(p.sessions)]}
              onLogHours={() => setModal({ kind: 'hours' })}
              onEditHours={(initial) => setModal({ kind: 'hours', initial })}
              onDeleteHours={(id) =>
                change((s) => ({ ...s, hours: s.hours.filter((h) => h.id !== id) }))
              }
            />
          )}

          {tab === 'tasks' && (
            <JeeTasksView
              syllabus={state.syllabus}
              tasks={p.tasks}
              subjects={p.subjects}
              onUpdateTasks={p.onUpdateTasks}
              onFocusTask={p.onFocusTask}
            />
          )}

          {tab === 'insights' && (
            <JeeAiInsightsView
              state={state}
              userId={p.user.uid}
              plus={p.plus}
              sessions={p.sessions}
              tasks={p.tasks}
              onReviewPlan={p.onReviewPlan}
            />
          )}
        </>
      )}

      {reviewTest&&<Modal title="Review chapter mistakes" onClose={()=>setReviewTest(null)}><div className="jee-form"><p>Create shared revision tasks for the selected mock. They appear in Tasks, Calendar and JEE Backlog when overdue.</p>{reviewTest.chapterMistakes?.map((m,i)=><p key={i}>{state.syllabus[m.subject].find(c=>c.id===m.chapterId)?.name||'Removed chapter'} · {m.mistakes} missed · {m.reason||'No reason recorded'}</p>)}<label className="jee-check"><input type="checkbox" checked={resetPractice} onChange={e=>setResetPractice(e.target.checked)}/>Reset practice completion for these chapters. Theory and previous revision counts are retained.</label><button className="jee-primary" onClick={()=>{
        const rows=(reviewTest.chapterMistakes||[]).filter(m=>state.syllabus[m.subject].some(c=>c.id===m.chapterId));
        if(resetPractice && !change(s=>({...s,syllabus:{...s.syllabus,...Object.fromEntries((['physics','chemistry','maths'] as const).map(subject=>[subject,s.syllabus[subject].map(c=>rows.some(m=>m.subject===subject&&m.chapterId===c.id)?{...c,practice:false}:c)]))}})))return;
        const generated=rows.map(m=>({id:`mock-${reviewTest.id}-${m.subject}-${m.chapterId}`,text:`Review ${state.syllabus[m.subject].find(c=>c.id===m.chapterId)?.name} · ${m.mistakes} mistakes in ${reviewTest.session||'mock'}`,createdAt:Date.now(),completed:false,dueDate:today(),category:'today' as const,jee:{subject:m.subject,chapterId:m.chapterId,kind:'revision' as const},completeJeeChapter:true}));
        p.onUpdateTasks([...p.tasks,...generated.filter(t=>!p.tasks.some(old=>old.id===t.id))]);setReviewTest(null);setTab('tasks');
      }}>Create revision tasks{resetPractice?' and reset practice':''}</button></div></Modal>}
      {revision&&<Modal title="Plan chapter revision" onClose={()=>setRevision(null)}><form className="jee-form" onSubmit={e=>{e.preventDefault();const c=state.syllabus[revision.subject].find(c=>c.id===revision.chapterId);if(!c)return;p.onUpdateTasks([...p.tasks,{id:crypto.randomUUID(),text:`Revise ${c.name}`,createdAt:Date.now(),completed:false,dueDate:revisionDate,category:'today',jee:{...revision,kind:'revision'},completeJeeChapter:true}]);setRevision(null);setTab('tasks');}}><p>{state.syllabus[revision.subject].find(c=>c.id===revision.chapterId)?.name}. Appears in your shared calendar; completing it records one revision.</p><label>Revision date<input type="date" value={revisionDate} required onChange={e=>setRevisionDate(e.target.value)}/></label><button className="jee-primary">Schedule revision</button></form></Modal>}
      {/* Modals */}
      {!store.loading && modal?.kind === 'test' && (
        <LogTestModal syllabus={state.syllabus} initial={modal.initial} onClose={close} onSave={saveTest} />
      )}
      {!store.loading && modal?.kind === 'schedule' && (
        <ScheduleTestModal initial={modal.initial} onClose={close} onSave={saveSchedule} />
      )}
      {!store.loading && modal?.kind === 'practice' && (
        <LogPracticeModal
          initial={modal.initial}
          preset={modal.preset}
          syllabus={state.syllabus}
          onClose={close}
          onSave={savePractice}
        />
      )}
      {!store.loading && modal?.kind === 'backlog' && (
        <AddBacklogModal initial={modal.initial} onClose={close} onSave={saveBacklog} />
      )}
      {!store.loading && modal?.kind === 'hours' && (
        <LogHoursModal initial={modal.initial} onClose={close} onSave={saveHours} />
      )}
      {!store.loading && modal?.kind === 'chapter' && (
        <AddCustomChapterModal
          onClose={close}
          onSave={(subject, chapter) =>
            acceptedSave((s) => ({
              ...s,
              syllabus: {
                ...s.syllabus,
                [subject]: [...s.syllabus[subject], chapter],
              },
            }))
          }
        />
      )}
      {!store.loading && modal?.kind === 'backup' && (
        <ExportImportModal
          state={data}
          onClose={close}
          onImport={(next) => acceptedSave(() => next)}
        />
      )}
      {!store.loading && modal?.kind === 'settings' && (
        <JeeProfileModal
          state={data}
          onSave={(next) => acceptedSave(() => next)}
          onClose={close}
          dailyGoalHours={p.dailyGoalHours} onOpenSharedGoals={p.onOpenSharedGoals}
          onDisable={p.onDisable}
        />
      )}

      {/* Printable Report Surface */}
      {createPortal(
        <section className="jee-report-only">
          <h1>Sanctra · JEE preparation report</h1>
          <p>
            {p.user.displayName || 'Student'} · Generated {new Date().toLocaleString()} · Target
            year {state.targetYear}
          </p>
          <p>
            {state.tests.length} mocks ·{' '}
            {state.practiceLogs.reduce((sum, l) => sum + l.questions, 0)} practice questions ·{' '}
            {hoursLabel(state.hours.reduce((sum, h) => sum + h.total, 0))} logged study time
          </p>

          <h2>Mock scorecards</h2>
          <table>
            <thead>
              <tr>
                <th>Test / date</th>
                <th>Exam / scope</th>
                <th>Physics</th>
                <th>Chemistry</th>
                <th>Maths</th>
                <th>Total / maximum</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {[...state.tests]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.session}
                      <br />
                      {dateLabel(t.date)}
                    </td>
                    <td>
                      {subjectName(t.exam)} {t.paper || ''}
                      <br />
                      {t.type} syllabus
                    </td>
                    <td>{t.physics}</td>
                    <td>{t.chemistry}</td>
                    <td>{t.maths}</td>
                    <td>
                      {t.total}/{t.max}
                    </td>
                    <td>{((t.total / t.max) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <h2>Syllabus progress</h2>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Theory</th>
                <th>Practice</th>
                <th>Both complete</th>
                <th>Total chapters</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(state.syllabus) as [JeeSubject, JeeChapter[]][]).map(
                ([s, chapters]) => (
                  <tr key={s}>
                    <td>{subjectName(s)}</td>
                    <td>{chapters.filter((c) => c.theory).length}</td>
                    <td>{chapters.filter((c) => c.practice).length}</td>
                    <td>{chapters.filter((c) => c.theory && c.practice).length}</td>
                    <td>{chapters.length}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          <p>
            Based only on your recorded data. Percentages are marks percentages, not exam percentiles
            or predicted ranks.
          </p>
        </section>,
        document.body
      )}
    </div>
  );
}
