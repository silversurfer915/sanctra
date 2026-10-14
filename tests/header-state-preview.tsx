import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Header} from '../src/components/Header.tsx';
import {SoundscapeProvider} from '../src/components/SoundscapeContext.tsx';
import {DEFAULT_USER_SETTINGS} from '../src/utils/storage.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';
function Preview(){
 const [loaded,setLoaded]=useState(false);
 return <main className="sanctra-app" style={{minHeight:'100vh',background:'linear-gradient(#0d1b2490,#0d1b24bb),url(/backgrounds/scenic/blue-mist.v2.webp) center/cover'}}>
  <SoundscapeProvider userSettings={DEFAULT_USER_SETTINGS} onUpdateSettings={()=>{}} timerStatus="idle">
   <Header currentView="timer" status="idle" isSidebarCollapsed onToggleSidebar={()=>{}} onOpenHistory={()=>{}} onSelectView={()=>{}} onOpenYouTube={()=>{}} onOpenAiAssistant={()=>{void import('../src/features/ai-planner/ai-planner.css').then(()=>setLoaded(true));}}/>
  </SoundscapeProvider>
  <p style={{padding:24}}>Header check: {loaded?'AI styles loaded':'Before first AI open'}</p>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
