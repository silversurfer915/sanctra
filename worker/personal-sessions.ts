/**
 * Canonical owner-scoped session lifecycle, atomic receipts, and history projections.
 */
import type {PersonalStore} from './personal-api.ts';
import {Temporal} from '@js-temporal/polyfill';

export interface CanonicalSession {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId?: string;
  topicTitle?: string;
  workspaceId?: string;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  scheduledStart?: string;
  startTime?: number;
  endTime?: number;
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  isPaused: boolean;
  pausedAt?: number | null;
  runningSince?: number | null;
  accumulatedSeconds: number;
  mode: 'stopwatch' | 'timer' | 'pomodoro';
  source: 'web' | 'mac-app';
  deviceId: string;
  originDevice?: string;
  notes?: string;
  revision: number;
  updatedAt: number;
}

export interface SessionOperationInput {
  operationId: string;
  sessionId?: string;
  expectedRevision?: number;
  action?: 'start' | 'pause' | 'resume' | 'finish' | 'abandon' | 'edit';
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicTitle?: string;
  workspaceId?: string;
  plannedDurationSeconds?: number;
  scheduledStart?: string;
  mode?: 'stopwatch' | 'timer' | 'pomodoro';
  source?: 'web' | 'mac-app';
  deviceId?: string;
  originDevice?: string;
  status?: 'planned' | 'active';
  startTime?: number;
  notes?: string;
}

export interface OperationReceipt {
  operationId: string;
  sessionId: string;
  revision: number;
  result: Record<string, unknown>;
  timestamp: number;
}

function calculateCurrentElapsed(session: CanonicalSession, now: number): number {
  let elapsed = session.accumulatedSeconds || 0;
  if (!session.isPaused && session.runningSince) {
    elapsed += Math.max(0, Math.floor((now - session.runningSince) / 1000));
  }
  return Math.max(0, elapsed);
}

function sessionToActiveProjection(session: CanonicalSession, owner: string, now: number): Record<string, unknown> {
  return {
    uid: owner,
    sessionId: session.id,
    deviceId: session.deviceId,
    startTime: session.startTime || now,
    runningSince: session.isPaused ? null : session.runningSince,
    accumulatedSeconds: session.accumulatedSeconds,
    targetSeconds: session.plannedDurationSeconds || 0,
    breakSeconds: 0,
    mode: session.mode === 'stopwatch' ? 'countup' : session.mode === 'timer' ? 'countdown' : 'pomodoro',
    status: session.isPaused ? 'paused' : 'running',
    subjectId: session.subjectId,
    subjectName: session.subjectName,
    workspaceId: session.workspaceId || 'main',
    notes: session.notes || '',
    updatedAt: now,
    lastHeartbeat: now,
  };
}

function fromProjection(data: Record<string, unknown>, saved?: CanonicalSession | null): CanonicalSession | null {
  if (!data.sessionId || !['running','paused','break-running','break-paused'].includes(String(data.status))) return null;
  const isPaused = ['paused','break-paused'].includes(String(data.status));
  const accumulatedSeconds = Math.max(0, Number(data.accumulatedSeconds || 0));
  return {
    ...saved,
    id:String(data.sessionId),subjectId:String(data.subjectId || 'general'),subjectName:String(data.subjectName || 'Study'),
    workspaceId:String(data.workspaceId || 'main'),plannedDurationSeconds:Number(data.targetSeconds || saved?.plannedDurationSeconds || 0),
    actualDurationSeconds:accumulatedSeconds, accumulatedSeconds,
    startTime:Number(data.startTime),runningSince:isPaused ? null : Number(data.runningSince || data.startTime),
    isPaused,status:'active',deviceId:String(data.deviceId),source:saved?.source || 'web',
    mode:data.mode==='countdown'?'timer':data.mode==='pomodoro'?'pomodoro':'stopwatch',
    notes:String(data.notes || ''),revision:(saved?.revision || 1) + (saved && Number(data.updatedAt)!==saved.updatedAt ? 1 : 0),updatedAt:Number(data.updatedAt || 0),
  };
}

