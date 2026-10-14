import {useEffect, useRef, useState} from 'react';

export type PreviewTimerMode = 'Pomodoro' | 'Countdown' | 'Count-up';

// Keep exact elapsed time between pauses; intervals only update the display.
export function useLandingTimer() {
  const [mode, setMode] = useState<PreviewTimerMode>('Pomodoro');
  const [minutes, setMinutes] = useState(25);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef({elapsed: 0, startedAt: 0});
  const total = minutes * 60;
  const complete = mode !== 'Count-up' && elapsed >= total * 1000;
  const seconds = mode === 'Count-up' ? Math.floor(elapsed / 1000) : Math.max(0, Math.ceil(total - elapsed / 1000));

  useEffect(() => {
    if (!running) return;
    const update = () => {
      const value = clock.current.elapsed + Math.max(0, Date.now() - clock.current.startedAt);
      if (mode !== 'Count-up' && value >= total * 1000) {
        clock.current.elapsed = total * 1000;
        setElapsed(total * 1000);
        setRunning(false);
      } else setElapsed(value);
    };
    const interval = window.setInterval(update, 100);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [running, mode, total]);

  const reset = () => {
    clock.current = {elapsed: 0, startedAt: 0};
    setElapsed(0);
    setRunning(false);
  };
  const toggle = () => {
    if (running) {
      const value = clock.current.elapsed + Math.max(0, Date.now() - clock.current.startedAt);
      clock.current.elapsed = mode === 'Count-up' ? value : Math.min(value, total * 1000);
      setElapsed(clock.current.elapsed);
      setRunning(false);
    } else {
      if (complete) {clock.current.elapsed = 0; setElapsed(0);}
      clock.current.startedAt = Date.now();
      setRunning(true);
    }
  };
  const changeMinutes = (value: number) => {
    if (!Number.isFinite(value)) return;
    reset();
    setMinutes(Math.max(1, Math.min(180, Math.round(value))));
  };
  const changeMode = (value: PreviewTimerMode) => {reset(); setMode(value);};
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return {mode, minutes, running, seconds, total, complete, time, toggle, reset, changeMinutes, changeMode};
}
