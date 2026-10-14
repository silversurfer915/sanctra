import {useState} from 'react';
import type {PreviewTimerMode} from './useLandingTimer.ts';

export function LandingTimerModes({mode, onChange}: {mode: PreviewTimerMode; onChange: (value: PreviewTimerMode) => void}) {
  return <div className="showcase-mode-buttons timer-mode-buttons" aria-label="Example timer mode">
    {(['Pomodoro', 'Countdown', 'Count-up'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => onChange(value)}>{value}</button>)}
  </div>;
}

export function LandingTimerDuration({minutes, onChange}: {minutes: number; onChange: (value: number) => void}) {
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(String(minutes));
  return <div className="demo-duration">
    <div className="preview-modes" aria-label="Example focus duration">
      {[25, 50].map(n => <button type="button" key={n} aria-pressed={minutes === n} onClick={() => {onChange(n); setValue(String(n)); setCustom(false);}}>{n} min</button>)}
      <button type="button" aria-expanded={custom} onClick={() => {setValue(String(minutes)); setCustom(!custom);}}>Custom</button>
    </div>
    {custom && <form className="demo-custom-duration" onSubmit={e => {e.preventDefault(); if (Number(value) >= 1 && Number(value) <= 180) {onChange(Number(value)); setCustom(false);}}}>
      <label>Minutes <input type="number" min="1" max="180" step="1" required value={value} onChange={e => setValue(e.target.value)} /></label>
      <button type="submit">Apply</button>
    </form>}
  </div>;
}
