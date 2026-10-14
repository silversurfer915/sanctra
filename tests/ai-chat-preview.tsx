import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChatPanel} from '../src/features/ai-planner/ChatPanel.tsx';
import {applyPlannerBatch,undoPlannerBatch} from '../src/features/ai-planner/apply.ts';
import {getLocalDateString} from '../src/utils/time.ts';
import type {TaskItem} from '../src/types/index.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';
function Preview(){
 const [tasks,setTasks]=useState<TaskItem[]>([]),[requests,setRequests]=useState(0),[photoReceived,setPhotoReceived]=useState(false);
 const current=useRef(tasks);current.current=tasks;const applied=useRef<string[]>([]);
 const identity={userId:'fixture',workspaceId:'desk',legacySpaceId:'desk'};
 return <div className="sanctra-app" style={{height:'100dvh',padding:16,background:'linear-gradient(135deg,#3e626c,#182735)'}}>
  <section className="ai-study-drawer glass-modal" style={{margin:'auto'}}>
   <header className="ai-study-header"><h2>Sanctra AI</h2><p>Questions, plans and your progress.</p></header>
   <div className="ai-study-body ai-study-chat-body"><ChatPanel
    plannerInput={{...identity,tasks,subjects:[],instructions:'',now:new Date(),includeTasks:true,allowDeletes:false}} subjects={[]} sessions={[]}
    send={async(_mode,instructions,_context,image)=>{
     setRequests(n=>n+1);if(image)setPhotoReceived(true);
     if(/lens|formula/i.test(instructions))return JSON.stringify({reply:String.raw`The **Lens Maker’s Formula** is:

$$\frac{1}{f}=\left(\frac{n_{lens}}{n_{medium}}-1\right)\left(\frac{1}{R_1}-\frac{1}{R_2}\right)$$

- $f$: focal length
- $R_1$, $R_2$: radii of curvature

For a lens in air, $n_{medium}\approx 1$.`,plan:null});
     return JSON.stringify({reply:image?'I read two tasks from your plan. Review the times below.':'Here are your two tasks. Review the times before adding them.',plan:{version:1,summary:'Two sessions today',question:null,operations:[{kind:'create',taskId:null,draft:{text:'Chemistry: Thermodynamics',dueDate:getLocalDateString(),startTime:'10:00',endTime:'12:00',subjectId:null}},{kind:'create',taskId:null,draft:{text:'Physics: Ray optics',dueDate:getLocalDateString(),startTime:'13:30',endTime:'14:20',subjectId:null}}]}});
    }}
    onApply={(batch,ids)=>{const result=applyPlannerBatch(current.current,batch,ids,{identity,today:getLocalDateString(),now:Date.now(),alreadyAppliedIds:applied.current});if(result.ok){setTasks(result.tasks);current.current=result.tasks;applied.current.push(...ids);}return result;}}
    onUndo={receipt=>{const result=undoPlannerBatch(current.current,receipt,identity);setTasks(result.tasks);current.current=result.tasks;applied.current=applied.current.filter(id=>!result.revertedIds.includes(id));return result;}} onOpenTasks={()=>{}}/>
   </div>
   <output style={{padding:'8px 20px',fontSize:11}} aria-label="Fixture status">{tasks.length} saved tasks · {requests} requests · photo {photoReceived?'received':'not sent'}</output>
  </section>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