export async function createCanonicalSession(
  store: PersonalStore,
  owner: string,
  input: SessionOperationInput,
  now = Date.now()
): Promise<{status: number; body: Record<string, unknown>}> {
  if (store.transact) return store.transact(tx => createCanonicalSession(tx, owner, input, now));
  if (!input || typeof input !== 'object' || input.startTime !== undefined && (!Number.isSafeInteger(input.startTime) || input.startTime < 0) || input.plannedDurationSeconds !== undefined && (!Number.isSafeInteger(input.plannedDurationSeconds) || input.plannedDurationSeconds < 0 || input.plannedDurationSeconds > 86400)) {
    return {status:400,body:{message:'Invalid session times or duration.'}};
  }
  if (!input.operationId || !/^[A-Za-z0-9_-]{1,128}$/.test(input.operationId)) {
    return {status: 400, body: {message: 'Valid operationId is required.'}};
  }
  const sessionId = input.sessionId || `sess-${now}-${Math.random().toString(36).slice(2, 9)}`;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    return {status: 400, body: {message: 'Valid sessionId is required.'}};
  }

  // Idempotency check
  const receiptDoc = await store.read(`users/${owner}/personal_receipts/${input.operationId}`);
  if (receiptDoc.data) {
    const receipt = receiptDoc.data as unknown as OperationReceipt;
    return {status: 200, body: receipt.result};
  }

  if ((await store.read(`users/${owner}/personal_sessions/${sessionId}`)).data) {
    return {status: 409, body: {message: 'This session identity already exists.'}};
  }
  const pointer = await store.read(`users/${owner}/personal_data/active_session`);
  const syncRevision = Number(pointer.data?.revision || 0) + 1;

  const plannedSeconds = Number.isSafeInteger(input.plannedDurationSeconds) && (input.plannedDurationSeconds || 0) >= 0
    ? Number(input.plannedDurationSeconds)
    : 1800; // default 30 min plan
  const requestedStatus = input.status === 'planned' ? 'planned' : 'active';
  const startTime = input.startTime || now;

  if (startTime > now + 60000) {
    return {status: 400, body: {message: 'Start time cannot be in the future.'}};
  }

  // If creating active session, check for existing active session conflict
  let supersededSessionId: string | null = null;
  if (requestedStatus === 'active') {
    const activeDoc = await store.read(`users/${owner}/personal_data/active_session`);
    const webDoc = await store.read(`activeSessions/${owner}`);
    if (webDoc.data?.sessionId) activeDoc.data = {...activeDoc.data, sessionId:webDoc.data.sessionId};
    if (activeDoc.data && activeDoc.data.sessionId) {
      const existingSessionId = String(activeDoc.data.sessionId);
      const existingDoc = await store.read(`users/${owner}/personal_sessions/${existingSessionId}`);
      const effective = webDoc.data ? fromProjection(webDoc.data, existingDoc.data as unknown as CanonicalSession) : null;
      if (effective) {
        const existing = effective;
        const existingStart = existing.startTime || 0;

        // Conflict check: newest actual start wins
        if (startTime < existingStart || (startTime === existingStart && sessionId < existing.id)) {
          // Incoming session loses conflict
          return {
            status: 409,
            body: {
              message: 'A newer session is already active on another device.',
              activeSession: existing,
              loser: sessionId,
            },
          };
        }

        // Existing session is superseded by incoming session
        supersededSessionId = existing.id;
        const settledElapsed = Math.min(
          calculateCurrentElapsed(existing, startTime),
          Math.max(0, Math.floor((startTime - (existing.startTime || 0)) / 1000))
        );
        const superseded: CanonicalSession = {
          ...existing,
          status: 'abandoned',
          endTime: startTime,
          isPaused: false,
          runningSince: null,
          actualDurationSeconds: settledElapsed,
          revision: (existing.revision || 0) + 1,
          updatedAt: now,
        };
        await store.write(`users/${owner}/personal_sessions/${existing.id}`, superseded as unknown as Record<string, unknown>);

        // Project settled elapsed to history if > 0
        if (settledElapsed > 0) {
          await projectSessionToHistory(store, owner, superseded);
        }
      }
    }
  }

  const session: CanonicalSession = {
    id: sessionId,
    subjectId: input.subjectId || 'general',
    subjectName: input.subjectName || 'Study',
    topicId: input.topicId || undefined,
    topicTitle: input.topicTitle || undefined,
    workspaceId: input.workspaceId || 'main',
    plannedDurationSeconds: plannedSeconds,
    actualDurationSeconds: 0,
    startTime: requestedStatus === 'active' ? startTime : undefined,
    scheduledStart: requestedStatus === 'planned' ? new Date(startTime).toISOString() : undefined,
    status: requestedStatus,
    isPaused: false,
    pausedAt: null,
    runningSince: requestedStatus === 'active' ? startTime : null,
    accumulatedSeconds: 0,
    mode: input.mode || 'stopwatch',
    source: input.source || 'mac-app',
    deviceId: input.deviceId || 'mac',
    originDevice: input.originDevice || undefined,
    notes: input.notes || '',
    revision: 1,
    updatedAt: now,
  };

  await store.write(`users/${owner}/personal_sessions/${sessionId}`, session as unknown as Record<string, unknown>);

  if (requestedStatus === 'active') {
    await store.write(`users/${owner}/personal_data/active_session`, {sessionId, revision: syncRevision, updatedAt: now});
    await store.write(`activeSessions/${owner}`, sessionToActiveProjection(session, owner, now));
  }

  const result: Record<string, unknown> = {
    session,
    revision: session.revision,
    operationId: input.operationId,
    ...(supersededSessionId ? {supersededSessionId} : {}),
  };

  const receipt: OperationReceipt = {
    operationId: input.operationId,
    sessionId: session.id,
    revision: session.revision,
    result,
    timestamp: now,
  };
  await store.write(`users/${owner}/personal_receipts/${input.operationId}`, receipt as unknown as Record<string, unknown>);

  return {status: 201, body: result};
}

