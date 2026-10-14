import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/index.css';import '../src/styles-sanctra.css';
import {TimerModeModal} from '../src/components/modals/TimerModeModal.tsx';
import type {PomodoroConfig,TimerMode} from '../src/types/index.ts';
function Preview(){const [open,setOpen]=useState(true),[mode,setMode]=useState<TimerMode>('countup'),[config,setConfig]=useState<PomodoroConfig>();return <div className="sanctra-app" style={{minHeight:'100vh',background:'#152c3b'}}><button onClick={()=>setOpen(true)}>Customize Timer</button><p>Selected: {mode} {JSON.stringify(config)}</p><TimerModeModal isOpen={open} currentMode={mode} savedPomodoroConfig={config} onSelectMode={(m,_,c)=>{setMode(m);if(c)setConfig(c);}} onClose={()=>setOpen(false)}/></div>};createRoot(document.getElementById('root')!).render(<Preview/>);
