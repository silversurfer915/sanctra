import {focusSnapshot} from './utils/focusTiming.ts';
import {resolveHydratedSettings} from './utils/settingsPersistence.ts';
import {taskJeeTag, completeJeeTask, jeeCalendarEvents, jeeManualSessions, jeeReminders, jeeStudyStreak} from './utils/jeeIntegration.ts';
import type {JeeTrackSubTab} from './types/jeetrack.ts';
import {JeeFocusPicker} from './components/JeeFocusPicker.tsx';
import {useJeeTrackStore} from './components/jeetrack/useJeeTrackStore.ts';
import {buildJeeAIContext} from './utils/jeeAI.ts';
import {normalizeJeeFocusTag} from './utils/jeeFocus.ts';
import type {JeeSessionTag} from './types/index.ts';
import './components/admin-studio.css';
import {Brand} from './components/Brand.tsx';
import {isSitePaused} from './utils/platformConfig.ts';
import {getLandingWallpaperId} from './utils/wallpaperTheme.ts';
import { strictFocusAction } from './utils/strictMode.ts';
import {POMODORO_PRESETS,normalizePomodoroConfig,pomodoroBreakSeconds,isPomodoroMode} from './utils/pomodoro.ts';
import type {PomodoroConfig} from './types/index.ts';
import {useCalendarEvents} from './features/calendar/useCalendarEvents.ts';
import {isEntitlementActive} from './utils/subscriptionPlans.ts';
import { applyPlannerBatch, undoPlannerBatch } from './features/ai-planner/apply.ts';
import {useGlassClarity} from './hooks/useGlassClarity.ts';
import {deleteRankedSession} from './utils/deleteRankedSession.ts';
import {useStudyIntegrity} from './components/useStudyIntegrity.ts';
import {AdminTicketAlert} from './components/AdminTicketAlert.tsx';
import { useGroupPresence } from './components/useGroupPresence.ts';
import { taskFocusSeconds } from './utils/taskSchedule.ts';
import { CurrentTaskBar } from './components/CurrentTaskBar.tsx';
import { subscribeAdmin, subscribeRestriction, trackPlatformUser, isRestricted, type Restriction } from './utils/adminService.ts';
import { useScreenMotion } from './components/useScreenMotion.ts';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  TimerMode,
  TimerStatus,
  Subject,
  StudySession,
  UserSettings,
  ViewMode,
  AuthUser,
  TaskItem,
  TimerDraft,
  UserSubscription,
} from './types/index.ts';
import { watchSubscription } from './utils/subscriptionService.ts';
import { WALLPAPER_PRESETS } from './utils/storage.ts';
import {
  getSessions,
  persistSessions,
  deleteSession as removeSession,
  getSubjects,
  saveSubjects as persistSubjects,
  getUserSettings,
  saveUserSettings as persistUserSettings,
  getTimerDraft,
  saveTimerDraft,
  clearTimerDraft,
  getTasks,
  saveTasks as persistTasks,
  clearAllSessions,
  resolveWallpaperId,
  DEFAULT_SUBJECTS,
  DEFAULT_USER_SETTINGS,
  getSettingsStorageKey,
  purgeSharedDeviceState,
  persistAccountCache,
} from './utils/storage.ts';
import {
  calculateStreak,
  getTodaySeconds,
  getThisWeekSeconds,
  getLocalDateString,
} from './utils/time.ts';
import {
  getStoredUser,
  syncUserDataToFirestore,
  loadUserDataFromFirestore,
  subscribeToAuthChanges,
  logoutUser,
  recordPerformanceTrace,
  getCloudDatabase,
} from './utils/firebase.ts';
import { doc, getDoc } from 'firebase/firestore';
import {subscribeStudyRecords,reconcileStudyRecords} from './utils/studyDataSync.ts';
import {readSessionOutbox,persistSessionWithRetry,confirmSessionSaves,writeSessionOutbox} from './utils/sessionOutbox.ts';
import {mergeStudyRecords} from './utils/mergeStudyRecords.ts';
import {mirrorFocusSession} from './utils/focusMirror.ts';
import {
  getDeviceId,
  listenActiveSession,
  startActiveSession,
  takeOverActiveSession,
  recoverActiveSession,
  updateActiveSession,
  heartbeatActiveSession,
  deleteActiveSession,
  type ActiveSession,
} from './utils/activeSessionService.ts';
import { THEME_PALETTES, getThemeName } from './utils/storage.ts';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { ScenicWallpaper } from './components/ScenicWallpaper.tsx';
import { resolveAccountData } from './utils/accountData.ts';
import { restoreTimerDraft, hasUnsavedFocus } from './utils/timerDraft.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { QuoteBanner } from './components/QuoteBanner.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { TimerDial } from './components/TimerDial.tsx';
import { LocalClock } from './components/LocalClock.tsx';
import { SoundscapeProvider, CenteredHiddenMusicBar } from './components/SoundscapeContext.tsx';

import { TimerModeModal } from './components/modals/TimerModeModal.tsx';
import { SubjectModal } from './components/modals/SubjectModal.tsx';
import { SaveSessionModal } from './components/modals/SaveSessionModal.tsx';
import { ResetConfirmModal } from './components/modals/ResetConfirmModal.tsx';
import { TakeOverModal } from './components/modals/TakeOverModal.tsx';
import { PomodoroCompleteModal } from './components/modals/PomodoroCompleteModal.tsx';
import { StreakHelpModal } from './components/modals/StreakHelpModal.tsx';
import { DailyGoalModal } from './components/modals/DailyGoalModal.tsx';
import { SessionHistoryModal } from './components/modals/SessionHistoryModal.tsx';
import { AuthModal } from './components/modals/AuthModal.tsx';
import { ManualSessionModal } from './components/modals/ManualSessionModal.tsx';
import { SettingsModal } from './components/modals/SettingsModal.tsx';
const AiStudyAssistantModal = React.lazy(() => import('./components/modals/AiStudyAssistantModal.tsx'));
import { activeWorkspace, resolveWorkspaces, belongsToWorkspace, workspaceSettings } from './utils/workspaces.ts';
import { YouTubeModal } from './components/modals/YouTubeModal.tsx';
import {syncBrowserChrome} from './utils/browserChrome.ts';
import { WhatsNewModal } from './components/modals/WhatsNewModal.tsx';
import { watchPlatformConfig,DEFAULT_PLATFORM_CONFIG,resolveFeaturePause } from './utils/platformConfig.ts';
import { MaintenanceView } from './components/views/MaintenanceView.tsx';
import { useCompetitivePresence } from './components/useCompetitivePresence.ts';

const LiveGroupsView = React.lazy(() => import('./components/views/LiveGroupsView.tsx').then(m => ({ default: m.LiveGroupsView })));
// The public entry surface must render without waiting on a second JS request.
import {LandingView} from './components/views/LandingView.tsx';
const AnalyticsView = React.lazy(() => import('./components/views/AnalyticsView.tsx').then(m => ({ default: m.AnalyticsView })));
const CalendarView = React.lazy(() => import('./features/calendar/CalendarView.tsx').then(m=>({default:m.CalendarView})));
const PlannerView = React.lazy(() => import('./components/views/PlannerView.tsx').then(m => ({ default: m.PlannerView })));
const ProfileView = React.lazy(() => import('./components/views/ProfileView.tsx').then(m => ({ default: m.ProfileView })));
const AdminView = React.lazy(() => import('./components/views/AdminView.tsx').then(m => ({ default: m.AdminView })));
const SupportView = React.lazy(() => import('./components/views/SupportView.tsx').then(m => ({ default: m.SupportView })));
const RankingsView = React.lazy(() => import('./components/views/RankingsView.tsx').then(m => ({ default: m.RankingsView })));
const InboxView = React.lazy(() => import('./components/views/InboxView.tsx').then(m => ({ default: m.InboxView })));
const JeeTrackView = React.lazy(() => import('./components/jeetrack/JeeTrackView.tsx').then(m => ({ default: m.JeeTrackView })));



