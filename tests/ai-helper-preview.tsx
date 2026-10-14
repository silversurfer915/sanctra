import {useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/index.css';
import '../src/styles-sanctra.css';
import {AiStudyAssistantModal} from '../src/components/modals/AiStudyAssistantModal.tsx';
import {THEME_PALETTES} from '../src/utils/storage.ts';
function Preview(){const[open,setOpen]=useState(false);const t=THEME_PALETTES.blue;return <div className="sanctra-app" style={{'--sanctra-ink':t.ink,'--sanctra-sage':t.accent,'--sanctra-muted':t.muted,height:'100vh',padding:32,background:'url(/backgrounds/illustrated-study-desk.v2.webp) center / cover'} as CSSProperties}><button className="analytics-button ai-study-launcher" onClick={()=>setOpen(true)}>Sanctra AI study helper</button><AiStudyAssistantModal isOpen={open} onClose={()=>setOpen(false)} workspaceId="preview" subjects={[{id:'math',name:'Mathematics',color:'#a6cde5',createdAt:0}]} sessions={[]}/></div>}
createRoot(document.getElementById('root')!).render(<Preview/>);
