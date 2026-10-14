import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles-sanctra.css';
import App from './App.tsx';
import {LegalView} from './components/views/LegalView.tsx';
import { initFirebase } from './utils/firebase.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

import { OfflineIndicator } from './components/OfflineIndicator.tsx';

// Catch Vite dynamic import / stale chunk failures and prompt clean reload
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    // Keep the rejection intact: swallowing it resolves React.lazy to undefined.
    // That masks the actual asset error with a secondary .default startup crash.
    const key = 'sanctra_chunk_reload_ts';
    const lastReload = Number(sessionStorage.getItem(key)) || 0;
    // Debounce to prevent reload loops
    if (Date.now() - lastReload > 8000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  });
}

// Initialize Firebase immediately on script load for instant Performance Monitoring and telemetry
initFirebase();

const seoTopic=/^\/pomodoro-timer\/?$/.test(window.location.pathname)?'pomodoro':/^\/group-study-timer\/?$/.test(window.location.pathname)?'group':null;
const SeoTopicView=seoTopic?(await import('./components/views/SeoTopicView.tsx')).SeoTopicView:null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/^\/privacy\/?$/.test(window.location.pathname)?<LegalView kind="privacy"/>:
       seoTopic&&SeoTopicView?<SeoTopicView topic={seoTopic}/>:<App />}
      <OfflineIndicator />
    </ErrorBoundary>
  </StrictMode>,
);
