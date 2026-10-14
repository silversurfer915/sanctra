import { useEffect, useState } from 'react';

/** Wall-clock time only; independent of session timing and ranking. */
export function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return <time className="timer-local-clock" dateTime={now.toISOString()} aria-label={`Local time ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}>
    {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
  </time>;
}
