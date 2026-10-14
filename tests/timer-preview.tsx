import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QuoteBanner } from '../src/components/QuoteBanner.tsx';
import { CurrentTaskBar } from '../src/components/CurrentTaskBar.tsx';
import { MetricCards } from '../src/components/MetricCards.tsx';
import { TimerDial } from '../src/components/TimerDial.tsx';
import type { TaskItem, Subject } from '../src/types/index.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';


const subjects: Subject[] = [
  { id: 'sub-physics', name: 'Physics', color: '#60a5fa', createdAt: 1 },
  { id: 'sub-math', name: 'Mathematics', color: '#a78bfa', createdAt: 2 },
  { id: 'sub-reading', name: 'Reading', color: '#fb7185', createdAt: 3 },
];

const focusedTask: TaskItem = {
  id: 'task-1',
  text: 'Physics Mechanics & Newton’s Laws',
  subjectId: 'sub-physics',
  completed: false,
  category: 'today',
  startTime: '19:00',
  endTime: '20:00',
  dueDate: new Date().toISOString().slice(0, 10),
  createdAt: Date.now(),
};

function TimerPreview() {
  const [running, setRunning] = useState(false);
  return (
    <main
      className="sanctra-app timer-content"
      style={{
        minHeight: '100dvh',
        background: 'url(/backgrounds/video/quality-v4/lofi-meadow-poster.jpg) center/cover fixed',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div className="focus-workspace">
        <aside className="focus-context" aria-label="Focus overview">
          <div className="focus-task-context">
            <CurrentTaskBar tasks={[focusedTask]} subjects={subjects} focusedTask={focusedTask} onFocus={() => {}} onStopFocus={() => {}} onComplete={() => {}} />
          </div>
          <MetricCards subjects={subjects} subjectTrackingEnabled todaySeconds={5820} dailyGoalHours={4} streakDays={8} thisWeekSeconds={45900} onOpenSubjects={() => {}} onOpenGoalModal={() => {}} onOpenStreakHelp={() => {}} />
          <QuoteBanner />
        </aside>
        <TimerDial
          minimal={false}
          seconds={1500}
          totalTargetSeconds={3000}
          canSave
          mode="pomodoro-50"
          status={running ? 'running' : 'paused'}
          isFullscreen={false}
          activeSubject={subjects[0]}
          onOpenSubjects={() => {}}
          onToggleStart={() => setRunning(value => !value)}
          onRequestReset={() => {}}
          onRequestSave={() => {}}
          onToggleFullscreen={() => {}}
          onOpenModeModal={() => {}}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<TimerPreview />);