export async function mutateCanonicalSession(
  store: PersonalStore,
  owner: string,
  sessionId: string,
  input: SessionOperationInput,
  now = Date.now()
): Promise<{status: number; body: Record<string, unknown>}> {
  if (store.transact) return store.transact(tx => mutateCanonicalSession(tx, owner, sessionId, input, now));
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId) || !input || typeof input !== 'object') return {status:400,body:{message:'Invalid session payload.'}};
  if (!input.operationId || !/^[A-Za-z0-9_-]{1,128}$/.test(input.operationId)) {
    return {status: 400, body: {message: 'Valid operationId is required.'}};
  }

  // Idempotency check
  const receiptDoc = await store.read(`users/${owner}/personal_receipts/${input.operationId}`);
  if (receiptDoc.data) {
    const receipt = receiptDoc.data as unknown as OperationReceipt;
    return {status: 200, body: receipt.result};
  }

  const sessionDoc = await store.read(`users/${owner}/personal_sessions/${sessionId}`);
  const webDoc = await store.read(`activeSessions/${owner}`);
  if (webDoc.data?.sessionId === sessionId) {
    sessionDoc.data = fromProjection(webDoc.data, sessionDoc.data as unknown as CanonicalSession) as unknown as Record<string, unknown>;
  }
  if (!sessionDoc.data) {
    return {status: 404, body: {message: 'Session not found.'}};
  }

  const session = sessionDoc.data as unknown as CanonicalSession;

  // Optimistic concurrency check
  if (input.expectedRevision !== undefined && input.expectedRevision !== session.revision) {
    return {
      status: 409,
      body: {
        message: 'Session modified on another device.',
        session,
        currentRevision: session.revision,
      },
    };
  }

  const action = input.action || 'edit';
  if (!['start', 'pause', 'resume', 'finish', 'abandon', 'edit'].includes(action)) {
    return {status: 400, body: {message: 'Unknown session action.'}};
  }
  if (['completed', 'abandoned'].includes(session.status) && action !== 'edit') {
    return {status: 409, body: {message: 'This session has ended.', session}};
  }
  const pointer = await store.read(`users/${owner}/personal_data/active_session`);
  if (session.status === 'active' && webDoc.data?.sessionId !== sessionId) {
    return {status: 409, body: {message: 'Another session is active.', session}};
  }
  if (action === 'start' && pointer.data?.sessionId && pointer.data.sessionId !== sessionId) {
    return {status: 409, body: {message: 'Another session is active. Start a new session to replace it.'}};
  }
  const syncRevision = Number(pointer.data?.revision || 0) + 1;

  switch (action) {
    case 'start': {
      if (session.status === 'active') break;
      session.status = 'active';
      session.startTime = input.startTime || now;
      session.runningSince = now;
      session.isPaused = false;
      session.pausedAt = null;
      await store.write(`users/${owner}/personal_data/active_session`, {sessionId, revision: syncRevision, updatedAt: now});
      await store.write(`activeSessions/${owner}`, sessionToActiveProjection(session, owner, now));
      break;
    }

    case 'pause': {
      if (session.status === 'active' && !session.isPaused) {
        const segment = session.runningSince ? Math.max(0, Math.floor((now - session.runningSince) / 1000)) : 0;
        session.accumulatedSeconds += segment;
        session.isPaused = true;
        session.pausedAt = now;
        session.runningSince = null;
        await store.write(`activeSessions/${owner}`, sessionToActiveProjection(session, owner, now));
      }
      break;
    }

    case 'resume': {
      if (session.status === 'active' && session.isPaused) {
        session.isPaused = false;
        session.pausedAt = null;
        session.runningSince = now;
        await store.write(`activeSessions/${owner}`, sessionToActiveProjection(session, owner, now));
      }
      break;
    }

    case 'finish': {
      if (session.status === 'completed') {
        // Already completed
        break;
      }
      if (session.status === 'active' && !session.isPaused && session.runningSince) {
        const segment = Math.max(0, Math.floor((now - session.runningSince) / 1000));
        session.accumulatedSeconds += segment;
      }
      session.actualDurationSeconds = session.accumulatedSeconds;
      session.status = 'completed';
      session.endTime = now;
      session.isPaused = false;
      session.runningSince = null;

      // Clear active session pointer & activeSessions doc
      await store.write(`users/${owner}/personal_data/active_session`, {sessionId: null, revision: syncRevision, updatedAt: now});
      await store.write(`activeSessions/${owner}`, {
        uid: owner,
        sessionId: '',
        status: 'idle',
        updatedAt: now,
      });

      // Atomically project completed record into users/{owner}.sessions
      await projectSessionToHistory(store, owner, session);
      break;
    }

    case 'abandon': {
      if (session.status === 'active' && !session.isPaused && session.runningSince) {
        const segment = Math.max(0, Math.floor((now - session.runningSince) / 1000));
        session.accumulatedSeconds += segment;
      }
      session.actualDurationSeconds = session.accumulatedSeconds;
      session.status = 'abandoned';
      session.endTime = now;
      session.isPaused = false;
      session.runningSince = null;

      await store.write(`users/${owner}/personal_data/active_session`, {sessionId: null, revision: syncRevision, updatedAt: now});
      await store.write(`activeSessions/${owner}`, {
        uid: owner,
        sessionId: '',
        status: 'idle',
        updatedAt: now,
      });

      if (session.actualDurationSeconds > 0) {
        await projectSessionToHistory(store, owner, session);
      }
      break;
    }

    case 'edit': {
      if (input.scheduledStart !== undefined || input.plannedDurationSeconds !== undefined) {
        if (session.status !== 'planned') return {status:409,body:{message:'Only planned sessions can be rescheduled.'}};
        if (input.plannedDurationSeconds !== undefined && (!Number.isSafeInteger(input.plannedDurationSeconds) || input.plannedDurationSeconds <= 0 || input.plannedDurationSeconds > 86400)) return {status:400,body:{message:'Invalid planned duration.'}};
        if (input.scheduledStart !== undefined) {
          try {session.scheduledStart = Temporal.Instant.from(input.scheduledStart).toString();}
          catch {return {status:400,body:{message:'Invalid scheduled time.'}};}
        }
        if (input.plannedDurationSeconds !== undefined) session.plannedDurationSeconds = input.plannedDurationSeconds;
        const userDoc = await store.read(`users/${owner}`);
        const timezone = String((userDoc.data?.settings as Record<string,unknown> | undefined)?.timezone || 'Asia/Kolkata');
        const local = Temporal.Instant.from(session.scheduledStart!).toZonedDateTimeISO(timezone);
        const end = local.add({seconds:session.plannedDurationSeconds});
        const tasks = (Array.isArray(userDoc.data?.tasks) ? userDoc.data.tasks as Record<string,unknown>[] : []).map(task => task.id === `task-${sessionId}` ? {...task,dueDate:local.toPlainDate().toString(),startTime:local.toPlainTime().toString().slice(0,5),endTime:end.toPlainTime().toString().slice(0,5)} : task);
        await store.write(`users/${owner}`, {...(userDoc.data || {}),tasks,lastSyncedAt:now});
      }
      if (input.notes !== undefined) session.notes = input.notes;
      if (input.subjectName !== undefined) session.subjectName = input.subjectName;
      if (input.topicTitle !== undefined) session.topicTitle = input.topicTitle;
      break;
    }
  }

  session.revision = (session.revision || 0) + 1;
  session.updatedAt = now;
  if (session.status === 'active') {
    await store.write(`users/${owner}/personal_data/active_session`, {sessionId, revision: syncRevision, updatedAt: now});
  }

  await store.write(`users/${owner}/personal_sessions/${sessionId}`, session as unknown as Record<string, unknown>);

  const result: Record<string, unknown> = {
    session,
    revision: session.revision,
    operationId: input.operationId,
  };

  const receipt: OperationReceipt = {
    operationId: input.operationId,
    sessionId: session.id,
    revision: session.revision,
    result,
    timestamp: now,
  };
  await store.write(`users/${owner}/personal_receipts/${input.operationId}`, receipt as unknown as Record<string, unknown>);

  return {status: 200, body: result};
}

