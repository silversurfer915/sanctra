import {createRoot} from 'react-dom/client';
import '../src/index.css';import '../src/styles-sanctra.css';
import {LandingView} from '../src/components/views/LandingView.tsx';
createRoot(document.getElementById('root')!).render(<LandingView onStartStudying={()=>{}} onOpenGroups={()=>{}} onOpenAuth={()=>alert('Preview: this opens the existing sign-in flow in the app.')}/>);
