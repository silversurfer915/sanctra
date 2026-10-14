import {createRoot} from 'react-dom/client';
import {AccountPassword} from '../src/components/AccountPassword.tsx';
import '../src/index.css';
import '../src/styles-sanctra.css';
createRoot(document.getElementById('root')!).render(<main className="sanctra-app" style={{minHeight:'100vh',padding:24,background:'#142535',color:'#e8eef7'}}><section style={{maxWidth:440,margin:'40px auto',padding:24,border:'1px solid #b8dcf533',borderRadius:20,background:'#203449'}}><h2 style={{marginBottom:20}}>Sign-in methods</h2><AccountPassword/></section></main>);