export const App: React.FC = () => {
  // Authentication loading state (resolving Firebase persistence)
  const [isAuthResolving, setIsAuthResolving] = useState<boolean>(true);
  const [authModalMode, setAuthModalMode] = useState<'signin'>('signin');

  // User & Cloud State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionReady, setSubscriptionReady] = useState(false);

  useEffect(() => {
    if (isAuthResolving || !currentUser?.uid || currentUser.uid.startsWith('guest-')) {
      setSubscription(null);
      setSubscriptionReady(false);
      return;
    }
    // A cached UID can stay unchanged when Firebase restores the session.
    // Reconnect after auth resolution instead of treating the initial null DB as final.
    setSubscriptionReady(false);
    return watchSubscription(currentUser.uid, value => {setSubscription(value);setSubscriptionReady(true);});
  }, [currentUser?.uid, isAuthResolving]);

  // Detect if user landed with an invite link or room code (e.g. ?room=ROOM_ID or ?code=CODE)
  const [initialRoomId, setInitialRoomId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room') || params.get('code') || params.get('join');
      if (room) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return room;
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  // Navigation View State: if invite link is present, navigate directly to 'groups'
  const calendar = useCalendarEvents(currentUser?.uid || null);
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    if (initialRoomId) return 'groups';
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('code') || params.get('join')) {
        return 'groups';
      }
      const v = params.get('view') as ViewMode | null;
      if (v && ['timer','planner','calendar','analytics','groups','rankings','profile','inbox','support','admin'].includes(v)) {
        return v;
      }
    } catch (e) {
      // ignore
    }
    return 'timer';
  });

  const [isLandingForced, setIsLandingForced] = useState(() => new URLSearchParams(window.location.search).get('landing') === 'true');
  const exitLandingPreview = () => {
    setIsLandingForced(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('landing');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const plannerApplied = useRef(new Map<string, Set<string>>());
  const screenMotionRef = useScreenMotion(currentView);

  const handleSelectView = (view: ViewMode) => {
    const target = view === 'spaces' ? 'timer' : view;
    recordPerformanceTrace(`view_${target}`, 100);
    setCurrentView(target);
    try {
      localStorage.setItem('sanctra_active_view', target);
    } catch (e) {
      // ignore
    }
  };

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sanctra_sidebar_collapsed') ?? localStorage.getItem('groupstudytimer_sidebar_collapsed');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNarrowScreen,setIsNarrowScreen]=useState(()=>window.matchMedia('(max-width: 1023px)').matches);
  useEffect(()=>{const media=window.matchMedia('(max-width: 1023px)');const update=()=>setIsNarrowScreen(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const [,setRoomNavigationRequest]=useState(0);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sanctra_sidebar_collapsed', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // State from LocalStorage
  const [sessions, setSessions] = useState<StudySession[]>(() => getSessions());
  const [subjects, setSubjects] = useState<Subject[]>(() => getSubjects());
  const [landingWallpaperId,setLandingWallpaperId]=useState(getLandingWallpaperId);
  const [settings, setSettings] = useState<UserSettings>(() => getUserSettings(getStoredUser()?.uid));
  useGlassClarity(settings.uiGlassBlur);
  const [tasks, setTasks] = useState<TaskItem[]>(() => getTasks());
  const spaces = resolveWorkspaces(settings);
  const space = activeWorkspace(settings);
  const legacySpaceId = settings.legacyWorkspaceId || spaces[0]?.id;
  const spaceSessions = sessions;
  const spaceSubjects = subjects;
  const spaceTasks = tasks;
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const focusedTask = tasks.find(task => task.id === focusedTaskId);

  // Restore state before effects can write a new draft over the saved one.
  const [initialTimer] = useState(() => {
    const draft = getTimerDraft();
    return { draft, restored: draft ? restoreTimerDraft(draft, Date.now()) : null, now: Date.now() };
  });
  const [jeeFocusTag,setJeeFocusTag]=useState<JeeSessionTag|undefined>(()=>normalizeJeeFocusTag(initialTimer.draft?.jee));
  const [jeeAIInstructions,setJeeAIInstructions]=useState('');
  const [mode, setMode] = useState<TimerMode>(initialTimer.draft?.mode || 'countup');
  const [status, setStatus] = useState<TimerStatus>(initialTimer.restored?.status || 'idle');
  const [targetSeconds, setTargetSeconds] = useState(initialTimer.draft?.targetSeconds || 0);
  const [breakSeconds, setBreakSeconds] = useState(initialTimer.draft?.breakSeconds || 0);
  const [activePomodoroConfig,setActivePomodoroConfig]=useState<PomodoroConfig>(()=>normalizePomodoroConfig(initialTimer.draft?.pomodoroConfig || settings.pomodoroConfig || POMODORO_PRESETS[initialTimer.draft?.mode==='pomodoro-50'?1:initialTimer.draft?.mode==='pomodoro-90'?2:0]));
  const [pomodoroCompletedSessions,setPomodoroCompletedSessions]=useState(()=>Math.max(0,Math.floor(initialTimer.draft?.pomodoroCompletedSessions||0)));

  const [displaySeconds, setDisplaySeconds] = useState(initialTimer.restored?.displaySeconds || 0);
  const focusEndedAtRef = useRef<number|null>(initialTimer.restored?.focusEndedAt??null);
  const runningSinceRef = useRef<number | null>(initialTimer.restored?.runningSince || null);
  const sessionRankingCappedRef = useRef(initialTimer.draft?.rankingCapped === true);
  const accumulatedSecondsRef = useRef(initialTimer.restored?.elapsedSeconds || 0);
  const sessionWorkspaceRef = useRef(initialTimer.draft?.workspaceId || space.id);
  const [sessionStrictMode, setSessionStrictMode] = useState(initialTimer.draft?.strictMode === true);
  const strictAutoPausedRef = useRef(false);
  const strictStatusRef = useRef(status);
  strictStatusRef.current = status;
  const sessionStartTimeRef = useRef(initialTimer.restored?.sessionStartTime || initialTimer.now);
  const flushIntegrityRef = useRef<(targetStatus?: TimerStatus) => Promise<void>>(() => Promise.resolve());

  // Active session tracking (one active session per account)
  const [activeSessionRemote, setActiveSessionRemote] = useState<ActiveSession | null>(null);
  const [isTakeOverModalOpen, setIsTakeOverModalOpen] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const currentSessionIdRef = useRef<string | null>(initialTimer.restored?.sessionId || null);
  const localOnlySessionRef = useRef(initialTimer.draft?.localOnly === true);
  const statusRef = useRef<TimerStatus>(status);
  statusRef.current = status;
  const modeRef = useRef<TimerMode>(mode);
  modeRef.current = mode;
  const targetSecondsRef = useRef<number>(targetSeconds);
  targetSecondsRef.current = targetSeconds;

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [timerOnly,setTimerOnly] = useState(false);
  useEffect(()=>{const exit=(event:KeyboardEvent)=>{if(event.key==='Escape')setTimerOnly(false);};window.addEventListener('keydown',exit);return()=>window.removeEventListener('keydown',exit);},[]);

  // Modals state
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<{mode:TimerMode; minutes?:number; pomodoroConfig?:PomodoroConfig} | null>(null);
  const [isPomodoroCompleteOpen, setIsPomodoroCompleteOpen] = useState(initialTimer.restored?.status === 'break-ready');
  const [isStreakHelpOpen, setIsStreakHelpOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(new URLSearchParams(window.location.search).get('settings'));
    }
    return false;
  });
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [supportInitialCategory, setSupportInitialCategory] = useState<string | undefined>(undefined);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'wallpaper' | 'preferences' | 'danger'>('wallpaper');
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [isSignOutConfirmOpen,setIsSignOutConfirmOpen]=useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [hasOpenedAi, setHasOpenedAi] = useState(false);
  useEffect(()=>{if(isAiAssistantOpen)setHasOpenedAi(true);},[isAiAssistantOpen]);

  // Global shortcut (Cmd+J / Ctrl+J) and reactive task updates listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAiAssistantOpen((prev) => !prev);
      }
    };
    const handleTasksUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TaskItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setTasks(customEvent.detail);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('sanctra_tasks_updated', handleTasksUpdated);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('sanctra_tasks_updated', handleTasksUpdated);
    };
  }, []);

  // Dedicated Sign Out handler
  const performSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Sign out error:', e);
    }
    await handleUserChange(null);
    setIsSettingsModalOpen(false);
    setIsAuthModalOpen(false);
    setIsSignOutConfirmOpen(false);
  };
  const requestSignOut=()=>setIsSignOutConfirmOpen(true);

  // Unified sidebar toggle: desktop collapse / mobile open-close
  const handleToggleSidebar = () => {
    // On mobile (< lg), toggle the mobile drawer
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      // On desktop, toggle the collapsed/expanded state
      handleToggleSidebarCollapse();
    }
  };

  // Open settings modal with optional initial tab (defaults to wallpaper)
  const openSettings = (tab?: 'wallpaper' | 'preferences' | 'danger') => {
    setSettingsInitialTab(tab || 'wallpaper');
    setIsSettingsModalOpen(true);
  };

  const pendingSessionSavesRef = useRef(new Map<string, StudySession>());

  // Cloud Sync helper
  const triggerCloudSync = useCallback(
    async (overrideData?: {
      sessions?: StudySession[];
      subjects?: Subject[];
      tasks?: TaskItem[];
      settings?: UserSettings;
    }) => {
      if (!currentUser?.uid || hydratedUidRef.current !== currentUser.uid) return;
      setIsSyncingCloud(true);
      const syncingSessions = overrideData ? overrideData.sessions || [] : dataRef.current.sessions;
      try {
        await syncUserDataToFirestore(currentUser.uid, {
          ...(overrideData || {
            sessions:dataRef.current.sessions,subjects:dataRef.current.subjects,
            tasks:dataRef.current.tasks,settings:settingsRef.current,
          }),
        });
        confirmSessionSaves(currentUser.uid, syncingSessions);
        for (const session of syncingSessions) {
          if (pendingSessionSavesRef.current.get(session.id) === session) pendingSessionSavesRef.current.delete(session.id);
        }
      } catch {
        setCloudSyncError('Cloud sync failed. Changes remain on this device.');
      } finally {
        setTimeout(() => setIsSyncingCloud(false), 500);
      }
    },
    [currentUser, sessions, subjects, tasks, settings]
  );

  const dataRef = useRef({ sessions, subjects, tasks });
  dataRef.current = { sessions, subjects, tasks };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userInfoRef = useRef(currentUser);
  userInfoRef.current = currentUser;
  const cacheOwnerRef = useRef(localStorage.getItem('sanctra_data_owner_v1') || getStoredUser()?.uid || null);
  const loadingUidRef = useRef<string | null>(null);
  const hydratedUidRef = useRef<string | null>(null);
  const authRequestRef = useRef(0);
  const [cloudSyncError, setCloudSyncError] = useState('');
  const [accountReady, setAccountReady] = useState(false);

  const handleUserChange = useCallback(async (newUser: AuthUser | null) => {
    const previousUser = userInfoRef.current;
    if (newUser?.isAnonymous) newUser = null;
    setCurrentUser(newUser);
    if (!newUser?.uid) {
      pendingSessionSavesRef.current.clear();
      authRequestRef.current++;
      loadingUidRef.current = null;
      hydratedUidRef.current = null;

      const ownerId = previousUser?.uid || cacheOwnerRef.current;
      if (ownerId) {
        try {
          const currentDraft = getTimerDraft();
          persistAccountCache(ownerId, dataRef.current, currentDraft, settingsRef.current);
        } catch (e) {
          console.error('Failed to persist account cache on logout:', e);
        }
      }

      purgeSharedDeviceState();

      setSessions([]);
      setSubjects(DEFAULT_SUBJECTS);
      setTasks([]);
      setSettings({ ...DEFAULT_USER_SETTINGS });
      setJeeFocusTag(undefined);setJeeAIInstructions('');
      dataRef.current = { sessions: [], subjects: DEFAULT_SUBJECTS, tasks: [] };

      clearTimerDraft();
      currentSessionIdRef.current = null;
    localOnlySessionRef.current = false;
      setActiveSessionRemote(null);
      setMode('countup');
      setStatus('idle');
      setTargetSeconds(0);
      setBreakSeconds(0);
      setDisplaySeconds(0);
      accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
      runningSinceRef.current = null;
      sessionStartTimeRef.current = Date.now();
      setIsPomodoroCompleteOpen(false);
      setIsSaveModalOpen(false);

      cacheOwnerRef.current = null;
      setCurrentUser(null);
      setAccountReady(false);
      setCloudSyncError('');
      return;
    }
    if (loadingUidRef.current === newUser.uid) return;
    loadingUidRef.current = newUser.uid;
    setAccountReady(false);
    hydratedUidRef.current = null;
    const request = ++authRequestRef.current;
    setIsSyncingCloud(true);
    setCloudSyncError('');
    let local = cacheOwnerRef.current === newUser.uid ? dataRef.current : { sessions: [], subjects: DEFAULT_SUBJECTS, tasks: [] };
    try {
      if (cacheOwnerRef.current) localStorage.setItem(`sanctra_account_data_${cacheOwnerRef.current}`, JSON.stringify(dataRef.current));
      const stored = localStorage.getItem(`sanctra_account_data_${newUser.uid}`);
      if (stored) local = resolveAccountData(local, JSON.parse(stored));
    } catch { /* Keep the legacy cache intact if storage is unavailable. */ }
    const localSettings = cacheOwnerRef.current === newUser.uid || localStorage.getItem(getSettingsStorageKey(newUser.uid))
      ? getUserSettings(newUser.uid) : { ...DEFAULT_USER_SETTINGS };
    if (cacheOwnerRef.current !== newUser.uid) {
      pendingSessionSavesRef.current.clear();
      try {
        const previousDraft = getTimerDraft();
        if (cacheOwnerRef.current && previousDraft) localStorage.setItem(`sanctra_account_timer_${cacheOwnerRef.current}`,JSON.stringify(previousDraft));
        const raw = localStorage.getItem(`sanctra_account_timer_${newUser.uid}`);
        const draft: TimerDraft | null = raw ? JSON.parse(raw) : null;
        const restored = draft ? restoreTimerDraft(draft, Date.now()) : null;
        setJeeFocusTag(normalizeJeeFocusTag(draft?.jee));
        setSessionStrictMode(draft?.strictMode === true); strictAutoPausedRef.current = false;
        setMode(draft?.mode || 'countup'); setStatus(restored?.status || 'idle');
        setTargetSeconds(draft?.targetSeconds || 0); setBreakSeconds(draft?.breakSeconds || 0);
        setActivePomodoroConfig(normalizePomodoroConfig(draft?.pomodoroConfig||localSettings.pomodoroConfig||POMODORO_PRESETS[draft?.mode==='pomodoro-50'?1:draft?.mode==='pomodoro-90'?2:0]));
        setPomodoroCompletedSessions(Math.max(0,Math.floor(draft?.pomodoroCompletedSessions||0)));
        setDisplaySeconds(restored?.displaySeconds || 0);
        currentSessionIdRef.current = restored?.sessionId || null;
        localOnlySessionRef.current = draft?.localOnly === true;
        accumulatedSecondsRef.current = restored?.elapsedSeconds || 0; sessionRankingCappedRef.current = draft?.rankingCapped === true;
        runningSinceRef.current = restored?.runningSince || null;
        focusEndedAtRef.current=restored?.focusEndedAt??null;
        sessionStartTimeRef.current = restored?.sessionStartTime || Date.now();
        sessionWorkspaceRef.current = draft?.workspaceId || activeWorkspace(localSettings).id;
        setIsPomodoroCompleteOpen(restored?.status === 'break-ready');
        setIsSaveModalOpen(false);

        if (draft && (draft.status === 'running' || draft.status === 'paused')) {
          const db = getCloudDatabase();
          if (db) {
            void getDoc(doc(db, 'activeSessions', newUser.uid)).then((activeSnap) => {
              if (activeSnap.exists()) {
                const activeData = activeSnap.data() as ActiveSession;
                if (activeData.deviceId !== getDeviceId()) {
                  setStatus('idle');
                  accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
                  runningSinceRef.current = null;
                  currentSessionIdRef.current = null;
    localOnlySessionRef.current = false;
                  clearTimerDraft();
                  setDisplaySeconds(draft.mode === 'countup' ? 0 : (draft.targetSeconds || 0));
                }
              }
            });
          }
        }
      } catch { setCloudSyncError('Timer draft could not be loaded. The existing draft has been preserved.'); }
    }
    try {
      const remote = await loadUserDataFromFirestore(newUser.uid);
      if (request !== authRequestRef.current) return;
      const savedOutbox = readSessionOutbox(newUser.uid);
      const deletedIds = (remote as (typeof remote & {deletedSessionIds?:string[]}))?.deletedSessionIds || [];
      const recoverable = savedOutbox.filter(session=>!deletedIds.includes(session.id));
      pendingSessionSavesRef.current = new Map(recoverable.map(session=>[session.id,session]));
      const accountData = resolveAccountData(local, remote);
      accountData.sessions = mergeStudyRecords(local.sessions, [...recoverable,...local.sessions.filter(s=>!recoverable.some(p=>p.id===s.id))], accountData.sessions, recoverable);
      const remoteSettings = remote?.settings;
      // A selection made while cloud hydration was pending must remain the newest preference.
      const latestLocal = getUserSettings(newUser.uid);
      const currentLocal = (latestLocal.updatedAt || 0) > (localSettings.updatedAt || 0) ? latestLocal : localSettings;
      let mergedSettings = resolveHydratedSettings(currentLocal,remoteSettings);
      const resolved = accountData;
      setSessions(resolved.sessions); persistSessions(resolved.sessions);
      setSubjects(resolved.subjects); persistSubjects(resolved.subjects);
      setTasks(resolved.tasks); persistTasks(resolved.tasks);
      if(mergedSettings.workspaces?.length)mergedSettings=workspaceSettings(mergedSettings,activeWorkspace(mergedSettings));
      mergedSettings.activeWallpaperId = resolveWallpaperId(mergedSettings.activeWallpaperId || localSettings.activeWallpaperId);
      setSettings(mergedSettings); persistUserSettings(mergedSettings, newUser.uid);
      cacheOwnerRef.current = newUser.uid;
      localStorage.setItem('sanctra_data_owner_v1',newUser.uid);
      setAccountReady(true);
      dataRef.current = resolved;
      hydratedUidRef.current = newUser.uid;
      if (!remote || recoverable.length || (currentLocal.updatedAt || 0) > (remoteSettings?.updatedAt || 0)) {
        await syncUserDataToFirestore(newUser.uid, { ...resolved, settings: mergedSettings });
        confirmSessionSaves(newUser.uid,recoverable);
        for(const session of recoverable)if(pendingSessionSavesRef.current.get(session.id)===session)pendingSessionSavesRef.current.delete(session.id);
      }
    } catch {
      if (request === authRequestRef.current) {
        loadingUidRef.current = null;
        setCloudSyncError('Cloud data could not be loaded. Your saved data is safe; reconnect before making changes.');
      }
    } finally { if (request === authRequestRef.current) setIsSyncingCloud(false); }
  }, []);

  useEffect(() => {
    if (currentUser?.uid && hydratedUidRef.current === currentUser.uid) {
      try { localStorage.setItem(`sanctra_account_data_${currentUser.uid}`, JSON.stringify({sessions,subjects,tasks})); } catch { /* Existing legacy storage remains available. */ }
    }
  }, [currentUser?.uid, sessions, subjects, tasks]);

  useEffect(() => {
    const retrySavedHistory = () => {
      if (currentUser?.uid && hydratedUidRef.current === currentUser.uid && pendingSessionSavesRef.current.size) {
        void triggerCloudSync({sessions:dataRef.current.sessions,subjects:dataRef.current.subjects});
      }
    };
    window.addEventListener('online',retrySavedHistory);
    return () => window.removeEventListener('online',retrySavedHistory);
  },[currentUser?.uid,triggerCloudSync]);

  useEffect(() => {
    const uid=currentUser?.uid;
    const db=getCloudDatabase();
    if(!accountReady||!uid||hydratedUidRef.current!==uid||!db)return;
    let previous=dataRef.current;
    let pendingAtSubscription=[...pendingSessionSavesRef.current.values()];
    return subscribeStudyRecords(db,uid,remote=>{
      if(hydratedUidRef.current!==uid||userInfoRef.current?.uid!==uid)return;
      const local=dataRef.current;
      const merged=reconcileStudyRecords(previous,local,remote,[...pendingAtSubscription,...pendingSessionSavesRef.current.values()]);
      pendingAtSubscription=[];
      previous={...previous,...remote};
      dataRef.current=merged;
      if(JSON.stringify(merged.sessions)!==JSON.stringify(local.sessions)){setSessions(merged.sessions);persistSessions(merged.sessions);}
      if(JSON.stringify(merged.subjects)!==JSON.stringify(local.subjects)){setSubjects(merged.subjects);persistSubjects(merged.subjects);}
      if(JSON.stringify(merged.tasks)!==JSON.stringify(local.tasks)){setTasks(merged.tasks);persistTasks(merged.tasks);}
    },()=>{if(hydratedUidRef.current===uid)setCloudSyncError('Live study updates are unavailable. Your local records are preserved; reconnect to sync.');});
  },[currentUser?.uid,accountReady]);

  // Source of Truth: Listen to Firebase Auth state & resolve startup gate without landing page flash
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(
      (user) => {
        if (user) {
          setCurrentUser(user);
          setCurrentView((prev) => (prev === 'landing' ? 'timer' : prev));
          handleUserChange(user);
        } else {
          if (userInfoRef.current) {
            handleUserChange(null);
          } else {
            setCurrentUser(null);
          }
        }
      },
      () => {
        // Startup auth resolution complete
        setIsAuthResolving(false);
      }
    );
    return () => unsubscribe();
  }, [handleUserChange]);

  // Play subtle synthesized audio chime upon timer completion
  const playCompletionChime = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {
      // Audio autoplay permission guard
    }
  }, []);

  // Main precision timer loop
  useEffect(() => {
    if (status !== 'running' && status !== 'break-running') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const currentRunSegment = runningSinceRef.current
        ? Math.floor((now - runningSinceRef.current) / 1000)
        : 0;

      const totalActiveSeconds = accumulatedSecondsRef.current + currentRunSegment;

      if (status === 'running') {
        if (focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).capped) sessionRankingCappedRef.current = true;
        if (mode === 'countup') {
          setDisplaySeconds(totalActiveSeconds);
        } else {
          const remaining = Math.max(0, targetSeconds - totalActiveSeconds);
          setDisplaySeconds(remaining);

          if (remaining <= 0) {
            // Record the deadline before clearing the running segment. Save may happen much later.
            focusEndedAtRef.current=focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).endTime;
            accumulatedSecondsRef.current = targetSeconds;
            runningSinceRef.current = null;

            if (settings.soundAlertsEnabled !== false) playCompletionChime();

            if (isPomodoroMode(mode)) {
              const completed=pomodoroCompletedSessions+1;
              setPomodoroCompletedSessions(completed);
              setBreakSeconds(pomodoroBreakSeconds(activePomodoroConfig,completed));
              setStatus('break-ready');
              setIsPomodoroCompleteOpen(true);
            } else {
              setStatus('idle');
              setIsSaveModalOpen(true);
            }
          }
        }
      } else if (status === 'break-running') {
        const remainingBreak = Math.max(0, breakSeconds - totalActiveSeconds);
        setDisplaySeconds(remainingBreak);

        if (remainingBreak <= 0) {
          // Break finished
          if (settings.soundAlertsEnabled !== false) playCompletionChime();
          setStatus('break-complete');
          accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
          runningSinceRef.current = null;
          setDisplaySeconds(0);
        }
      }

    }, 250);

    return () => clearInterval(interval);
  }, [status, mode, targetSeconds, breakSeconds, settings.activeSubjectId, settings.soundAlertsEnabled, playCompletionChime, activePomodoroConfig, pomodoroCompletedSessions]);

  // Persist transitions immediately, including pauses and completed focus blocks.
  useEffect(() => {
    saveTimerDraft({ focusEndedAt:focusEndedAtRef.current, localOnly:localOnlySessionRef.current, ...(currentSessionIdRef.current ? {sessionId:currentSessionIdRef.current} : {}), rankingCapped: sessionRankingCappedRef.current, workspaceId: sessionWorkspaceRef.current, version: 2, sessionStartTime: sessionStartTimeRef.current, mode, status, strictMode: sessionStrictMode,
      accumulatedSeconds: accumulatedSecondsRef.current, runningSince: runningSinceRef.current,
      targetSeconds, breakSeconds, pomodoroConfig:activePomodoroConfig, pomodoroCompletedSessions, subjectId: settings.activeSubjectId, ...(jeeFocusTag?{jee:jeeFocusTag}:{}), lastUpdated: Date.now() });
  }, [mode, status, displaySeconds, targetSeconds, breakSeconds, settings.activeSubjectId, activePomodoroConfig, pomodoroCompletedSessions, sessionStrictMode,jeeFocusTag]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Handle remote session ended (e.g. taken over by another device)
  const handleRemoteSessionEnded = useCallback(() => {
    setStatus('idle');
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
    runningSinceRef.current = null;
    currentSessionIdRef.current = null;
    localOnlySessionRef.current = false;
    clearTimerDraft();

    if (modeRef.current === 'countup') {
      setDisplaySeconds(0);
    } else {
      setDisplaySeconds(targetSecondsRef.current);
    }

    if (flushIntegrityRef.current) {
      void flushIntegrityRef.current('idle');
    }

    // Saved history is observed by subscribeStudyRecords independently of the
    // timer state. Avoid an overlapping one-shot read replacing newer updates.

  }, [currentUser?.uid]);

  // Listen to active session doc in real time (one active session per account)
  useEffect(() => {
    if (!currentUser?.uid || currentUser.uid.startsWith('guest-')) {
      setActiveSessionRemote(null);
      return;
    }
    const db = getCloudDatabase();
    if (!db) return;

    const myDeviceId = getDeviceId();

    const unsubscribe = listenActiveSession(
      db,
      currentUser.uid,
      (remoteSession) => {
        setActiveSessionRemote(remoteSession);
        if(localOnlySessionRef.current)return;

        if (remoteSession) {
          const mirrored = mirrorFocusSession(remoteSession,currentSessionIdRef.current,myDeviceId);
          if (mirrored) {
            currentSessionIdRef.current=mirrored.sessionId;
            sessionStartTimeRef.current=mirrored.startTime;
            sessionWorkspaceRef.current=remoteSession.workspaceId || space.id;
            accumulatedSecondsRef.current=mirrored.accumulatedSeconds;
            runningSinceRef.current=mirrored.runningSince;
            setMode(mirrored.mode);
            setTargetSeconds(mirrored.targetSeconds);
            setDisplaySeconds(mirrored.displaySeconds);
            setStatus(mirrored.status);
            if(remoteSession.subjectId)setSettings(previous=>({...previous,activeSubjectId:remoteSession.subjectId}));
            return;
          }
          // If remote session belongs to another device or has different sessionId:
          if (
            remoteSession.deviceId !== myDeviceId ||
            (currentSessionIdRef.current && remoteSession.sessionId !== currentSessionIdRef.current)
          ) {
            if (statusRef.current !== 'idle') {
              handleRemoteSessionEnded();
            }
          }
        } else {
          // Document was deleted remotely (e.g. ended/saved on another device)
          if (statusRef.current !== 'idle' && currentSessionIdRef.current) {
            handleRemoteSessionEnded();
          }
        }
      },
      (err) => {
        console.warn('Active session sync error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, handleRemoteSessionEnded]);

  // Periodically send heartbeat to active session document while running
  useEffect(() => {
    if (status !== 'running' && status !== 'break-running') return;
    if (!currentUser?.uid || currentUser.uid.startsWith('guest-')) return;
    const db = getCloudDatabase();
    if (!db) return;

    const interval = setInterval(() => {
      void heartbeatActiveSession(db, currentUser.uid, {
        sessionId: currentSessionIdRef.current || undefined,
        rankingCapped: sessionRankingCappedRef.current,
        accumulatedSeconds: accumulatedSecondsRef.current,
        runningSince: runningSinceRef.current,
        status,
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [status, currentUser?.uid]);

  // Handle reconnect to ensure elapsed time is never lost or double counted
  useEffect(() => {
    const handleOnline = async () => {
      if (!currentUser?.uid || currentUser.uid.startsWith('guest-')) return;
      const db = getCloudDatabase();
      if (!db) return;

      try {
        if(localOnlySessionRef.current&&currentSessionIdRef.current&&['running','paused'].includes(statusRef.current)){
          const sessionId=currentSessionIdRef.current;
          const selected=dataRef.current.subjects.find(s=>s.id===settingsRef.current.activeSubjectId);
          const result=await recoverActiveSession(db,currentUser.uid,{uid:currentUser.uid,deviceId:getDeviceId(),sessionId,startTime:sessionStartTimeRef.current,runningSince:runningSinceRef.current,accumulatedSeconds:accumulatedSecondsRef.current,mode:modeRef.current,targetSeconds:targetSecondsRef.current,breakSeconds:breakSeconds,status:statusRef.current,strictMode:sessionStrictMode,workspaceId:sessionWorkspaceRef.current,...(jeeFocusTag?{jee:jeeFocusTag}:{}),date:getLocalDateString(new Date(sessionStartTimeRef.current)),...(selected?{subjectId:selected.id,subjectName:selected.name,subjectColor:selected.color}:{})});
          if(userInfoRef.current?.uid!==currentUser.uid)return;
          if(result.success){
            if(currentSessionIdRef.current!==sessionId){void deleteActiveSession(db,currentUser.uid,getDeviceId(),sessionId);return;}
            localOnlySessionRef.current=false;
          }else if(result.conflict)setActiveSessionRemote(result.conflict);
          return;
        }
        const snap = await getDoc(doc(db, 'activeSessions', currentUser.uid));
        const myDeviceId = getDeviceId();
        if (snap.exists()) {
          const active = snap.data() as ActiveSession;
          if (active.deviceId==='mac' && active.sessionId===currentSessionIdRef.current) return;
          if (
            active.deviceId !== myDeviceId ||
            (currentSessionIdRef.current && active.sessionId !== currentSessionIdRef.current)
          ) {
            // Another device took over while we were offline
            if (statusRef.current !== 'idle') {
              handleRemoteSessionEnded();
            }
          } else {
            // Still our session: sync offline elapsed time to activeSessions
            if (statusRef.current === 'running' || statusRef.current === 'paused') {
              await heartbeatActiveSession(db, currentUser.uid, {
                accumulatedSeconds: accumulatedSecondsRef.current,
                runningSince: runningSinceRef.current,
                status: statusRef.current,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to verify active session on reconnect:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentUser?.uid, handleRemoteSessionEnded, breakSeconds, sessionStrictMode, jeeFocusTag]);

  // Take over remote session from another device
  const handleConfirmTakeOver = async () => {
    if (!currentUser?.uid || currentUser.uid.startsWith('guest-')) return;
    const db = getCloudDatabase();
    if (!db) return;
    const offlineElapsed=accumulatedSecondsRef.current+(runningSinceRef.current?Math.max(0,Math.floor((Date.now()-runningSinceRef.current)/1000)):0);
    if(localOnlySessionRef.current&&offlineElapsed>0){setIsTakeOverModalOpen(false);setIsSaveModalOpen(true);setCloudSyncError('Save your offline focus before taking over another timer.');return;}

    setIsTakingOver(true);
    try {
      const now = Date.now();
      const newSessionId = `sess-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const matchedSubject = subjects.find((s) => s.id === settings.activeSubjectId);

      const historyBeforeTakeover = dataRef.current.sessions;
      const pendingBeforeTakeover = [...pendingSessionSavesRef.current.values()];
      const res = await takeOverActiveSession(db, currentUser.uid, getDeviceId(), {
        sessionId: newSessionId,
        startTime: now,
        runningSince: now,
        accumulatedSeconds: 0,
        mode,
        targetSeconds,
        breakSeconds,
        status: 'running',
        strictMode: settings.strictMode === true,
        workspaceId: space.id,
        workspaceName: space.name,
        subjectId: settings.activeSubjectId,
        subjectName: matchedSubject?.name,
        subjectColor: matchedSubject?.color,
        ...(jeeFocusTag?{jee:jeeFocusTag}:{}),
        notes: focusedTask ? `Task: ${focusedTask.text}` : '',
        date: getLocalDateString(new Date(now)),
      });

      if(userInfoRef.current?.uid!==currentUser.uid)return;
      if (res.success) {
        localOnlySessionRef.current=false;
        if (res.savedSession && res.updatedSessions) {
          const merged = mergeStudyRecords(historyBeforeTakeover, dataRef.current.sessions, res.updatedSessions, [...pendingBeforeTakeover,...pendingSessionSavesRef.current.values()]);
          dataRef.current = {...dataRef.current, sessions:merged};
          setSessions(merged);
          persistSessions(merged);
        }
        setSessionStrictMode(settings.strictMode === true);
        strictAutoPausedRef.current = false;
        currentSessionIdRef.current = newSessionId;
        focusEndedAtRef.current=null;
        sessionStartTimeRef.current = now;
        sessionWorkspaceRef.current = space.id;
        runningSinceRef.current = now;
        accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
        setStatus('running');

        if (mode === 'countup') {
          setDisplaySeconds(0);
        } else {
          setDisplaySeconds(targetSeconds);
        }
        setIsTakeOverModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to take over active session:', err);
      setCloudSyncError('Could not take over the remote session. Please check your connection and try again.');
    } finally {
      setIsTakingOver(false);
    }
  };

  // Toggle Start / Pause
  const handleToggleStart = useCallback(async () => {
    const now = Date.now();

    if (status === 'idle' && accumulatedSecondsRef.current > 0) { setIsSaveModalOpen(true); return; }
    if (status === 'idle' || status === 'break-complete') {
      const myDeviceId = getDeviceId();
      const db = getCloudDatabase();

      // Check if remote active session is currently running on another device
      if (
        currentUser?.uid &&
        !currentUser.uid.startsWith('guest-') &&
        activeSessionRemote &&
        activeSessionRemote.deviceId !== myDeviceId && activeSessionRemote.sessionId !== currentSessionIdRef.current
      ) {
        setIsTakeOverModalOpen(true);
        return;
      }

      const newSessionId = `sess-${now}-${Math.random().toString(36).substring(2, 7)}`;
      let localOnly=false;

      // Attempt atomic start via transaction to prevent race conditions with another device
      if (currentUser?.uid && !currentUser.uid.startsWith('guest-') && db) {
        const matchedSubject = subjects.find((s) => s.id === settings.activeSubjectId);
        try {
          const res = await startActiveSession(db, currentUser.uid, {
            uid: currentUser.uid,
            deviceId: myDeviceId,
            sessionId: newSessionId,
            startTime: now,
            runningSince: now,
            accumulatedSeconds: 0,
            mode,
            targetSeconds,
            breakSeconds,
            status: 'running',
            strictMode: settings.strictMode === true,
            workspaceId: space.id,
            workspaceName: space.name,
            subjectId: settings.activeSubjectId,
            subjectName: matchedSubject?.name,
            subjectColor: matchedSubject?.color,
            ...(jeeFocusTag?{jee:jeeFocusTag}:{}),
        notes: focusedTask ? `Task: ${focusedTask.text}` : '',
            date: getLocalDateString(new Date(now)),
          });

          if(userInfoRef.current?.uid!==currentUser.uid)return;
          if (!res.success && res.conflict) {
            setActiveSessionRemote(res.conflict);
            setIsTakeOverModalOpen(true);
            return;
          }
        } catch (err) {
          if(userInfoRef.current?.uid!==currentUser.uid)return;
          localOnly=true;
          console.warn('Could not start active session in cloud; continuing locally:', err);
        }
      }

      localOnlySessionRef.current=localOnly;
      setSessionStrictMode(settings.strictMode === true);
      strictAutoPausedRef.current = false;
      currentSessionIdRef.current = newSessionId;
      focusEndedAtRef.current=null;
      sessionStartTimeRef.current = now;
      sessionWorkspaceRef.current = space.id;
      runningSinceRef.current = now;
      accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
      setStatus('running');

      if (mode === 'countup') {
        setDisplaySeconds(0);
      } else {
        setDisplaySeconds(targetSeconds);
      }
    } else if (status === 'running') {
      strictAutoPausedRef.current = false;
      // Pause
      focusEndedAtRef.current=focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).endTime;
      const newAccum = focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).seconds;
      accumulatedSecondsRef.current = newAccum;
      runningSinceRef.current = null;
      setStatus('paused');

      if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
        const db = getCloudDatabase();
        if (db) {
          void updateActiveSession(db, currentUser.uid, {
            status: 'paused',
            sessionId: currentSessionIdRef.current || undefined,
            accumulatedSeconds: newAccum,
            runningSince: null,
          });
        }
      }
    } else if (status === 'paused') {
      strictAutoPausedRef.current = false;
      // Check if remote active session was taken over while paused
      const myDeviceId = getDeviceId();
      if (
        currentUser?.uid &&
        !currentUser.uid.startsWith('guest-') &&
        activeSessionRemote &&
        activeSessionRemote.deviceId !== myDeviceId && activeSessionRemote.sessionId !== currentSessionIdRef.current
      ) {
        setIsTakeOverModalOpen(true);
        return;
      }

      // Resume
      runningSinceRef.current = now;
      setStatus('running');

      if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
        const db = getCloudDatabase();
        if (db) {
          void updateActiveSession(db, currentUser.uid, {
            status: 'running',
            sessionId: currentSessionIdRef.current || undefined,
            runningSince: now,
          });
        }
      }
    } else if (status === 'break-running') {
      // Pause break
      const elapsedSegment = runningSinceRef.current
        ? Math.floor((now - runningSinceRef.current) / 1000)
        : 0;
      const newAccum = accumulatedSecondsRef.current + elapsedSegment;
      accumulatedSecondsRef.current = newAccum;
      runningSinceRef.current = null;
      setStatus('break-paused');

      if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
        const db = getCloudDatabase();
        if (db) {
          void updateActiveSession(db, currentUser.uid, {
            status: 'break-paused',
            accumulatedSeconds: newAccum,
            runningSince: null,
          });
        }
      }
    } else if (status === 'break-paused') {
      runningSinceRef.current = now;
      setStatus('break-running');

      if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
        const db = getCloudDatabase();
        if (db) {
          void updateActiveSession(db, currentUser.uid, {
            status: 'break-running',
            runningSince: now,
          });
        }
      }
    }
  }, [status, mode, targetSeconds, breakSeconds, space.id, space.name, settings.activeSubjectId, subjects, focusedTask, currentUser?.uid, activeSessionRemote, settings.strictMode]);

  // Only foreground-paused study sessions resume automatically. Breaks and manual pauses stay unchanged.
  useEffect(() => {
    const updateForeground = (event?: Event) => {
      const foreground = event?.type !== 'pagehide' && document.visibilityState === 'visible' && document.hasFocus();
      const action = strictFocusAction(sessionStrictMode, strictStatusRef.current, foreground, strictAutoPausedRef.current);
      if (!action) return;
      const now = Date.now();
      if (action === 'pause') {
        focusEndedAtRef.current=focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).endTime;
        accumulatedSecondsRef.current = focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,now).seconds;
        runningSinceRef.current = null;
        strictAutoPausedRef.current = true;
        strictStatusRef.current = 'paused';
        setStatus('paused');
        saveTimerDraft({ focusEndedAt:focusEndedAtRef.current, localOnly:localOnlySessionRef.current, ...(currentSessionIdRef.current ? {sessionId:currentSessionIdRef.current} : {}), rankingCapped: sessionRankingCappedRef.current, workspaceId: sessionWorkspaceRef.current, version: 2, sessionStartTime: sessionStartTimeRef.current, mode, status: 'paused', strictMode: true, accumulatedSeconds: accumulatedSecondsRef.current, runningSince: null, targetSeconds, breakSeconds, pomodoroConfig: activePomodoroConfig, pomodoroCompletedSessions, subjectId: settings.activeSubjectId, ...(jeeFocusTag?{jee:jeeFocusTag}:{}), lastUpdated: now });
        void flushIntegrityRef.current('paused');
      } else {
        strictAutoPausedRef.current = false;
        runningSinceRef.current = now;
        strictStatusRef.current = 'running';
        setStatus('running');
        void flushIntegrityRef.current('running');
      }
      const db = getCloudDatabase();
      if (db && currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
        void updateActiveSession(db, currentUser.uid, {
          status: action === 'pause' ? 'paused' : 'running',
          sessionId: currentSessionIdRef.current || undefined,
          accumulatedSeconds: accumulatedSecondsRef.current,
          runningSince: runningSinceRef.current,
        });
      }
    };
    window.addEventListener('pagehide', updateForeground);
    window.addEventListener('blur', updateForeground);
    window.addEventListener('focus', updateForeground);
    document.addEventListener('visibilitychange', updateForeground);
    updateForeground();
    return () => {
      window.removeEventListener('pagehide', updateForeground);
      window.removeEventListener('blur', updateForeground);
      window.removeEventListener('focus', updateForeground);
      document.removeEventListener('visibilitychange', updateForeground);
    };
  }, [sessionStrictMode, status, currentUser?.uid, mode, targetSeconds, breakSeconds, activePomodoroConfig, pomodoroCompletedSessions, settings.activeSubjectId]);

  // Handle Mode Change
  const handleSelectMode = (newMode: TimerMode, customDurationMinutes?: number, pomodoroConfig?:PomodoroConfig) => {
    const elapsed = accumulatedSecondsRef.current + (runningSinceRef.current ? Math.max(0, Math.floor((Date.now()-runningSinceRef.current)/1000)) : 0);
    if (hasUnsavedFocus(status,elapsed)) {
      setPendingMode({mode:newMode,minutes:customDurationMinutes,pomodoroConfig});
      setIsResetModalOpen(true);
      return false;
    }
    if(isPomodoroMode(newMode)){
      const config=normalizePomodoroConfig(pomodoroConfig||(newMode==='pomodoro-custom'?settings.pomodoroConfig:undefined)||POMODORO_PRESETS[newMode==='pomodoro-50'?1:newMode==='pomodoro-90'?2:0]);
      setActivePomodoroConfig(config);setPomodoroCompletedSessions(0);
      handleUpdateSettings({pomodoroConfig:config});
    }
    setMode(newMode);
    setStatus('idle');
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
    runningSinceRef.current = null;

    let target = 0;
    let brk = 0;

    switch (newMode) {
      case 'pomodoro-25':
      case 'pomodoro-50':
      case 'pomodoro-90':
      case 'pomodoro-custom': {
        const config=normalizePomodoroConfig(pomodoroConfig||(newMode==='pomodoro-custom'?settings.pomodoroConfig:undefined)||POMODORO_PRESETS[newMode==='pomodoro-50'?1:newMode==='pomodoro-90'?2:0]);
        target=config.focusMinutes*60;brk=config.shortBreakMinutes*60;
        break;
      }
      case 'countdown-60':
        target = 60 * 60;
        break;
      case 'countdown-120':
        target = 120 * 60;
        break;
      case 'custom':
        target = (customDurationMinutes || 30) * 60;
        break;
      case 'countup':
      default:
        target = 0;
        break;
    }

    setTargetSeconds(target);
    setBreakSeconds(brk);
    setDisplaySeconds(target);
    clearTimerDraft();
    return true;
  };

  // Reset Timer
  const handleConfirmReset = () => {
    if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
      const db = getCloudDatabase();
      if (db) {
        void deleteActiveSession(db, currentUser.uid, activeSessionRemote?.sessionId === currentSessionIdRef.current ? activeSessionRemote.deviceId : getDeviceId(), currentSessionIdRef.current || undefined);
      }
    }
    currentSessionIdRef.current = null;
    localOnlySessionRef.current = false;
    setStatus('idle');
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
    runningSinceRef.current = null;
    clearTimerDraft();

    if (mode === 'countup') {
      setDisplaySeconds(0);
    } else {
      setDisplaySeconds(targetSeconds);
    }
    if (pendingMode) {
      setPendingMode(null);
      handleSelectMode(pendingMode.mode,pendingMode.minutes,pendingMode.pomodoroConfig);
    }
  };

  // Save Session from timer dial
  const handleSaveSession = (subjectId: string | undefined, notes: string, questions?:number, suggestedTag?:JeeSessionTag|null) => {
    const timing=focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,Date.now(),focusEndedAtRef.current);
    const studiedSeconds=timing.seconds;

    if (studiedSeconds <= 0) return false;

    const sessionTag=normalizeJeeFocusTag(suggestedTag===undefined?jeeFocusTag:suggestedTag);
    if(sessionTag&&!jeeStore.state.syllabus[sessionTag.subject].some(c=>c.id===sessionTag.chapterId)){setCloudSyncError('This chapter is no longer available. Select another chapter before saving.');return false;}
    let matchedSubject=subjects.find(s=>s.id===subjectId);
    let nextSubjects=subjects;
    if(sessionTag){const label={physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[sessionTag.subject];matchedSubject=subjects.find(s=>(s.workspaceId||legacySpaceId)===sessionWorkspaceRef.current&&(s.name.toLowerCase()===label.toLowerCase()||sessionTag.subject==='maths'&&s.name.toLowerCase()==='maths'));if(!matchedSubject){matchedSubject={id:crypto.randomUUID(),workspaceId:sessionWorkspaceRef.current,name:label,color:{physics:'#b8dcf5',chemistry:'#f2c3cc',maths:'#f3dba7'}[sessionTag.subject],createdAt:Date.now()};nextSubjects=[...subjects,matchedSubject];}}


    const newSession: StudySession = {
      id: currentSessionIdRef.current || `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: sessionWorkspaceRef.current,
      workspaceName: spaces.find(s=>s.id===sessionWorkspaceRef.current)?.name || space.name,
      subjectId: matchedSubject?.id,
      subjectName: matchedSubject?.name,
      subjectColor: matchedSubject?.color,
      startTime: sessionStartTimeRef.current,
      endTime: timing.endTime,
      durationSeconds: studiedSeconds,
      strictMode: sessionStrictMode,
      rankingDurationSeconds: studiedSeconds,
      rankingCapped: studiedSeconds>10800 && (sessionRankingCappedRef.current || timing.capped),
      mode,
      ...(sessionTag?{jee:normalizeJeeFocusTag({...sessionTag,...(sessionTag.kind==='practice'&&questions!==undefined?{questions}:{})})}:{}),
      notes: [focusedTask ? `Task: ${focusedTask.text}` : '', notes].filter(Boolean).join('\n'),
      date: getLocalDateString(new Date(sessionStartTimeRef.current)),
    };

    try {
      persistSessionWithRetry(currentUser?.uid&&!currentUser.uid.startsWith('guest-')?currentUser.uid:null,newSession);
    } catch {
      setCloudSyncError('This device could not save the session. Your timer has been kept; free some browser storage and try again.');
      return false;
    }
    if(nextSubjects!==subjects){setSubjects(nextSubjects);persistSubjects(nextSubjects);}
    pendingSessionSavesRef.current.set(newSession.id, newSession);
    const updatedSessions = [newSession, ...dataRef.current.sessions.filter(session=>session.id!==newSession.id)];
    dataRef.current = {...dataRef.current, sessions: updatedSessions, subjects: nextSubjects};
    setSessions(updatedSessions);
    triggerCloudSync({ sessions: updatedSessions,subjects:nextSubjects });

    // Flush running integrity stretch to server before reset to avoid tail loss (Bug 14)
    if (status === 'running') {
      void flushIntegrityRef.current('idle');
    }

    // Reset clears this exact active session once, after its history is staged.
    handleConfirmReset();
    return true;
  };

  // Save or edit manual session from Analytics or history
  const handleSaveManualSession = (session: StudySession) => {
    const originalSession = sessions.find(s=>s.id===session.id);
    session = {...session, rankingDurationSeconds: session.source === 'ai-manual' ? 0 : originalSession?.rankingDurationSeconds ?? originalSession?.durationSeconds, workspaceId: session.workspaceId || space.id, workspaceName: session.workspaceName || space.name};
    let nextSubjects=subjects;
    if(session.jee){const tag=normalizeJeeFocusTag(session.jee);if(!tag||!jeeStore.state.syllabus[tag.subject].some(c=>c.id===tag.chapterId))return Promise.reject(new Error('Select an available JEE chapter.'));const label={physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[tag.subject];let subject=subjects.find(s=>(s.workspaceId||legacySpaceId)===session.workspaceId&&(s.name.toLowerCase()===label.toLowerCase()||tag.subject==='maths'&&s.name.toLowerCase()==='maths'));if(!subject){subject={id:crypto.randomUUID(),workspaceId:session.workspaceId,name:label,color:{physics:'#b8dcf5',chemistry:'#f2c3cc',maths:'#f3dba7'}[tag.subject],createdAt:Date.now()};nextSubjects=[...subjects,subject];persistSubjects(nextSubjects);setSubjects(nextSubjects);}session={...session,jee:tag,subjectId:subject.id,subjectName:subject.name,subjectColor:subject.color};}
    const exists = sessions.some((s) => s.id === session.id);
    let updatedSessions: StudySession[];

    if (exists) {
      persistSessionWithRetry(currentUser?.uid&&!currentUser.uid.startsWith('guest-')?currentUser.uid:null,session,true);
      updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
    } else {
      persistSessionWithRetry(currentUser?.uid&&!currentUser.uid.startsWith('guest-')?currentUser.uid:null,session);
      updatedSessions = [session, ...sessions];
    }

    pendingSessionSavesRef.current.set(session.id, session);
    dataRef.current = {...dataRef.current, sessions: updatedSessions, subjects: nextSubjects};
    setSessions(updatedSessions);
    const cloudSave = triggerCloudSync({ sessions: updatedSessions,subjects:nextSubjects });
    setIsManualModalOpen(false);
    setEditingSession(null);
    return cloudSave;
  };

  // Delete session
  const deletingSessions = useRef(new Set<string>());
  const handleDeleteSession = async (id: string) => {
    const session=sessions.find(s=>s.id===id);
    if(!session||deletingSessions.current.has(id))return;
    deletingSessions.current.add(id);
    try {
      if(currentUser && !currentUser.uid.startsWith('guest-')) await deleteRankedSession(currentUser.uid,session);
    } catch {
      setCloudSyncError('The session was kept because its ranking could not be updated. Reconnect and try deleting it again.');
      return;
    } finally {deletingSessions.current.delete(id);}
    if(currentUser?.uid)writeSessionOutbox(currentUser.uid,readSessionOutbox(currentUser.uid).filter(s=>s.id!==id));
    pendingSessionSavesRef.current.delete(id);
    removeSession(id);
    const updatedSessions = getSessions();
    dataRef.current = {...dataRef.current, sessions: updatedSessions};
    setSessions(updatedSessions);
    triggerCloudSync({ sessions: updatedSessions });
  };

  // Take Pomodoro Break
  const handleTakeBreak = () => {
    if (!handleSaveSession(settings.activeSubjectId, '')) return;
    setIsPomodoroCompleteOpen(false);
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
    runningSinceRef.current = Date.now();
    setStatus('break-running');
    setDisplaySeconds(breakSeconds);

    if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
      const db = getCloudDatabase();
      if (db) {
        void updateActiveSession(db, currentUser.uid, {
          status: 'break-running',
          breakSeconds,
          runningSince: Date.now(),
          accumulatedSeconds: 0,
        });
      }
    }
  };

  // Update Settings
  const handleUpdateSettings = (partial: Partial<UserSettings>, syncSubjects?: Subject[]) => {
    const preferenceKeys = ['activeSubjectId','dailyGoalHours','weeklyTargetHours','rankingOptIn'] as const;
    const spacePatch = Object.fromEntries(preferenceKeys.filter(key=>key in partial).map(key=>[key,partial[key]]));
    const updated = {
      ...settingsRef.current,
      ...partial,
      ...(!partial.workspaces && Object.keys(spacePatch).length ? {workspaces: spaces.map(item=>item.id===space.id?{...item,...spacePatch}:item), legacyWorkspaceId:legacySpaceId, activeWorkspaceId:space.id} : {}),
      ...(['activeWallpaperId','customWallpaperUrl','plusMotionWallpaperUrl'].some(key=>key in partial) ? { appearanceChosen: true } : {}),
      updatedAt: Date.now(),
    };
    if(!persistUserSettings(updated,currentUser?.uid)){setCloudSyncError('This device could not save your settings. Your current background has been kept; free some browser storage and try again.');return false;}
    setSettings(updated);
    settingsRef.current = updated;
    if(partial.statusMessage !== undefined && currentUser){localStorage.setItem(`sanctra_status_${currentUser.uid}`,partial.statusMessage);window.dispatchEvent(new Event('sanctra-status'));}
    if (currentUser?.uid) triggerCloudSync({settings:updated,...(syncSubjects ? {subjects:syncSubjects}: {})});
    return true;
  };

  // Danger Zone: Reset all study history & timers
  const handleResetStudyTimes = () => {
    if (currentUser?.uid && !currentUser.uid.startsWith('guest-')) {
      const db = getCloudDatabase();
      if (db) {
        void deleteActiveSession(db, currentUser.uid, getDeviceId());
      }
    }
    currentSessionIdRef.current = null;
    localOnlySessionRef.current = false;
    clearAllSessions();
    setSessions([]);
    clearTimerDraft();
    setDisplaySeconds(0);
    setStatus('idle');
    runningSinceRef.current = null;
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false;
    if (currentUser?.uid) {
      triggerCloudSync({ sessions: [] });
    }
  };

  // Subject Actions
  const handleAddSubject = (name: string, color: string) => {
    const newSub: Subject = {
      workspaceId:space.id,
      id: `sub-${Date.now()}`,
      name,
      color,
      createdAt: Date.now(),
    };
    const updated = [...subjects, newSub];
    setSubjects(updated);
    persistSubjects(updated);
    triggerCloudSync({ subjects: updated });
    if (!settings.activeSubjectId) {
      handleUpdateSettings({ activeSubjectId: newSub.id });
    }
  };

  const handleDeleteSubject = (id: string) => {
    if(jeeFocusTag&&id===settings.activeSubjectId){setCloudSyncError('Switch the JEE chapter before deleting its active subject.');return;}
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    persistSubjects(updated);
    triggerCloudSync({ subjects: updated });
    if (settings.activeSubjectId === id) {
      handleUpdateSettings({ activeSubjectId: updated.find(item=>belongsToWorkspace(item,space.id,legacySpaceId))?.id });
    }
  };

  // Task Actions for Planner
  const handleAddTask = (
    text: string,
    category: 'today' | 'backlog' | 'unscheduled',
    subjectId?: string,
    dueDate?: string,
    startTime?: string,
    endTime?: string,
    jee?:JeeSessionTag,
    completeJeeChapter?:boolean
  ) => {
    const newTask: TaskItem = {
      workspaceId:space.id,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text,
      completed: false,
      dueDate: dueDate || getLocalDateString(),
      ...(startTime && endTime ? { startTime, endTime } : {}),
      category,
      subjectId,
      createdAt: Date.now(),
      ...(jee?{jee,completeJeeChapter}:{}),
    };
    const updatedTasks = [newTask, ...tasks];
    handleUpdateSharedTasks(updatedTasks);
  };

  const handleUpdateTask = (id: string, patch: Partial<TaskItem>) => {
    const updated = tasks.map(task => task.id === id ? { ...task, ...patch, id: task.id } : task);
    handleUpdateSharedTasks(updated);
  };
  const handleFocusTask = (task: TaskItem) => {
    const now = Date.now();
    const duration = taskFocusSeconds(task, new Date(now));
    if (duration === 0) { setCloudSyncError('This task’s time slot has ended. Edit its schedule before starting it.'); return; }
    if (focusedTaskId === task.id && status === 'running') { handleSelectView('timer'); return; }
    const existingFocus = accumulatedSecondsRef.current + (runningSinceRef.current ? Math.floor((now-runningSinceRef.current)/1000) : 0);
    if (existingFocus > 0 && !handleSaveSession(settings.activeSubjectId, 'Saved before switching to a scheduled task.')) return;
    const taskTag=settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled?taskJeeTag(task,jeeStore.state,subjects):undefined;
    let focusSubject=task.subjectId;
    if(taskTag){const label={physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[taskTag.subject];let selected=spaceSubjects.find(s=>s.name.toLowerCase()===label.toLowerCase()||taskTag.subject==='maths'&&s.name.toLowerCase()==='maths');if(!selected){selected={id:crypto.randomUUID(),workspaceId:space.id,name:label,color:{physics:'#b8dcf5',chemistry:'#f2c3cc',maths:'#f3dba7'}[taskTag.subject],createdAt:Date.now()};const next=[...subjects,selected];setSubjects(next);persistSubjects(next);triggerCloudSync({subjects:next});}focusSubject=selected.id;}

    setJeeFocusTag(taskTag);
    setFocusedTaskId(task.id);
    handleUpdateSettings({ activeSubjectId: focusSubject || undefined, subjectTrackingEnabled: !!focusSubject });
    setMode(duration === null ? 'countup' : 'custom');
    setTargetSeconds(duration || 0); setDisplaySeconds(duration || 0); setBreakSeconds(0);
    accumulatedSecondsRef.current = 0; sessionRankingCappedRef.current = false; sessionStartTimeRef.current = now; sessionWorkspaceRef.current = space.id; runningSinceRef.current = null;
    setStatus('idle'); handleSelectView('timer');
  };

  const handleToggleTask = (id: string) => {
    handleUpdateSharedTasks(tasks.map(t=>t.id===id?{...t,completed:!t.completed}:t));
  };

  const handleDeleteTask = (id: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);
    persistTasks(updatedTasks);
    triggerCloudSync({ tasks: updatedTasks });
  };

  const hasViewParam = typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('view'));
  const previewUser = useMemo<AuthUser>(() => ({
    uid: 'preview-scholar',
    email: 'scholar@sanctra.app',
    displayName: 'Alex Rivers',
    photoURL: '',
    isAnonymous: false,
  }), []);

  const activeUser = currentUser || (hasViewParam ? previewUser : null);

  // Calculated Stats
  const [platformConfig,setPlatformConfig]=useState(DEFAULT_PLATFORM_CONFIG);
  useEffect(()=>watchPlatformConfig(setPlatformConfig),[]);
  const [platformNow,setPlatformNow]=useState(Date.now());
  useEffect(()=>{const tick=setInterval(()=>setPlatformNow(Date.now()),15000);return()=>clearInterval(tick);},[]);
  const [platformAdmin,setPlatformAdmin]=useState(false);
  useEffect(()=>{setPlatformAdmin(false);return currentUser&&!currentUser.isAnonymous?subscribeAdmin(currentUser.uid,setPlatformAdmin):undefined;},[currentUser?.uid]);
  const maintenanceInfo = resolveFeaturePause(platformConfig,currentView);
  const jeeStore=useJeeTrackStore(settings.jeeTrackOptIn!==false&&platformConfig.jeeTrackEnabled&&activeUser?activeUser.uid:null);
  const [jeeInitialTab,setJeeInitialTab]=useState<JeeTrackSubTab>('overview');
  const handleUpdateSharedTasks=(next:TaskItem[])=>{
    let nextSubjects=subjects;
    const normalized=next.map(task=>{
      const tag=normalizeJeeFocusTag(task.jee);if(!tag)return task;
      const label={physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[tag.subject];
      let found=nextSubjects.find(s=>(s.workspaceId||legacySpaceId)===(task.workspaceId||space.id)&&(s.name.toLowerCase()===label.toLowerCase()||tag.subject==='maths'&&s.name.toLowerCase()==='maths'));
      if(!found){found={id:crypto.randomUUID(),workspaceId:task.workspaceId||space.id,name:label,color:{physics:'#b8dcf5',chemistry:'#f2c3cc',maths:'#f3dba7'}[tag.subject],createdAt:Date.now()};nextSubjects=[...nextSubjects,found];}
      return {...task,jee:tag,subjectId:found.id};
    });
    if(nextSubjects!==subjects){setSubjects(nextSubjects);persistSubjects(nextSubjects);triggerCloudSync({subjects:nextSubjects});}
    const scoped=normalized.map(task=>({...task,...(!tasks.some(old=>old.id===task.id)&&!task.workspaceId?{workspaceId:space.id}:{}),...(!tasks.find(old=>old.id===task.id)?.completed&&task.completed?{completedAt:Date.now()}: {})}));
    const completed=scoped.filter(t=>t.completed&&!tasks.find(old=>old.id===t.id)?.completed&&t.completeJeeChapter);
    if(completed.length && settings.jeeTrackOptIn && !jeeStore.loading)jeeStore.update(s=>completed.reduce(completeJeeTask,s));
    setTasks(scoped);persistTasks(scoped);triggerCloudSync({tasks:scoped});
  };
  const jeeAIContext=useMemo(()=>settings.jeeTrackOptIn!==false&&platformConfig.jeeTrackEnabled&&!jeeStore.loading?buildJeeAIContext(jeeStore.state,sessions,tasks):undefined,[settings.jeeTrackOptIn,platformConfig.jeeTrackEnabled,jeeStore.loading,jeeStore.state,sessions,tasks]);
  useEffect(()=>{if(settings.jeeTrackOptIn===false&&status==='idle')setJeeFocusTag(undefined);},[settings.jeeTrackOptIn,status]);
  const chooseJeeFocus=(tag:JeeSessionTag|undefined)=>{
    const elapsed=accumulatedSecondsRef.current+(runningSinceRef.current?Math.floor((Date.now()-runningSinceRef.current)/1000):0);
    if(elapsed>0||status!=='idle'){setCloudSyncError('Save or reset the current session before changing its JEE chapter.');return;}
    if(tag){
      const label={physics:'Physics',chemistry:'Chemistry',maths:'Mathematics'}[tag.subject];
      const existing=spaceSubjects.find(subject=>subject.name.toLowerCase()===label.toLowerCase()||tag.subject==='maths'&&subject.name.toLowerCase()==='maths');
      const subject=existing||{id:`jee-${tag.subject}-${Date.now()}`,name:label,color:{physics:'#b8dcf5',chemistry:'#f2c3cc',maths:'#f3dba7'}[tag.subject],createdAt:Date.now()};
      const next=existing?subjects:[...subjects,{...subject,workspaceId:space.id}];
      if(!existing){setSubjects(next);persistSubjects(next);}
      handleUpdateSettings({activeSubjectId:subject.id,subjectTrackingEnabled:true},next);
    }
    setJeeFocusTag(tag);handleSelectView('timer');
  };

  const streakInfo = calculateStreak(sessions);
  const todaySeconds = getTodaySeconds(spaceSessions);
  const thisWeekSeconds = getThisWeekSeconds(spaceSessions);
  const [restriction,setRestriction]=useState<Restriction|null>(null);
  const [restrictionNow,setRestrictionNow]=useState(Date.now());
  useEffect(()=>{setRestriction(null);if(isAuthResolving||!currentUser||currentUser.uid.startsWith('guest-'))return;const off=subscribeRestriction(currentUser.uid,setRestriction),presence=trackPlatformUser({...currentUser,displayName:settings.customDisplayName||currentUser.displayName,photoURL:settings.avatarUrl??currentUser.photoURL}),tick=window.setInterval(()=>setRestrictionNow(Date.now()),1000);return()=>{off();presence();window.clearInterval(tick);};},[currentUser?.uid,isAuthResolving,settings.customDisplayName,settings.avatarUrl]);
  const appearanceSettings = settings;
  const activeSubject = spaceSubjects.find((s) => s.id === settings.activeSubjectId);

  const visibleWallpaperId = (!currentUser && !new URLSearchParams(window.location.search).get('view')) || currentUser?.isAnonymous || isLandingForced ? landingWallpaperId : appearanceSettings.activeWallpaperId;
  useEffect(() => {
    const palette = THEME_PALETTES[getThemeName(visibleWallpaperId)];
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.style.setProperty('--sanctra-boot-ink', palette.ink);
    root.style.setProperty('--sanctra-ink', palette.ink);
    root.style.setProperty('--sanctra-surface', palette.surface);
    root.style.setProperty('--sanctra-sage', palette.accent);
    root.style.setProperty('--sanctra-muted', palette.muted);
    syncBrowserChrome(palette.ink, document);
  }, [visibleWallpaperId]);

  // Exact studied time for Save Session modal
  const currentStudiedSeconds = focusSnapshot(mode,targetSeconds,accumulatedSecondsRef.current,runningSinceRef.current,Date.now(),focusEndedAtRef.current).seconds;

  const communityUser = useMemo(()=>activeUser ? {...activeUser,displayName:settings.customDisplayName||activeUser.displayName,photoURL:subscription?.isPlus && settings.plusAnimatedAvatarUrl ? settings.plusAnimatedAvatarUrl : settings.avatarUrl??activeUser.photoURL} : null,[activeUser,settings.customDisplayName,settings.avatarUrl,settings.plusAnimatedAvatarUrl,subscription?.isPlus]);
  useCompetitivePresence(accountReady ? communityUser : null, settings, sessions, status, activeSubject?.name || '', streakInfo.currentStreak,subscription);
  useGroupPresence(accountReady ? communityUser : null, sessions, status, activeSubject?.name || '', streakInfo.currentStreak, currentStudiedSeconds, sessionStartTimeRef.current || 0,settings,subscription);
  const { error: verificationError, flushIntegrity, capped: rankingCapped } = useStudyIntegrity(accountReady?communityUser:null,status,currentStudiedSeconds,sessionStartTimeRef.current||0);
  flushIntegrityRef.current = flushIntegrity;
  useEffect(()=>{if(rankingCapped) sessionRankingCappedRef.current=true;},[rankingCapped]);

  // Only block the saved account while authentication is actually resolving.
  if (currentUser && !isLandingForced && (isAuthResolving || (!subscriptionReady && (WALLPAPER_PRESETS.find(p=>p.id===appearanceSettings.activeWallpaperId)?.isPlusOnly || appearanceSettings.plusMotionWallpaperUrl)))) return <LoadingScreen wallpaperId={appearanceSettings.activeWallpaperId} settings={appearanceSettings} />;

  if(currentUser && isRestricted(restriction,restrictionNow))return <div className="sanctra-app min-h-dvh grid place-items-center p-6"><section className="analytics-card p-8 max-w-lg space-y-4"><h1>Account access restricted</h1><p className="whitespace-pre-wrap break-words">{restriction?.reason}</p><p>{restriction?.permanent?'This restriction is permanent.':`Access resumes ${new Date(restriction!.expiresAt).toLocaleString()}.`}</p><p className="text-sm text-slate-300">Your saved records have not been deleted.</p><button className="analytics-button" onClick={()=>void performSignOut()}>Sign out</button></section></div>;

  // CORE RULE: Logged-out landing page ONLY renders when no user is authenticated (or ?landing=true is requested)

  if(isSitePaused(platformConfig,platformNow)&&!platformAdmin){
    return <div className="site-pause-screen"><Brand/><h1>A little pause.</h1><p>{platformConfig.maintenanceMessage||'Sanctra is temporarily paused. Your study history is safe and existing normal-mode timers continue on the server.'}</p>{platformConfig.maintenanceEta&&<p className="site-pause-eta">Expected return: {platformConfig.maintenanceEta}</p>}<div><button className="analytics-button" onClick={()=>window.location.reload()}>Check status</button><button className="analytics-button" onClick={()=>setIsAuthModalOpen(true)}>Admin sign-in</button></div><AuthModal isOpen={isAuthModalOpen} currentUser={currentUser} initialMode="signin" activeWallpaperId={appearanceSettings.activeWallpaperId} onUserChange={handleUserChange} onClose={()=>setIsAuthModalOpen(false)}/></div>;
  }
  if (!activeUser || activeUser.isAnonymous || isLandingForced) {
    const landingPalette = THEME_PALETTES[getThemeName(landingWallpaperId)];
    return (
      <div
        style={{
          "--sanctra-ink": landingPalette.ink,
          "--sanctra-surface": landingPalette.surface,
          "--sanctra-sage": landingPalette.accent,
          "--sanctra-muted": landingPalette.muted,
        } as React.CSSProperties}
        className="relative min-h-screen bg-slate-950 text-slate-100"
      >
        <React.Suspense fallback={<LoadingScreen wallpaperId={appearanceSettings.activeWallpaperId} />}>
          <LandingView
            activeWallpaperId={landingWallpaperId}
            onAtmosphereChange={setLandingWallpaperId}
            onOpenGroups={() => {
              handleSelectView('groups');
              if (currentUser) exitLandingPreview();
              else { setAuthModalMode('signin'); setIsAuthModalOpen(true); }
            }}
            onStartStudying={() => {
              if (currentUser && !currentUser.isAnonymous) { exitLandingPreview(); handleSelectView('timer'); }
              else { setAuthModalMode('signin'); setIsAuthModalOpen(true); }
            }}
            onOpenAuth={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
          />
        </React.Suspense>

        <AuthModal
          isOpen={isAuthModalOpen}
          currentUser={null}
          initialMode={authModalMode}
          activeWallpaperId={landingWallpaperId}
          onUserChange={async user => { exitLandingPreview(); await handleUserChange(user); }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <SoundscapeProvider
      userSettings={settings}
      onUpdateSettings={handleUpdateSettings}
      timerStatus={status}
      subscription={subscription}
      onOpenYouTube={() => setIsYouTubeModalOpen(true)}
      onOpenPlusEnquiry={() => { setSupportInitialCategory('premium'); handleSelectView('support'); }}
    >
      <div id="sanctra-root" style={{ "--sanctra-panel-blur": `${Math.max(0,Math.min(24,Number.isFinite(settings.uiGlassBlur)?settings.uiGlassBlur!:12))}px`, "--sanctra-ink": THEME_PALETTES[getThemeName(appearanceSettings.activeWallpaperId)].ink, "--sanctra-surface": THEME_PALETTES[getThemeName(appearanceSettings.activeWallpaperId)].surface, "--sanctra-sage": THEME_PALETTES[getThemeName(appearanceSettings.activeWallpaperId)].accent, "--sanctra-muted": THEME_PALETTES[getThemeName(appearanceSettings.activeWallpaperId)].muted } as React.CSSProperties} className={`sanctra-app relative h-dvh flex text-slate-100 overflow-hidden ${timerOnly && currentView === 'timer' ? 'timer-only' : ''}`}>
      {activeUser&&!activeUser.isAnonymous&&<AdminTicketAlert user={activeUser} onOpen={()=>handleSelectView('admin')}/>}
      {/* 1. Full-screen Scenic Background */}
      <ScenicWallpaper settings={subscription?.isPlus ? appearanceSettings : {...appearanceSettings,plusMotionWallpaperEnabled:false,plusMotionWallpaperUrl:undefined,activeWallpaperId:WALLPAPER_PRESETS.find(p=>p.id===appearanceSettings.activeWallpaperId)?.isPlusOnly ? DEFAULT_USER_SETTINGS.activeWallpaperId : appearanceSettings.activeWallpaperId}} />

      {/* 2. Minimizable Collapsible Glass Sidebar */}
      {!(timerOnly && currentView === 'timer') && <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        isCollapsed={isSidebarCollapsed}
        jeeTrackEnabled={platformConfig.jeeTrackEnabled}
        currentUser={activeUser}
        userSettings={settings}
        subscription={subscription}
        onOpenAuth={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => handleSelectView('profile')}
        onOpenSettings={openSettings}
        onOpenSupport={() => handleSelectView('support')}
        onSignOut={requestSignOut}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />}

      {/* 3. Main Stage Content Column (Header + View Body + Footer) */}
      <div className={`flex-1 min-w-0 min-h-0 flex flex-col h-full z-10 ${currentView === 'timer' ? 'timer-stage overflow-hidden' : 'app-scroll-stage overflow-y-auto'}`}>
        {/* Top Navigation Header */}
        {!(timerOnly && currentView === 'timer') && <Header
          userSettings={settings}
          onUpdateSettings={handleUpdateSettings}
          currentView={currentView}
          onSelectView={handleSelectView}
          status={status}
          isSidebarCollapsed={isNarrowScreen ? !isMobileSidebarOpen : isSidebarCollapsed}
          subscription={subscription}
          onToggleSidebar={handleToggleSidebar}
          onEnterTimerOnly={()=>setTimerOnly(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenYouTube={() => setIsYouTubeModalOpen(true)}
          onOpenPlusEnquiry={() => { setSupportInitialCategory('premium'); handleSelectView('support'); }}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        />}

        {/* Main Stage Switcher */}
        {cloudSyncError && <div role="alert" className="mx-3 p-3 text-xs text-amber-200">{cloudSyncError} <button className="underline ml-2" onClick={() => handleUserChange(currentUser)}>Retry connection</button></div>}
        <main ref={screenMotionRef} inert={!accountReady} className={`flex-1 flex flex-col items-center w-full px-3 sm:px-6 py-2 sm:py-6 ${currentView === 'timer' ? 'timer-content min-h-0 justify-center' : 'app-page-content justify-start'}`}>
          {currentView==='timer' && sessionStrictMode && status !== 'idle' && <p role="status" className="workspace-note">Strict Mode · {status === 'paused' && strictAutoPausedRef.current ? 'Paused while you are away' : 'Only foreground study time counts'}</p>}
          {rankingCapped&&currentView==='timer'&&<p role="status" className="workspace-note integrity-connection">Ranking credit capped at 3 hours for this uninterrupted stretch. Your full study time is still saved. Pause before starting a fresh stretch.</p>}
          {verificationError&&currentView==='timer'&&<p role="status" className="workspace-note integrity-connection">{verificationError}</p>}
          {platformConfig.notice && (!platformConfig.noticeEndsAt||platformConfig.noticeEndsAt>platformNow) && !(timerOnly && currentView === 'timer') && (
            <div
              role="status"
              className="platform-notice"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="platform-notice-dot" aria-hidden="true"/>
                <span className="platform-notice-text">{platformConfig.notice}</span>
              </div>
              {platformConfig.maintenanceEta && (
                <span className="text-[11px] opacity-80 shrink-0 font-sans">ETA: {platformConfig.maintenanceEta}</span>
              )}
            </div>
          )}

          {maintenanceInfo.isMaintenance && (
            <MaintenanceView
              featureTitle={maintenanceInfo.title}
              customMessage={currentView === 'jeetrack' && !platformConfig.maintenanceMode ? 'JEE Track is temporarily paused for maintenance. Your other study tools remain available.' : platformConfig.maintenanceMessage}
              eta={currentView === 'jeetrack' && !platformConfig.maintenanceMode ? '' : platformConfig.maintenanceEta}
              noticeType={platformConfig.noticeType}
              onBackToTimer={() => handleSelectView('timer')}
              onRefreshStatus={() => window.location.reload()}
            />
          )}
          {currentView === 'timer' && (
            <>
              {timerOnly && <><CenteredHiddenMusicBar /><LocalClock /></>}
              <div className={timerOnly ? 'focus-workspace minimal' : 'focus-workspace'}>
              {!timerOnly && <aside className="focus-context" aria-label="Focus overview">
              <div className="focus-task-context">
                <CurrentTaskBar
                  tasks={spaceTasks}
                  subjects={spaceSubjects}
                  focusedTask={focusedTask && !focusedTask.completed ? focusedTask : null}
                  onFocus={handleFocusTask}
                  onStopFocus={() => setFocusedTaskId(null)}
                  onComplete={(id) => {
                    handleToggleTask(id);
                    if (focusedTaskId === id) {
                      setFocusedTaskId(null);
                    }
                  }}
                />
              </div>
              {/* 4 Metric Overview Cards */}
              <MetricCards
                subjects={spaceSubjects}
                categoryLabel="Subjects"
                subjectTrackingEnabled={settings.subjectTrackingEnabled}
                todaySeconds={todaySeconds}
                dailyGoalHours={settings.dailyGoalHours}
                streakDays={streakInfo.currentStreak}
                thisWeekSeconds={thisWeekSeconds}
                onOpenSubjects={() => setIsSubjectModalOpen(true)}
                onOpenGoalModal={() => setIsGoalModalOpen(true)}
                onOpenStreakHelp={() => setIsStreakHelpOpen(true)}
              />

              <QuoteBanner />
              </aside>}
              {/* Circular Focus Clock Dial */}
              <TimerDial
                minimal={timerOnly}
                onToggleMinimal={()=>setTimerOnly(value=>!value)}
                seconds={displaySeconds}
                totalTargetSeconds={status.startsWith('break-') ? breakSeconds : targetSeconds}
                mode={mode}
                status={status}
                isFullscreen={isFullscreen}
                activeSubject={activeSubject} subjectDetail={jeeFocusTag?`${jeeStore.state.syllabus[jeeFocusTag.subject].find(c=>c.id===jeeFocusTag.chapterId)?.name||'JEE chapter'} · ${jeeFocusTag.kind==='mockAnalysis'?'Mock analysis':jeeFocusTag.kind}`:undefined}
                subjectTrackingEnabled={settings.subjectTrackingEnabled}
                onOpenSubjects={() => setIsSubjectModalOpen(true)}
                onToggleStart={handleToggleStart}
                onRequestReset={() => { setPendingMode(null); setIsResetModalOpen(true); }}
                canSave={!status.startsWith('break-') || status === 'break-ready' ? accumulatedSecondsRef.current > 0 || status === 'running' : false}
                onRequestSave={() => setIsSaveModalOpen(true)}
                onToggleFullscreen={handleToggleFullscreen}
                onOpenModeModal={() => setIsModeModalOpen(true)}
              />
              </div>
            </>
          )}

          {!maintenanceInfo.isMaintenance && (
            <React.Suspense
              fallback={
                <div className="workspace-page workspace-panel flex items-center justify-center p-12 text-slate-400">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--sanctra-sage) 30%, transparent)',
                        borderTopColor: 'var(--sanctra-sage)',
                      }}
                    />
                    <span className="text-sm font-medium tracking-wide">Opening sanctuary view...</span>
                  </div>
                </div>
              }
            >
              {settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled&&currentView==='rankings'&&<div className="workspace-panel mb-4 flex flex-wrap items-center gap-3"><span>Your JEE focus streak · {jeeStudyStreak(sessions)} days</span><small>At least 1h of saved chapter focus per day · personal preparation record</small><button className="analytics-button" onClick={()=>{setJeeInitialTab('overview');handleSelectView('jeetrack');}}>Open JEE Track</button></div>}
              {currentView === 'groups' && platformConfig.groupsEnabled && <LiveGroupsView user={communityUser!} settings={settings} initialRoomId={initialRoomId} subscription={subscription} onOpenAuth={()=>setIsAuthModalOpen(true)} onFocus={()=>handleSelectView('timer')}/>}

              {currentView === 'analytics' && (
                <AnalyticsView
                  sessions={[...sessions,...(settings.jeeTrackOptIn?jeeManualSessions(jeeStore.state,subjects):[])]}
                  jeeSyllabus={settings.jeeTrackOptIn?jeeStore.state.syllabus:undefined} jeeTests={settings.jeeTrackOptIn?jeeStore.state.tests:undefined} onOpenJeeHours={()=>{setJeeInitialTab('hours');handleSelectView('jeetrack');}}
                  subjects={subjects}
                  settings={appearanceSettings}
                  onOpenGoalModal={() => setIsGoalModalOpen(true)}
                  onOpenManualModal={(sess) => {
                    setEditingSession(sess || null);
                    setIsManualModalOpen(true);
                  }}
                  onDeleteSession={handleDeleteSession}
                />
              )}

              {currentView === 'jeetrack' && !maintenanceInfo.isMaintenance && (settings.jeeTrackOptIn !== false && activeUser ? <JeeTrackView store={jeeStore} onFocusTask={handleFocusTask} user={activeUser} plus={!!subscription?.isPlus} sessions={sessions} subjects={subjects} tasks={spaceTasks} onUpdateTasks={next=>handleUpdateSharedTasks([...tasks.filter(t=>!spaceTasks.some(s=>s.id===t.id)),...next])} initialTab={jeeInitialTab} dailyGoalHours={settings.dailyGoalHours} onOpenSharedGoals={()=>setIsGoalModalOpen(true)} onOpenAnalytics={()=>handleSelectView('analytics')} onStartFocus={(subject,chapterId,kind)=>chooseJeeFocus({subject,chapterId,kind})} onDisable={()=>{handleUpdateSettings({jeeTrackOptIn:false});handleSelectView('timer');}} onReviewPlan={instructions=>{setJeeAIInstructions(instructions);setIsAiAssistantOpen(true);}}/> : <section className="workspace-panel jee-opt-in"><span className="jee-opt-in-eyebrow">Optional preparation workspace</span><h1>Preparing for JEE?</h1><p>Bring chapter practice, mocks and revision into your existing Sanctra planner, calendar and study history.</p><ul><li>Plan chapter tasks with Sanctra AI.</li><li>Study first, then suggest a chapter from your session notes.</li><li>Keep your mocks, practice and progress together.</li></ul><button type="button" className="workspace-primary" disabled={!platformConfig.jeeTrackEnabled} onClick={()=>handleUpdateSettings({jeeTrackOptIn:true})}>Enable JEE Track</button><small>You can turn it off anytime. Your records stay saved.</small></section>)}

              {currentView === 'profile' && <ProfileView user={activeUser} settings={settings} sessions={sessions} subscription={subscription} onUpdate={handleUpdateSettings} onNavigate={handleSelectView} onAuth={()=>{setAuthModalMode('signin');setIsAuthModalOpen(true);}} onSignOut={requestSignOut}/>}
              {currentView === 'support' && <SupportView user={communityUser!} enabled={platformConfig.supportEnabled} subscription={subscription} initialCategory={supportInitialCategory} onConnect={()=>setIsAuthModalOpen(true)}/>}
              {currentView === 'admin' && <AdminView user={communityUser!}/>}
              {currentView === 'rankings' && platformConfig.rankingsEnabled && <RankingsView user={activeUser} settings={settings} subscription={subscription} onProfile={()=>handleSelectView('profile')}/>}
              {currentView === 'inbox' && <InboxView jeeReminders={settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled?jeeReminders(jeeStore.state,tasks,subjects):[]} onOpenJee={section=>{setJeeInitialTab(section);handleSelectView('jeetrack');}} key={activeUser.uid} user={activeUser} plus={!!subscription?.isPlus} onOpenGroup={id=>{setInitialRoomId(id);setRoomNavigationRequest(value=>value+1);handleSelectView('groups');}} />}

              {currentView === 'calendar' && <CalendarView tasks={spaceTasks} subjects={spaceSubjects} events={[...calendar.events,...(settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled&&!jeeStore.loading?jeeCalendarEvents(jeeStore.state,space.id,settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone):[])]} onOpenJeeEntry={id=>{setJeeInitialTab(id.startsWith('jee.mock.')?'tests':'backlog');handleSelectView('jeetrack');}} workspaceId={space.id} legacySpaceId={legacySpaceId} timezone={settings.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone} ready={calendar.ready} error={calendar.error} onRetry={calendar.retry} onSaveTask={(id,draft)=>{if(id)handleUpdateTask(id,{text:draft.text,dueDate:draft.dueDate||'',startTime:draft.startTime,endTime:draft.endTime,subjectId:draft.subjectId,category:draft.dueDate?'today':'unscheduled'});else handleAddTask(draft.text,'today',draft.subjectId,draft.dueDate,draft.startTime,draft.endTime);}} onToggleTask={handleToggleTask} onFocusTask={id=>{const task=spaceTasks.find(t=>t.id===id);if(task)handleFocusTask(task);}} onSaveEvent={calendar.save} onDeleteEvent={calendar.remove} onUndoEvent={calendar.undo}/>}
              {currentView === 'planner' && (
                <PlannerView
                  jeeSyllabus={settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled?jeeStore.state.syllabus:undefined}
                  tasks={spaceTasks}
                  subjects={spaceSubjects}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onFocusTask={handleFocusTask}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                />
              )}
            </React.Suspense>
          )}
        </main>

        <footer className="shrink-0 w-full text-center py-3 text-[11px] text-slate-500">Sanctra · A little room to focus.</footer>
      </div>

      {/* Modals */}
      <TimerModeModal
        isOpen={isModeModalOpen}
        currentMode={mode}
        savedPomodoroConfig={settings.pomodoroConfig}
        onSelectMode={handleSelectMode}
        onClose={() => setIsModeModalOpen(false)}
      />


      <SubjectModal
        isOpen={isSubjectModalOpen}
        subjects={spaceSubjects}
        categoryLabel="Subjects"
        activeSubjectId={settings.activeSubjectId}
        trackingEnabled={settings.subjectTrackingEnabled}
        onToggleTracking={(enabled) => {if(currentStudiedSeconds>0){setCloudSyncError('Save or reset before changing session tracking.');return;}if(!enabled)setJeeFocusTag(undefined);handleUpdateSettings({ subjectTrackingEnabled: enabled });}}
        onSelectActiveSubject={(id) => {if(jeeFocusTag&&currentStudiedSeconds>0){setCloudSyncError('Save or reset before changing the subject of a JEE session.');return;}setJeeFocusTag(undefined);handleUpdateSettings({ activeSubjectId: id });}}
        onAddSubject={handleAddSubject}
        onDeleteSubject={handleDeleteSubject}
        onClose={() => setIsSubjectModalOpen(false)}
      >{settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled&&<JeeFocusPicker syllabus={jeeStore.state.syllabus} value={jeeFocusTag} disabled={status!=='idle'||currentStudiedSeconds>0||jeeStore.loading} onChange={chooseJeeFocus}/>}</SubjectModal>

      <SaveSessionModal
        isOpen={isSaveModalOpen}
        secondsStudied={currentStudiedSeconds}
        mode={mode}
        subjects={spaceSubjects}
        initialSubjectId={settings.activeSubjectId}
        initialJeeTag={jeeFocusTag} jeeSyllabus={settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled?jeeStore.state.syllabus:undefined}
        jeePractice={jeeFocusTag?.kind==='practice'}
        jeeLabel={jeeFocusTag ? jeeStore.state.syllabus[jeeFocusTag.subject].find(c=>c.id===jeeFocusTag.chapterId)?.name : undefined}
        onSaveSession={handleSaveSession}
        onClose={() => setIsSaveModalOpen(false)}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onConfirmReset={handleConfirmReset}
        onClose={() => {setIsResetModalOpen(false);setPendingMode(null);}}
      />

      <TakeOverModal
        isOpen={isTakeOverModalOpen}
        activeSession={activeSessionRemote}
        isTakingOver={isTakingOver}
        onTakeOver={handleConfirmTakeOver}
        onClose={() => setIsTakeOverModalOpen(false)}
      />

      <PomodoroCompleteModal
        isOpen={isPomodoroCompleteOpen}
        durationSeconds={targetSeconds}
        breakDurationMinutes={Math.round(breakSeconds / 60) || 5}
        onTakeBreak={handleTakeBreak}
        onSaveSession={() => {
          setIsPomodoroCompleteOpen(false);
          setIsSaveModalOpen(true);
        }}
      />

      <StreakHelpModal
        isOpen={isStreakHelpOpen}
        currentStreak={streakInfo.currentStreak}
        bestStreak={streakInfo.bestStreak}
        activeDays={streakInfo.activeDays}
        onClose={() => setIsStreakHelpOpen(false)}
      />

      <DailyGoalModal
        isOpen={isGoalModalOpen}
        currentGoalHours={settings.dailyGoalHours}
        onSaveGoal={(hours) => handleUpdateSettings({ dailyGoalHours: hours })}
        onClose={() => setIsGoalModalOpen(false)}
      />

      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        sessions={spaceSessions}
        onDeleteSession={handleDeleteSession}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        currentUser={currentUser}
        initialMode={authModalMode}
        activeWallpaperId={appearanceSettings.activeWallpaperId}
        onUserChange={handleUserChange}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ManualSessionModal
        jeeSyllabus={settings.jeeTrackOptIn&&platformConfig.jeeTrackEnabled?jeeStore.state.syllabus:undefined}
        isOpen={isManualModalOpen}
        editingSession={editingSession}
        subjects={spaceSubjects}
        onSaveSession={handleSaveManualSession}
        onDeleteSession={(id) => {
          handleDeleteSession(id);
          setIsManualModalOpen(false);
          setEditingSession(null);
        }}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingSession(null);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        currentUser={currentUser}
        settings={appearanceSettings}
        subscription={subscription}
        initialTab={settingsInitialTab}
        onUpdateSettings={handleUpdateSettings}
        onResetStudyTimes={handleResetStudyTimes}
        onOpenSupport={() => handleSelectView('support')}
        onOpenAuth={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
        onSignOut={performSignOut}
        onTriggerSync={() => {
          if (currentUser?.uid) {
            triggerCloudSync({
              sessions,
              subjects,
              tasks,
              settings,
            });
          }
        }}
        isSyncing={isSyncingCloud}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setSettingsInitialTab('wallpaper');
        }}
      />



      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
      />

      {(isAiAssistantOpen||hasOpenedAi)&&<React.Suspense fallback={null}><AiStudyAssistantModal
        jeeContext={jeeAIContext} initialInstructions={jeeAIInstructions}
        onSaveManualSession={handleSaveManualSession}
        key={`${currentUser?.uid}:${space.id}`}
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        plus={isEntitlementActive(subscription || null)}
        subjects={spaceSubjects} workspaceId={space.id} sessions={spaceSessions}
        plannerInput={{userId:currentUser?.uid || '',workspaceId:space.id,legacySpaceId,instructions:'',now:new Date(),includeTasks:false,allowDeletes:false,tasks,subjects}}
        onApplyPlan={(batch,ids)=>{
          const identity={userId:userInfoRef.current?.uid || '',workspaceId:space.id,legacySpaceId};
          const key=`${identity.userId}:${identity.workspaceId}`;
          const applied=plannerApplied.current.get(key) || new Set<string>();
          const missingLink=batch.proposals.some(p=>ids.includes(p.id)&&p.draft?.subjectId&&!dataRef.current.subjects.some(subject=>subject.id===p.draft!.subjectId));
          if(missingLink)return {ok:false,issues:[{code:'stale',message:'A linked subject changed. Generate a fresh plan.'}]};
          const result=applyPlannerBatch(dataRef.current.tasks,batch,ids,{identity,today:getLocalDateString(),now:Date.now(),alreadyAppliedIds:[...applied]});
          if(result.ok && result.receipt.changes.length){
            ids.forEach(id=>applied.add(id));plannerApplied.current.set(key,applied);
            dataRef.current.tasks=result.tasks;setTasks(result.tasks);persistTasks(result.tasks);triggerCloudSync({tasks:result.tasks});
          }
          return result;
        }}
        onUndoPlan={receipt=>{
          const identity={userId:userInfoRef.current?.uid || '',workspaceId:space.id,legacySpaceId};
          const result=undoPlannerBatch(dataRef.current.tasks,receipt,identity);
          if(result.revertedIds.length){
            const applied=plannerApplied.current.get(`${identity.userId}:${identity.workspaceId}`);result.revertedIds.forEach(id=>applied?.delete(id));
            dataRef.current.tasks=result.tasks;setTasks(result.tasks);persistTasks(result.tasks);triggerCloudSync({tasks:result.tasks});
          }
          return result;
        }}
        onOpenTasks={()=>{setIsAiAssistantOpen(false);handleSelectView('planner');}}
      /></React.Suspense>}

      {platformConfig.announcementPopupsEnabled&&<WhatsNewModal user={activeUser} plus={!!subscription?.isPlus}/>}
      {isSignOutConfirmOpen&&<div className="confirmation-overlay" role="presentation"><section className="signout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="signout-confirm-title"><p className="workspace-eyebrow">Account</p><h2 id="signout-confirm-title">Sign out of Sanctra?</h2><p>Your saved work remains connected to your account.</p><div><button className="analytics-button" onClick={()=>setIsSignOutConfirmOpen(false)}>Cancel</button><button className="workspace-primary signout-action" onClick={()=>void performSignOut()}>Sign out</button></div></section></div>}

    </div>
    </SoundscapeProvider>
  );
};

export default App;
