import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Clock3, Pause, Play} from 'lucide-react';
import {TimerDial} from '../TimerDial.tsx';
import {TimerModeModal} from '../modals/TimerModeModal.tsx';
import {SelectControl} from '../ui/SelectControl.tsx';
import type {Subject, TimerMode} from '../../types/index.ts';
import {useLandingTimer} from './useLandingTimer.ts';

export const previewSubjects: Subject[] = [
  {id:'math',name:'Mathematics',color:'#B8DCF5',createdAt:0},
  {id:'physics',name:'Physics',color:'#F3DBA7',createdAt:0},
  {id:'literature',name:'Literature',color:'#F2C3CC',createdAt:0},
];

/** The production dial, with an isolated, non-persistent session. */
export function LandingFocusPreview({onOpenAuth, motion, onToggleMotion, subjectId, minutes}: {
  onOpenAuth:()=>void; motion?:boolean; onToggleMotion?:()=>void; subjectId?:string; minutes?:number;
}) {
  const timer=useLandingTimer();
  const [mode,setMode]=useState<TimerMode>('pomodoro-25');
  const [subject,setSubject]=useState(subjectId||'math');
  const [customizing,setCustomizing]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(subjectId)setSubject(subjectId);},[subjectId]);
  useEffect(()=>{if(minutes){timer.changeMinutes(minutes);setMode('custom');timer.changeMode('Countdown');}},[minutes]);
  useEffect(()=>{const sync=()=>setFullscreen(document.fullscreenElement===root.current);document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
  const selectMode=(next:TimerMode,duration?:number,config?:{focusMinutes:number})=>{
    setMode(next);
    timer.changeMode(next==='countup'?'Count-up':next.startsWith('pomodoro')?'Pomodoro':'Countdown');
    timer.changeMinutes(config?.focusMinutes||duration||({'pomodoro-25':25,'pomodoro-50':50,'pomodoro-90':90,'countdown-60':60,'countdown-120':120}[next as 'pomodoro-25'])||25);
    setCustomizing(false);
  };
  const hasElapsed=timer.mode==='Count-up'?timer.seconds>0:timer.seconds<timer.total;
  return <div ref={root} className="sanctra-app landing-product-preview landing-focus-preview">
    <header className="landing-preview-toolbar"><span><Clock3 size={17}/>Focus Room</span><span className="landing-preview-state">{timer.complete?'Complete':timer.running?'Focusing':hasElapsed?'Paused':'Ready'}</span></header>
    <div className="landing-focus-body">
      <TimerDial seconds={timer.seconds} totalTargetSeconds={timer.total} mode={mode} status={timer.running?'running':hasElapsed?'paused':'idle'} canSave={hasElapsed} isFullscreen={fullscreen} activeSubject={previewSubjects.find(s=>s.id===subject)} subjectControl={<div className="landing-dial-subject"><SelectControl label="Select focus category" value={subject} onChange={setSubject} options={previewSubjects.map(s=>({value:s.id,label:s.name}))}/></div>} onToggleStart={timer.toggle} onRequestReset={timer.reset} onRequestSave={onOpenAuth} onOpenModeModal={()=>setCustomizing(true)} onToggleFullscreen={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen();}}/>
      {customizing&&createPortal(<div className="sanctra-app landing-preview-dialog"><TimerModeModal isOpen currentMode={mode} onSelectMode={selectMode} onClose={()=>setCustomizing(false)}/></div>,fullscreen&&root.current?root.current:document.body)}
    </div>
    <footer className="landing-preview-footer"><span>Try the real timer. Sign in to save your sessions.</span>{onToggleMotion&&<button type="button" onClick={onToggleMotion} aria-pressed={!motion}>{motion?<Pause size={14}/>:<Play size={14}/>} {motion?'Pause':'Play'} background</button>}</footer>
  </div>;
}
