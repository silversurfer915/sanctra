import {useState} from 'react';import {createRoot} from 'react-dom/client';import '../src/index.css';import '../src/styles-sanctra.css';import {ProfileView} from '../src/components/views/ProfileView.tsx';import {SupportView} from '../src/components/views/SupportView.tsx';import {DEFAULT_USER_SETTINGS} from '../src/utils/storage.ts';
function Review(){
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialStudio = searchParams?.get('studio') === '1' || searchParams?.get('studio') === 'true';
  const initialPlus = searchParams?.get('plus') !== '0' && searchParams?.get('plus') !== 'false';
  const [settings,setSettings]=useState({...DEFAULT_USER_SETTINGS,studyDetails:{stream:'PCM',status:'School Student',country:'India',city:'Coimbatore'},customDisplayName:'Alex Morgan',bio:'Finding a little focus, every day.',plusAnimatedAvatarUrl:searchParams?.get('newportrait')==='1'?'/avatars/motion/owl.gif':'/avatars/identity-moonstone.svg',plusProfileCoverUrl:'/backgrounds/illustrated-charcoal-library.webp',plusAvatarEffect:'celestial',plusProfileFrame:'celestial-dots'});
  const [view,setView]=useState('profile');
  const [premium,setPremium]=useState(initialPlus);
  const [studioMode,setStudioMode]=useState(initialStudio);
  return <div className="sanctra-app" style={{minHeight:'100vh',padding:'clamp(12px, 3vw, 28px)'} as React.CSSProperties}>
    <div style={{maxWidth:1120,margin:'auto'}}>
      <nav style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:28,background:'rgba(12,24,22,0.6)',padding:'10px 16px',borderRadius:12,backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <label style={{display:'flex',alignItems:'center',gap:6,color:'#e5e7eb',fontSize:13,cursor:'pointer'}}><input type="checkbox" checked={premium} onChange={e=>setPremium(e.target.checked)}/>Plus preview</label>
        <label style={{display:'flex',alignItems:'center',gap:6,color:'#e5e7eb',fontSize:13,cursor:'pointer'}}><input type="checkbox" checked={studioMode} onChange={e=>setStudioMode(e.target.checked)}/>Open Studio Editor</label>
        <button onClick={()=>setView('profile')} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.15)',background:view==='profile'?'rgba(255,255,255,0.1)':'transparent',color:'#fff',cursor:'pointer'}}>Profile</button>
        <button onClick={()=>setView('empty')} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.15)',background:view==='empty'?'rgba(255,255,255,0.1)':'transparent',color:'#fff',cursor:'pointer'}}>Empty states</button>
      </nav>
      {view==='profile' ? (
        <ProfileView
          key={String(studioMode)}
          user={{uid:'guest-preview',displayName:'Alex Morgan',email:'',photoURL:null,isAnonymous:false}}
          settings={settings as typeof DEFAULT_USER_SETTINGS}
          onUpdate={p=>setSettings(s=>({...s,...p}) as typeof settings)}
          sessions={[]}
          subscription={premium?{adminAccess:true} as never:null}
          initialEditing={studioMode}
          initialEditorSection={searchParams?.get('section')==='portrait'?'portrait':'identity'}
          onNavigate={()=>{}}
          onAuth={()=>{}}
          onSignOut={()=>{}}
        />
      ) : (
        <>
          <SupportView user={{uid:'guest-preview',isAnonymous:true} as never} enabled onConnect={()=>{}}/>
          <article className="workspace-panel ranking-list"><div className="empty-panel"><h2>A fresh start.</h2><p>Verified timers from registered members will appear here.</p></div></article>
        </>
      )}
    </div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
