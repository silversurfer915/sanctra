import {SoundscapeProvider} from '../src/components/SoundscapeContext.tsx';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Header} from '../src/components/Header.tsx';
import {GoalRing} from '../src/components/analytics/FocusChart.tsx';
import {TimerDial} from '../src/components/TimerDial.tsx';
import {useGlassClarity} from '../src/hooks/useGlassClarity.ts';
import '../src/index.css';import '../src/styles-sanctra.css';
function Preview(){const [blur,setBlur]=useState(24),[seconds,setSeconds]=useState(0);useGlassClarity(blur);return <div className="sanctra-app" style={{minHeight:'100vh',background:'linear-gradient(120deg,#68859c,#263c45)'}}><Header currentView="timer" status="idle" isSidebarCollapsed={true} onSelectView={()=>{}} onToggleSidebar={()=>{}} onOpenHistory={()=>{}} onEnterTimerOnly={()=>{}} onOpenYouTube={()=>{}} onOpenAiAssistant={()=>{}}/><main style={{padding:24,display:'grid',gap:24}}><label>Panel blur <input aria-label="Panel blur" type="range" min="0" max="24" value={blur} onChange={e=>setBlur(Number(e.target.value))}/></label><nav className="workspace-tabs"><button aria-pressed={true}>Today</button><button aria-pressed={false}>This week</button><button aria-pressed={false}>This month</button></nav><div className="analytics-card" style={{display:'flex',gap:24,padding:24,alignItems:'center'}}><GoalRing percent={0} label="goal"/><div>Today’s goal progress<p>0h of 6h</p></div></div><TimerDial seconds={seconds} totalTargetSeconds={1500} canSave={seconds>0} mode="pomodoro-25" status="idle" isFullscreen={false} onToggleStart={()=>setSeconds(60)} onRequestReset={()=>setSeconds(0)} onRequestSave={()=>{}} onToggleFullscreen={()=>{}} onOpenModeModal={()=>{}}/></main></div>}
createRoot(document.getElementById('root')!).render(<SoundscapeProvider timerStatus="idle"><Preview/></SoundscapeProvider>);
