import React from 'react';
import {createRoot} from 'react-dom/client';
import {AdminIntegrations} from '../src/components/AdminIntegrations.tsx';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
document.body.style.cssText='background:#17181d;margin:0;padding:24px;color:#e8eef7';
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1050,margin:'0 auto'}}><p style={{fontFamily:'sans-serif'}}>Hermes Admin · isolated fixture · no live Firebase calls</p><AdminIntegrations user={{uid:'fixture-owner',email:null,displayName:'Fixture administrator',photoURL:null,isAnonymous:false}}/></main>);
