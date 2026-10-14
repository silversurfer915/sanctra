// Local-only fixture. No Firebase initialization, payment or production writes.
import type {UserSettings} from '../src/types/index.ts';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ProfileView} from '../src/components/views/ProfileView.tsx';
import {SettingsModal} from '../src/components/modals/SettingsModal.tsx';
import {ScenicWallpaper} from '../src/components/ScenicWallpaper.tsx';
import {DEFAULT_USER_SETTINGS} from '../src/utils/storage.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';

const user={uid:'guest-vip-preview',displayName:'Local VIP preview',email:'',isAnonymous:false,photoURL:'/backgrounds/illustrated-lavender-lake.v2.webp'};
const membership={uid:user.uid,tier:'early_yearly' as const,status:'active' as const,isPlus:true,adminAccess:true,currentPeriodStart:Date.now(),currentPeriodEnd:Date.now()+365*86400000,cancelAtPeriodEnd:true,createdAt:Date.now(),updatedAt:Date.now()};
function Preview(){
 const [settings,setSettings]=useState<UserSettings>({...DEFAULT_USER_SETTINGS,activeWallpaperId:'wp-plus-haven',plusProfileScene:'observatory' as const,plusAvatarEffect:'celestial' as const,plusProfileFrame:'celestial-dots' as const,plusMotionWallpaperEnabled:true}),[open,setOpen]=useState(false);
 return <main className="sanctra-app min-h-screen p-4 sm:p-8" data-theme="lavender"><ScenicWallpaper settings={settings}/><div className="workspace-page mb-4"><p>Local VIP preview · no live account</p><button className="analytics-button" onClick={()=>setOpen(true)}>Preview VIP wallpapers</button></div><ProfileView user={user} settings={settings} sessions={[]} subscription={membership} onUpdate={v=>setSettings(s=>({...s,...v}))} onNavigate={()=>{}} onAuth={()=>{}} onSignOut={()=>{}}/><SettingsModal isOpen={open} currentUser={user} settings={settings} subscription={membership} onUpdateSettings={v=>setSettings(s=>({...s,...v}))} onResetStudyTimes={()=>{}} onOpenAuth={()=>{}} onClose={()=>setOpen(false)}/></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
