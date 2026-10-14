import {mergeStudyRecords} from './mergeStudyRecords.ts';
import type { CalendarEvent } from '../features/calendar/types.ts';
import { isRegisteredAccount } from './authAccess.ts';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initAppCheck } from './appCheck.ts';
import { getPerformance, trace, type FirebasePerformance } from 'firebase/performance';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {saveAccountPassword} from './accountPassword.ts';
import {
  terminate,
  clearIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { AuthUser, StudySession, Subject, TaskItem, UserSettings } from '../types/index.ts';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'sanctra_firebase_config_v1',
  AUTH_USER: 'sanctra_auth_user_v1',
};

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyBTUqltCcKKfAYczmy5qvl8RBCz8uskPy0',
  authDomain: 'auth.sanctrastudy.live',
  projectId: 'studyapp-4137d',
  storageBucket: 'studyapp-4137d.firebasestorage.app',
  messagingSenderId: '504558100883',
  appId: '1:504558100883:web:13ccbd5473080ed70a4866',
  measurementId: 'G-NEBCP98MD6',
};

// Retrieve stored or environment configuration
export function getSavedFirebaseConfig(): FirebaseConfig {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG) ||
      localStorage.getItem('groupstudytimer_firebase_config_v1') ||
      localStorage.getItem('aetherfocus_firebase_config_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey) {
        return {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
          projectId: parsed.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
          authDomain: parsed.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
        };
      }
    }
  } catch (err) {
    // ignore
  }

  // Fallback to Vite env variables if provided
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
    app = null;
    auth = null;
    db = null;
  } catch (err) {
    console.error('Failed to save Firebase config', err);
  }
}

// Global Firebase handles
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let perf: FirebasePerformance | null = null;
let analytics: Analytics | null = null;

export function recordPerformanceTrace(name: string, durationMs?: number): void {
  if (!perf) return;
  try {
    const t = trace(perf, name);
    t.start();
    if (typeof durationMs === 'number') {
      setTimeout(() => {
        try { t.stop(); } catch { }
      }, Math.max(1, durationMs));
    } else {
      t.stop();
    }
  } catch {
    // ignore
  }
}

export function initFirebase(): { app: FirebaseApp | null; auth: Auth | null; db: Firestore | null } {
  // Local previews must never write test data into the live project.
  if (import.meta.env.DEV && import.meta.env.VITE_CONNECT_LIVE_FIREBASE !== 'true') {
    return { app: null, auth: null, db: null };
  }
  if (app && auth && db) {
    return { app, auth, db };
  }

  const config = getSavedFirebaseConfig();
  if (config && config.apiKey && config.projectId) {
    try {
      if (!app) {
        if (getApps().length === 0) {
          app = initializeApp(config);
        } else {
          app = getApps()[0];
        }
      }

      // Initialize Firebase App Check
      if (app) {
        initAppCheck(app);
      }

      if (!auth) {
        auth = getAuth(app);
        // Explicitly enforce browserLocalPersistence for reliable session survival
        setPersistence(auth, browserLocalPersistence).catch((err) => {
          console.warn('Firebase setPersistence notice:', err);
        });
      }

      if (!db) {
        try {
          // Modular multi-tab offline caching with IndexedDB
          db = initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch (cacheErr) {
          console.warn('Firestore multi-tab cache fallback to default getFirestore:', cacheErr);
          try {
            db = getFirestore(app);
          } catch (dbErr) {
            console.warn('Firestore getFirestore fallback failed:', dbErr);
          }
        }
      }

      // Initialize Firebase Performance Monitoring for web if in browser
      if (typeof window !== 'undefined' && !config.projectId.startsWith('demo-') && !perf) {
        try {
          perf = getPerformance(app);
          // Dispatches an immediate custom trace to guarantee telemetry transmission
          const initialTrace = trace(perf, 'initial_app_render');
          initialTrace.start();
          setTimeout(() => {
            try { initialTrace.stop(); } catch { }
          }, 200);
        } catch (perfErr) {
          console.warn('Firebase Performance Monitoring notice:', perfErr);
        }
      }

      // Initialize Google Analytics if supported in this environment
      if (typeof window !== 'undefined' && !config.projectId.startsWith('demo-') && !analytics) {
        isAnalyticsSupported().then((supported) => {
          if (supported && app && !analytics) {
            try {
              analytics = getAnalytics(app);
            } catch {
              // Gracefully continue if analytics is blocked or unavailable
            }
          }
        }).catch(() => { });
      }

      return { app, auth, db };
    } catch (err) {
      console.warn('Firebase initialization error, running in local fallback mode:', err);
    }
  }

  return { app: null, auth: null, db: null };
}

export { app, analytics };

export function getFirebaseApp(): FirebaseApp | null {
  if (!app) {
    initFirebase();
  }
  return app;
}

// Database access requires a registered Firebase session.
export function getCloudDatabase(): Firestore | null {
  const { db, auth } = initFirebase();
  return auth?.currentUser && !auth.currentUser.isAnonymous ? db : null;
}

// Map Firebase User to AuthUser
export function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Member',
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

// Get saved local user cache
export function getStoredUser(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.AUTH_USER) ||
      localStorage.getItem('groupstudytimer_auth_user_v1') ||
      localStorage.getItem('aetherfocus_auth_user_v1');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return isRegisteredAccount(user) ? user : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch (e) {
    // ignore
  }
}

