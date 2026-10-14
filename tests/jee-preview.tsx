import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/styles-sanctra.css';
import { JeeTrackView } from '../src/components/jeetrack/JeeTrackView.tsx';
import { useJeeTrackStore } from '../src/components/jeetrack/useJeeTrackStore.ts';
import type { TaskItem } from '../src/types/index.ts';
import type { JeeTrackSubTab } from '../src/types/jeetrack.ts';

function Preview() {
  const store = useJeeTrackStore('preview-only');
  const [callback, setCallback] = useState('No focus callback yet');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const tabParam = (new URLSearchParams(window.location.search).get('tab') as JeeTrackSubTab) || 'overview';

  return (
    <div
      className="sanctra-app"
      style={{
        minHeight: '100vh',
        background: new URLSearchParams(location.search).has('meadow') ? 'url(/backgrounds/video/quality-v4/lofi-meadow-poster.jpg) center / cover fixed' : 'linear-gradient(135deg, #090d16, #0b1120)',
      }}
    >
      <p role="status" style={{ padding: '8px 16px', color: '#94a3b8', fontSize: '13px' }}>
        {callback}
      </p>
      <JeeTrackView
        store={store}
        initialTab={tabParam}
        onFocusTask={(task) => setCallback(`Preview task focus: ${task.text}`)}
        user={{
          uid: 'preview-only',
          email: null,
          displayName: 'Preview student',
          photoURL: null,
          isAnonymous: false,
        }}
        sessions={[]}
        subjects={[{ id: 'physics', name: 'Physics', color: '#38bdf8', createdAt: 1 }]}
        tasks={tasks}
        onUpdateTasks={setTasks}
        onStartFocus={(subject, chapterId, kind) =>
          setCallback(`Preview focus: ${subject} chapter ${chapterId} · ${kind}`)
        }
        onDisable={() => setCallback('Preview only: no account preferences changed')}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>
);