async function projectSessionToHistory(store: PersonalStore, owner: string, session: CanonicalSession): Promise<void> {
  const userDoc = await store.read(`users/${owner}`);
  const existingSessions = Array.isArray(userDoc.data?.sessions)
    ? [...userDoc.data!.sessions as Array<Record<string, unknown>>]
    : [];

  const historyRecord: Record<string, unknown> = {
    id: session.id, // Canonical session ID preserved!
    subjectId: session.subjectId,
    subjectName: session.subjectName,
    startTime: session.startTime || (session.endTime ? session.endTime - session.actualDurationSeconds * 1000 : Date.now()),
    endTime: session.endTime || Date.now(),
    durationSeconds: session.actualDurationSeconds,
    rankingDurationSeconds: 0, // Personal history never grants unverified leaderboard credit.
    mode: session.mode,
    notes: session.notes || '',
    date: Temporal.Instant.fromEpochMilliseconds(session.startTime || session.endTime || Date.now()).toZonedDateTimeISO(String((userDoc.data?.settings as Record<string,unknown> | undefined)?.timezone || 'Asia/Kolkata')).toPlainDate().toString(),
    source: session.source,
  };

  const filtered = existingSessions.filter(s => s.id !== session.id);
  const updated = [historyRecord, ...filtered];

  await store.write(`users/${owner}`, {
    ...(userDoc.data || {}),
    sessions: updated,
    lastSyncedAt: Date.now(),
  });
}