// Get live current Firebase user if available
export function getLiveCurrentUser(): AuthUser | null {
  const { auth } = initFirebase();
  if (auth?.currentUser && !auth.currentUser.isAnonymous) {
    return mapFirebaseUser(auth.currentUser);
  }
  return null;
}

// Google Sign-In
let googleLoginInFlight: Promise<AuthUser> | null = null;
export function loginWithGoogle(): Promise<AuthUser> {
  if (googleLoginInFlight) return googleLoginInFlight;
  googleLoginInFlight = (async () => {
    const { auth } = initFirebase();
    if (!auth) throw new Error('Sign-in is unavailable. Check your connection and try again.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = mapFirebaseUser(result.user);
    setStoredUser(user);
    return user;
  })().finally(() => { googleLoginInFlight = null; });
  return googleLoginInFlight;
}

// Email/Password login
export function hasAccountPassword(): boolean {
  return initFirebase().auth?.currentUser?.providerData.some(provider => provider.providerId === 'password') ?? false;
}
export function hasGoogleSignIn(): boolean {
  return initFirebase().auth?.currentUser?.providerData.some(provider => provider.providerId === 'google.com') ?? false;
}

export async function createAccountPassword(password: string): Promise<void> {
  const user = initFirebase().auth?.currentUser;
  if (!user || !user.providerData.some(provider => provider.providerId === 'google.com')) throw new Error('Sign in with Google to create a password for that account.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({login_hint: user.email || '', prompt: 'select_account'});
  await reauthenticateWithPopup(user, provider);
  await saveAccountPassword(user, password);
  setStoredUser(mapFirebaseUser(user));
}

export async function loginWithEmail(email: string, pass: string): Promise<AuthUser> {
  const { auth } = initFirebase();
  if (!auth) throw new Error('Sign-in is unavailable. Check your connection and try again.');

  const result = await signInWithEmailAndPassword(auth, email, pass);
  const user = mapFirebaseUser(result.user);
  setStoredUser(user);
  return user;
}

// Email/Password register
export async function registerWithEmail(email: string, pass: string, name?: string): Promise<AuthUser> {
  const { auth } = initFirebase();
  if (!auth) throw new Error('Sign-in is unavailable. Check your connection and try again.');

  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const user = mapFirebaseUser(result.user);
  if (name) {
    user.displayName = name;
  }
  setStoredUser(user);
  return user;
}

// Release this origin's cache connections in other tabs before clearing persistence.
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== 'sanctra_signing_out') return;
  if (event.newValue === 'true' && db) void terminate(db).catch(() => {});
  if (event.oldValue === 'true' && event.newValue === null) window.location.reload();
});

