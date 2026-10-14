import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/styles-sanctra.css';
import { SoundscapeProvider, SoundscapeHeaderControl, CenteredHiddenMusicBar } from '../src/components/SoundscapeContext.tsx';
import { DEFAULT_USER_SETTINGS } from '../src/utils/storage.ts';
function Preview() {
  const [settings, setSettings] = useState(DEFAULT_USER_SETTINGS);
  return <main id="sanctra-root" className="sanctra-app" style={{minHeight:'100vh',padding:32,background:'#131b28'}}>
    <SoundscapeProvider userSettings={settings} onUpdateSettings={value => setSettings(previous => ({...previous,...value}))} timerStatus="idle">
      <div style={{display:"flex",justifyContent:"flex-end"}}><SoundscapeHeaderControl /></div>
      <CenteredHiddenMusicBar />
    </SoundscapeProvider>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