export interface PlanItemInput {
  id?: string;
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicTitle?: string;
  title?: string;
  notes?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  plannedDurationSeconds?: number;
}

export async function createCanonicalPlan(
  store: PersonalStore,
  owner: string,
  input: {operationId: string; plans: PlanItemInput[]},
  now = Date.now()
): Promise<{status: number; body: Record<string, unknown>}> {
  if (store.transact) return store.transact(tx => createCanonicalPlan(tx, owner, input, now));
  if (!input || typeof input !== 'object') return {status:400,body:{message:'Invalid plan payload.'}};
  if (!input.operationId || !/^[A-Za-z0-9_-]{1,128}$/.test(input.operationId)) {
    return {status: 400, body: {message: 'Valid operationId is required.'}};
  }
  const receiptDoc = await store.read(`users/${owner}/personal_receipts/${input.operationId}`);
  if (receiptDoc.data) {
    const receipt = receiptDoc.data as unknown as OperationReceipt;
    return {status: 200, body: receipt.result};
  }
  if (!Array.isArray(input.plans) || input.plans.length === 0 || input.plans.length > 50) {
    return {status: 400, body: {message: 'Provide between 1 and 50 plans.'}};
  }

  const userDoc = await store.read(`users/${owner}`);
  const existingTasks = Array.isArray(userDoc.data?.tasks) ? [...userDoc.data!.tasks as Array<Record<string, unknown>>] : [];
  const timezone = String((userDoc.data?.settings as Record<string,unknown> | undefined)?.timezone || 'Asia/Kolkata');
  const scheduledStarts: string[] = [];
  for (const item of input.plans) {
    if (!item || item.id !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(item.id) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || item.startTime !== undefined && !/^\d{2}:\d{2}$/.test(item.startTime) || item.plannedDurationSeconds !== undefined && (!Number.isSafeInteger(item.plannedDurationSeconds) || item.plannedDurationSeconds <= 0 || item.plannedDurationSeconds > 86400)) return {status:400,body:{message:'Invalid planned session.'}};
    try {scheduledStarts.push(Temporal.PlainDateTime.from(`${item.date}T${item.startTime || '09:00'}:00`).toZonedDateTime(timezone,{disambiguation:'reject'}).toInstant().toString());} catch {return {status:400,body:{message:'Invalid local planned time.'}};}
    if (item.id && (await store.read(`users/${owner}/personal_sessions/${item.id}`)).data) return {status:409,body:{message:'A planned session with this ID already exists.'}};
  }

  const createdPlans: CanonicalSession[] = [];
  const newTasks: Array<Record<string, unknown>> = [];

  for (const item of input.plans) {
    const id = item.id || `plan-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const plan: CanonicalSession = {
      id,
      subjectId: item.subjectId || 'general',
      subjectName: item.subjectName || 'Study',
      topicId: item.topicId || undefined,
      topicTitle: item.topicTitle || undefined,
      workspaceId: 'main',
      plannedDurationSeconds: item.plannedDurationSeconds || 1800,
      actualDurationSeconds: 0,
      scheduledStart: scheduledStarts[createdPlans.length],
      status: 'planned',
      isPaused: false,
      pausedAt: null,
      runningSince: null,
      accumulatedSeconds: 0,
      mode: 'stopwatch',
      source: 'mac-app',
      deviceId: 'mac',
      notes: item.notes || '',
      revision: 1,
      updatedAt: now,
    };
    createdPlans.push(plan);
    await store.write(`users/${owner}/personal_sessions/${id}`, plan as unknown as Record<string, unknown>);

    newTasks.push({
      id: `task-${id}`,
      text: item.title || `${item.subjectName || 'Study'}: ${item.topicTitle || 'Planned session'}`,
      completed: false,
      dueDate: item.date || new Date(now).toISOString().slice(0, 10),
      category: 'today',
      startTime: item.startTime,
      endTime: item.endTime,
      subjectId: item.subjectId,
      syllabusTopicId: item.topicId,
      syllabusTopicTitle: item.topicTitle,
      createdAt: now,
    });
  }

  await store.write(`users/${owner}`, {
    ...(userDoc.data || {}),
    tasks: [...newTasks, ...existingTasks],
    lastSyncedAt: now,
  });

  const result = {plans: createdPlans, createdTasks: newTasks.length, operationId: input.operationId};
  const receipt: OperationReceipt = {
    operationId: input.operationId,
    sessionId: createdPlans[0].id,
    revision: 1,
    result,
    timestamp: now,
  };
  await store.write(`users/${owner}/personal_receipts/${input.operationId}`, receipt as unknown as Record<string, unknown>);
  return {status: 201, body: result};
}

export async function getSyncState(
  store: PersonalStore,
  owner: string,
  clientRevision?: number | string
): Promise<{unchanged: boolean; revision: number; serverTime: number; activeSession: CanonicalSession | null}> {
  const activeDoc = await store.read(`users/${owner}/personal_data/active_session`);
  const projection = await store.read(`activeSessions/${owner}`);
  let activeSession: CanonicalSession | null = null;
  let revision = Number(activeDoc.data?.revision || 0);
  if (projection.data?.sessionId) {
    const sessionDoc = await store.read(`users/${owner}/personal_sessions/${String(projection.data.sessionId)}`);
    activeSession = fromProjection(projection.data, sessionDoc.data as unknown as CanonicalSession);
    // Website changes have their own timestamp; include it in the account-wide cursor.
    revision = Math.max(revision, Number(projection.data.updatedAt || 0));
  }
  const serverTime = Date.now();
  if (clientRevision !== undefined && String(clientRevision) === String(revision)) {
    return {unchanged: true, revision, serverTime, activeSession};
  }
  return {unchanged: false, revision, serverTime, activeSession};
}