// Logout
export async function logoutUser(): Promise<void> {
  const { auth, db: database } = initFirebase();
  localStorage.setItem('sanctra_signing_out','true');
  try { if (auth) await signOut(auth); } catch (error) { localStorage.removeItem('sanctra_signing_out'); throw error; }
  setStoredUser(null);
  if (database) {
    await terminate(database);
    for (let retry = 0; ; retry++) {
      try { await clearIndexedDbPersistence(database); break; }
      catch (error) {
        if (retry >= 9) throw error;
        await new Promise(resolve => window.setTimeout(resolve, 200));
      }
    }
  }
  // Auth listeners may briefly persist their departing account's state.
  // Clear after they run, then reload so no terminated database is reused.
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sanctra_') && key !== STORAGE_KEYS.FIREBASE_CONFIG) localStorage.removeItem(key);
  }
  window.location.reload();
}

// Subscribe to real-time auth changes with resolution notification
export function subscribeToAuthChanges(
  callback: (user: AuthUser | null) => void,
  onResolved?: () => void
): () => void {
  const { auth } = initFirebase();
  if (!auth) {
    callback(null);
    if (onResolved) onResolved();
    return () => { };
  }

  let resolved = false;
  const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser && !fbUser.isAnonymous) {
      const mapped = mapFirebaseUser(fbUser);
      setStoredUser(mapped);
      callback(mapped);
    } else {
      setStoredUser(null); callback(null);
      if (fbUser?.isAnonymous) void signOut(auth).catch(() => { });
    }

    if (!resolved) {
      resolved = true;
      if (onResolved) onResolved();
    }
  });

  return unsubscribe;
}

// Firestore Database Sync
const personalSyncBases=new Map<string,Record<string,any>>();
export async function syncUserDataToFirestore(
  userId: string,
  data: {
    sessions?: StudySession[];
    subjects?: Subject[];
    tasks?: TaskItem[];
    calendarEvents?: CalendarEvent[];
    settings?: UserSettings;
  }
): Promise<void> {
  const db = getCloudDatabase();
  if (!db || !userId) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    const base=personalSyncBases.get(userId)||{};
    let committed:Record<string,any>={};
    await runTransaction(db,async tx=>{
      const remote=(await tx.get(userDocRef)).data()||{};
      const patch:Record<string,any>={...data,lastSyncedAt:Date.now()};
      for(const key of ['sessions','tasks','calendarEvents'] as const){
        if(Array.isArray(data[key]))patch[key]=mergeStudyRecords<{id:string}>(base[key]||[],data[key]!,remote[key]||[]).filter(item=>!(remote[key==='tasks'?'deletedTaskIds':key==='sessions'?'deletedSessionIds':'deletedEventIds']||[]).includes(item.id));
      }
      tx.set(userDocRef,patch,{mergeFields:[...Object.keys(data).filter(key=>(data as Record<string,unknown>)[key]!==undefined),'lastSyncedAt']});
      committed={...remote,...patch};
    });
    personalSyncBases.set(userId,structuredClone(committed));
  } catch (err) {
    throw new Error('Firestore sync failed; local changes are preserved.', { cause: err });
  }
}

// Load User Data from Firestore
export async function loadUserDataFromFirestore(userId: string): Promise<{
  sessions?: StudySession[];
  subjects?: Subject[];
  tasks?: TaskItem[];
  calendarEvents?: CalendarEvent[];
  settings?: UserSettings;
} | null> {
  const db = getCloudDatabase();
  if (!db || !userId) return null;

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      if(!personalSyncBases.has(userId))personalSyncBases.set(userId,structuredClone(snap.data()));
      return snap.data() as {
        sessions?: StudySession[];
        subjects?: Subject[];
        tasks?: TaskItem[];
        calendarEvents?: CalendarEvent[];
        settings?: UserSettings;
      };
    }
  } catch (err) {
    throw new Error('Firestore data could not be loaded.', { cause: err });
  }
  return null;
}
