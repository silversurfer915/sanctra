import type {FirebaseApp} from 'firebase/app';
import {initializeAppCheck,ReCaptchaEnterpriseProvider,CustomProvider,type AppCheck} from 'firebase/app-check';
import {selectAppCheckProvider} from './appCheckConfig.ts';
declare global {var FIREBASE_APPCHECK_DEBUG_TOKEN:boolean|string|undefined;}
const env=import.meta.env;
export const isDevelopment=Boolean(env?.DEV);
export const REGISTERED_DEV_APP_CHECK_TOKEN=isDevelopment?(env?.VITE_APPCHECK_DEBUG_TOKEN||env?.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN||''):'';
export const RECAPTCHA_ENTERPRISE_SITE_KEY=env?.VITE_RECAPTCHA_ENTERPRISE_KEY||env?.VITE_RECAPTCHA_SITE_KEY||'';
let instance:AppCheck|null=null;
export function initAppCheck(app:FirebaseApp):AppCheck|null {
 if(instance)return instance;if(typeof window==='undefined')return null;
 const choice=selectAppCheckProvider({production:!isDevelopment,siteKey:RECAPTCHA_ENTERPRISE_SITE_KEY,debugToken:REGISTERED_DEV_APP_CHECK_TOKEN});
 if(choice==='unavailable')return null;
 try {const provider=choice==='enterprise'?new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY):new CustomProvider({async getToken(){const {projectId,appId,apiKey}=app.options;const r=await fetch(`https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps/${appId}:exchangeDebugToken?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({debugToken:REGISTERED_DEV_APP_CHECK_TOKEN})});if(!r.ok)throw new Error('App verification unavailable');const data=await r.json();return {token:data.token,expireTimeMillis:Date.now()+3600000};}});instance=initializeAppCheck(app,{provider,isTokenAutoRefreshEnabled:true});return instance;}catch{return null;}
}
export function getAppCheckInstance(){return instance;}
