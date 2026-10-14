import {
  doc,
  runTransaction,
  deleteDoc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { StudySession, TimerMode, TimerStatus } from '../types/index.ts';
import { getLocalDateString } from './time.ts';

export interface ActiveSession {
  jee?: import('../types/index.ts').JeeSessionTag;
  strictMode?: boolean;
  uid: string;
  deviceId: string;
  sessionId: string;
  startTime: number;
  runningSince: number | null;
  rankingCapped?: boolean;
  accumulatedSeconds: number;
  mode: TimerMode;
  targetSeconds: number;
  breakSeconds: number;
  status: TimerStatus;
  workspaceId?: string;
  workspaceName?: string;
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  notes?: string;
  date?: string;
  lastHeartbeat: number;
  updatedAt: number;
}

const DEVICE_ID_KEY = 'sanctra_device_id_v1';
const VERIFIED_DEVICE_KEY = 'sanctra_verified_device';

/**
 * Returns a persistent, unique device identifier for this client.
 */
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY) || localStorage.getItem(VERIFIED_DEVICE_KEY);
    if (!deviceId) {
      deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      localStorage.setItem(VERIFIED_DEVICE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'default-device';
  }
}

/**
 * Subscribes to real-time updates for a user's active session document.
 */
export function listenActiveSession(
  db: Firestore,
  uid: string,
  onUpdate: (session: ActiveSession | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const sessionRef = doc(db, 'activeSessions', uid);
  return onSnapshot(
    sessionRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as ActiveSession);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Computes elapsed focus time for an active session at the given timestamp.
 */
export function calculateElapsedSeconds(session: ActiveSession, now = Date.now()): number {
  const isRunning = session.status === 'running' || session.status === 'break-running';
  const currentSegment = isRunning && session.runningSince
    ? Math.max(0, Math.floor((now - session.runningSince) / 1000))
    : 0;
  let total = (session.accumulatedSeconds || 0) + currentSegment;
  if (session.targetSeconds > 0) {
    total = Math.min(total, session.targetSeconds);
  }
  return Math.max(0, total);
}

/**
 * Attempts to start a new active session via transaction.
 * If an active session already exists for another device, fails with conflict without modifying data.
 */
export async function startActiveSession(
  db: Firestore,
  uid: string,
  sessionData: Omit<ActiveSession, 'updatedAt' | 'lastHeartbeat'>
): Promise<{ success: boolean; conflict?: ActiveSession }> {
  const sessionRef = doc(db, 'activeSessions', uid);
  const now = Date.now();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (snap.exists()) {
      const existing = snap.data() as ActiveSession;
      if (['running','paused','break-running','break-paused'].includes(existing.status) && existing.deviceId !== sessionData.deviceId) {
        return { success: false, conflict: existing };
      }
    }

    const payload: ActiveSession = {
      ...sessionData,
      lastHeartbeat: now,
      updatedAt: now,
    };
    tx.set(sessionRef, payload);
    return { success: true };
  });
}

/**
 * Takes over an active session on another device via transaction.
 * 1. Cleanly ends the remote session and saves its elapsed time into the user's sessions array.
 * 2. Overwrites activeSessions/{uid} with the new session for the current device.
 */
