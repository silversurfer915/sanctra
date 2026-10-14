import {createRoot} from 'react-dom/client';
import {ChatPanel} from '../src/features/ai-planner/ChatPanel.tsx';
import '../src/index.css';
import '../src/styles-sanctra.css';
const input={userId:'fixture',workspaceId:'fixture',legacySpaceId:'fixture',tasks:[],subjects:[],instructions:'',now:new Date(),includeTasks:true,allowDeletes:false};
createRoot(document.getElementById('root')!).render(<div className="sanctra-app" style={{height:'100dvh',padding:16,background:'linear-gradient(135deg,#3e626c,#182735)'}}><section className="ai-study-drawer glass-modal" style={{margin:'auto'}}><header className="ai-study-header"><h2>Sanctra AI</h2></header><div className="ai-study-body ai-study-chat-body"><ChatPanel plannerInput={input} workspaceId="fixture" subjects={[]} sessions={[]} onSaveManualSession={()=>{}} send={async()=>JSON.stringify({reply:'Review your past session.',plan:null,sessions:[{date:'2026-10-01',startTime:'18:00',durationMinutes:50,subjectId:null,notes:'Ray optics practice'}]})}/></div></section></div>);