export async function takeOverActiveSession(
  db: Firestore,
  uid: string,
  myDeviceId: string,
  newSessionData: Omit<ActiveSession, 'updatedAt' | 'lastHeartbeat' | 'deviceId' | 'uid'>
): Promise<{
  success: boolean;
  savedSession?: StudySession;
  updatedSessions?: StudySession[];
}> {
  const sessionRef = doc(db, 'activeSessions', uid);
  const userRef = doc(db, 'users', uid);
  const now = Date.now();

  return runTransaction(db, async (tx) => {
    const activeSnap = await tx.get(sessionRef);
    const userSnap = await tx.get(userRef);

    let completedSession: StudySession | undefined;
    let updatedSessions: StudySession[] | undefined;

    if (activeSnap.exists()) {
      const oldSession = activeSnap.data() as ActiveSession;
      const totalElapsed = calculateElapsedSeconds(oldSession, now);

      if (totalElapsed > 0) {
        completedSession = {
          id: oldSession.sessionId || `sess-${now}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: oldSession.workspaceId,
          workspaceName: oldSession.workspaceName,
          subjectId: oldSession.subjectId,
          subjectName: oldSession.subjectName,
          subjectColor: oldSession.subjectColor,
          startTime: oldSession.startTime || (now - totalElapsed * 1000),
          endTime: now,
          durationSeconds: totalElapsed,
          rankingDurationSeconds: totalElapsed,
          rankingCapped: oldSession.rankingCapped === true || (oldSession.status === 'running' && !!oldSession.runningSince && now-oldSession.runningSince>10800000),
          mode: oldSession.mode,
          strictMode: oldSession.strictMode === true,
          ...(oldSession.jee?{jee:oldSession.jee}:{}),
          notes: oldSession.notes || '',
          date: oldSession.date || getLocalDateString(new Date(oldSession.startTime || now)),
        };

        const existingSessions: StudySession[] =
          userSnap.exists() && Array.isArray(userSnap.data()?.sessions)
            ? userSnap.data()?.sessions
            : [];

        updatedSessions = [
          completedSession,
          ...existingSessions.filter((s) => s.id !== completedSession?.id),
        ];

        tx.set(
          userRef,
          {
            sessions: updatedSessions,
            lastSyncedAt: now,
          },
          { merge: true }
        );
      }
    }

    const payload: ActiveSession = {
      ...newSessionData,
      uid,
      deviceId: myDeviceId,
      lastHeartbeat: now,
      updatedAt: now,
    };

    tx.set(sessionRef, payload);

    return {
      success: true,
      savedSession: completedSession,
      updatedSessions,
    };
  });
}

/**
 * Updates properties of an active session document (e.g. pause, resume, mode change).
 */
export async function updateActiveSession(
  db: Firestore,
  uid: string,
  patch: Partial<ActiveSession>
): Promise<void> {
  const sessionRef = doc(db, 'activeSessions', uid);
  await runTransaction(db, async tx => {
    const snapshot=await tx.get(sessionRef);
    if (!snapshot.exists() || patch.sessionId && snapshot.data().sessionId!==patch.sessionId) return;
    const {sessionId,...values}=patch;
    tx.set(sessionRef,{...values,updatedAt:Date.now()},{merge:true});
  });
}

/**
 * Heartbeat function called periodically to update elapsed time and lastHeartbeat.
 */
export async function heartbeatActiveSession(
  db: Firestore,
  uid: string,
  patch: {
    sessionId?: string;
    rankingCapped?: boolean;
    accumulatedSeconds: number;
    runningSince: number | null;
    status: TimerStatus;
  }
): Promise<void> {
  const sessionRef = doc(db, 'activeSessions', uid);
  const now = Date.now();
  await runTransaction(db,async tx=>{
    const snapshot=await tx.get(sessionRef);
    if(!snapshot.exists() || patch.sessionId && snapshot.data().sessionId!==patch.sessionId) return;
    const {sessionId,...values}=patch;
    tx.set(sessionRef,{...values,lastHeartbeat:now,updatedAt:now},{merge:true});
  });
}

/**
 * Deletes the active session doc when the timer is stopped/saved or reset.
 * Only deletes if the document belongs to the requesting device and session, preventing
 * race-condition deletions if another device took over.
 */
export async function deleteActiveSession(
  db: Firestore,
  uid: string,
  myDeviceId?: string,
  mySessionId?: string
): Promise<void> {
  const sessionRef = doc(db, 'activeSessions', uid);
  if (!myDeviceId && !mySessionId) {
    await deleteDoc(sessionRef);
    return;
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) return;
    const data = snap.data() as ActiveSession;
    if (myDeviceId && data.deviceId !== myDeviceId) return;
    if (mySessionId && data.sessionId !== mySessionId) return;
    tx.delete(sessionRef);
  });
}
