import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanonicalSession, mutateCanonicalSession} from '../worker/personal-sessions.ts';
import type {PersonalStore} from '../worker/personal-api.ts';

function createMockStore() {
  const docs = new Map<string, Record<string, unknown>>();
  const store: PersonalStore = {
    read: async (path: string) => ({data: docs.get(path) ? JSON.parse(JSON.stringify(docs.get(path))) : null, version: '1'}),
    write: async (path: string, data: Record<string, unknown>) => { docs.set(path, JSON.parse(JSON.stringify(data))); },
    verifyOwner: async () => ({uid: 'owner', authTime: Math.floor(Date.now() / 1000)}),
  };
  return {store, docs};
}

test('completed sessions cannot restart or clear a newer active session', async () => {
  const {store, docs} = createMockStore();
  await createCanonicalSession(store, 'owner', {operationId:'a',sessionId:'old'}, 1000000);
  await mutateCanonicalSession(store, 'owner', 'old', {operationId:'b',action:'finish'}, 1060000);
  await createCanonicalSession(store, 'owner', {operationId:'c',sessionId:'new'}, 1070000);
  const restarted = await mutateCanonicalSession(store, 'owner', 'old', {operationId:'d',action:'start'}, 1080000);
  assert.equal(restarted.status, 409);
  await mutateCanonicalSession(store, 'owner', 'old', {operationId:'e',action:'abandon'}, 1090000);
  assert.equal(docs.get('users/owner/personal_data/active_session')?.sessionId, 'new');
});

test('a second operation cannot overwrite an existing session identity', async () => {
  const {store, docs} = createMockStore();
  await createCanonicalSession(store, 'owner', {operationId:'first',sessionId:'same'}, 1000000);
  const duplicate = await createCanonicalSession(store, 'owner', {operationId:'second',sessionId:'same'}, 1100000);
  assert.equal(duplicate.status, 409);
  assert.equal(docs.get('users/owner/personal_sessions/same')?.startTime, 1000000);
});

test('sync revision changes when a revision-one session replaces another', async () => {
  const {store} = createMockStore();
  const {getSyncState} = await import('../worker/personal-sessions.ts');
  await createCanonicalSession(store, 'owner', {operationId:'first',sessionId:'first'}, 1000000);
  const before = await getSyncState(store, 'owner');
  await createCanonicalSession(store, 'owner', {operationId:'second',sessionId:'second'}, 1100000);
  const after = await getSyncState(store, 'owner', before.revision);
  assert.equal(after.unchanged, false);
  assert.equal(after.activeSession?.id, 'second');
});

test('lifecycle uses one transaction and rolls back all projections on failure', async () => {
  const {store, docs} = createMockStore();
  let transactions = 0;
  store.transact = async work => {
    transactions++;
    const staged = new Map(docs);
    const transactionStore: PersonalStore = {
      ...store,
      transact: undefined,
      read: async path => ({data: staged.get(path) || null, version: '1'}),
      write: async (path, data) => {
        if (path.includes('personal_receipts')) throw Error('simulated failed commit');
        staged.set(path, data);
      },
    };
    const result = await work(transactionStore);
    for (const [key, value] of staged) docs.set(key, value);
    return result;
  };
  await assert.rejects(createCanonicalSession(store, 'owner', {operationId:'atomic',sessionId:'atomic'}, 1000000));
  assert.equal(transactions, 1);
  assert.equal(docs.size, 0);
});

test('sync imports a website timer and reflects website pause and deletion', async () => {
  const {store, docs} = createMockStore();
  const {getSyncState} = await import('../worker/personal-sessions.ts');
  docs.set('activeSessions/owner', {sessionId:'web-session',status:'running',subjectName:'Physics',startTime:1000000,runningSince:1000000,accumulatedSeconds:0,targetSeconds:1800,mode:'countup',deviceId:'browser',updatedAt:1000000});
  const active = await getSyncState(store, 'owner');
  assert.equal(active.activeSession?.id, 'web-session');
  docs.set('activeSessions/owner', {...docs.get('activeSessions/owner'),status:'paused',runningSince:null,accumulatedSeconds:60,updatedAt:1060000});
  const paused = await getSyncState(store, 'owner', active.revision);
  assert.equal(paused.unchanged, false);
  assert.equal(paused.activeSession?.isPaused, true);
  docs.delete('activeSessions/owner');
  const ended = await getSyncState(store, 'owner', paused.revision);
  assert.equal(ended.activeSession, null);
});

test('invalid inputs are rejected before reading arbitrary document paths', async () => {
 const {store, docs} = createMockStore();
 assert.equal((await mutateCanonicalSession(store,'owner','../../other',{operationId:'path',action:'finish'})).status,400);
 assert.equal((await createCanonicalSession(store,'owner',{operationId:'time',sessionId:'bad-time',startTime:-1})).status,400);
 assert.equal((await createCanonicalSession(store,'owner',{operationId:'duration',plannedDurationSeconds:1000000})).status,400);
 const {createCanonicalPlan} = await import('../worker/personal-sessions.ts');
 assert.equal((await createCanonicalPlan(store,'owner',{operationId:'plan-path',plans:[{id:'../../other',date:'2026-10-12'}]})).status,400);
 assert.equal(docs.size,0);
});

test('planned local times use account timezone and allow future scheduling', async () => {
 const {store, docs} = createMockStore();
 docs.set('users/owner',{settings:{timezone:'Asia/Kolkata'},tasks:[]});
 const {createCanonicalPlan} = await import('../worker/personal-sessions.ts');
 const result = await createCanonicalPlan(store,'owner',{operationId:'schedule',plans:[{id:'tomorrow',date:'2026-10-13',startTime:'09:00'}]},1000000);
 assert.equal(result.status,201);
 assert.equal(docs.get('users/owner/personal_sessions/tomorrow')?.scheduledStart,'2026-10-13T03:30:00Z');
});

test('planned sessions can be rescheduled and update their visible task',async()=>{
 const {store,docs}=createMockStore();
 docs.set('users/owner',{settings:{timezone:'Asia/Kolkata'},tasks:[]});
 const {createCanonicalPlan}=await import('../worker/personal-sessions.ts');
 await createCanonicalPlan(store,'owner',{operationId:'plan',plans:[{id:'scheduled',date:'2026-10-13',startTime:'09:00'}]},1000000);
 const edited=await mutateCanonicalSession(store,'owner','scheduled',{operationId:'move',action:'edit',scheduledStart:'2026-10-14T04:30:00Z',plannedDurationSeconds:3600},1100000);
 assert.equal(edited.status,200);
 assert.equal(docs.get('users/owner/personal_sessions/scheduled')?.scheduledStart,'2026-10-14T04:30:00Z');
 assert.equal((docs.get('users/owner')?.tasks as any[])[0].dueDate,'2026-10-14');
 assert.equal((docs.get('users/owner')?.tasks as any[])[0].startTime,'10:00');
});

test('invalid rescheduling preserves planned records and active sessions cannot be rescheduled', async () => {
 const {store,docs}=createMockStore();
 docs.set('users/owner',{settings:{timezone:'Asia/Kolkata'},tasks:[]});
 const {createCanonicalPlan}=await import('../worker/personal-sessions.ts');
 await createCanonicalPlan(store,'owner',{operationId:'plan',plans:[{id:'scheduled',date:'2026-10-13',startTime:'09:00'}]},1000000);
 const before=JSON.stringify([...docs]);
 assert.equal((await mutateCanonicalSession(store,'owner','scheduled',{operationId:'invalid',action:'edit',scheduledStart:'bad-date'},1100000)).status,400);
 assert.equal(JSON.stringify([...docs]),before);
 await createCanonicalSession(store,'owner',{operationId:'active',sessionId:'active'},1100000);
 assert.equal((await mutateCanonicalSession(store,'owner','active',{operationId:'move-active',action:'edit',scheduledStart:'2026-10-14T04:30:00Z'},1200000)).status,409);
});

test('creates active session and stores idempotency receipt', async () => {
  const {store, docs} = createMockStore();
  const now = 1000000;
  const res = await createCanonicalSession(store, 'owner', {
    operationId: 'op-1',
    sessionId: 'sess-1',
    subjectId: 'physics',
    subjectName: 'Physics',
    plannedDurationSeconds: 1800,
    status: 'active',
    startTime: now,
  }, now);

  assert.equal(res.status, 201);
  const session = (res.body as any).session;
  assert.equal(session.id, 'sess-1');
  assert.equal(session.status, 'active');
  assert.equal(session.revision, 1);

  // Check stored receipt
  assert.ok(docs.has('users/owner/personal_receipts/op-1'));
  // Check active pointer
  assert.equal((docs.get('users/owner/personal_data/active_session') as any).sessionId, 'sess-1');
  // Check compatible projection
  assert.equal((docs.get('activeSessions/owner') as any).status, 'running');

  // Retrying with same operationId returns stored receipt without error or new revision
  const retry = await createCanonicalSession(store, 'owner', {
    operationId: 'op-1',
    sessionId: 'sess-1',
  }, now + 1000);
  assert.equal(retry.status, 200);
  assert.equal((retry.body as any).session.id, 'sess-1');
  assert.equal((retry.body as any).revision, 1);
});

test('pause freezes duration and resume preserves identity and total elapsed', async () => {
  const {store} = createMockStore();
  const start = 1000000;
  await createCanonicalSession(store, 'owner', {
    operationId: 'op-start',
    sessionId: 'sess-1',
    status: 'active',
    startTime: start,
  }, start);

  // Pause at start + 60s
  const pauseRes = await mutateCanonicalSession(store, 'owner', 'sess-1', {
    operationId: 'op-pause',
    action: 'pause',
    expectedRevision: 1,
  }, start + 60000);

  assert.equal(pauseRes.status, 200);
  const paused = (pauseRes.body as any).session;
  assert.equal(paused.isPaused, true);
  assert.equal(paused.accumulatedSeconds, 60);
  assert.equal(paused.revision, 2);

  // Still paused at start + 300s -> accumulatedSeconds remains 60s
  const resumeRes = await mutateCanonicalSession(store, 'owner', 'sess-1', {
    operationId: 'op-resume',
    action: 'resume',
    expectedRevision: 2,
  }, start + 300000);

  assert.equal(resumeRes.status, 200);
  const resumed = (resumeRes.body as any).session;
  assert.equal(resumed.isPaused, false);
  assert.equal(resumed.accumulatedSeconds, 60);
  assert.equal(resumed.revision, 3);

  // Finish at start + 340s (+40s active after resume)
  const finishRes = await mutateCanonicalSession(store, 'owner', 'sess-1', {
    operationId: 'op-finish',
    action: 'finish',
    expectedRevision: 3,
  }, start + 340000);

  assert.equal(finishRes.status, 200);
  const finished = (finishRes.body as any).session;
  assert.equal(finished.status, 'completed');
  assert.equal(finished.actualDurationSeconds, 100); // 60 + 40
});

test('stale mutation with wrong expectedRevision is rejected with 409 conflict', async () => {
  const {store} = createMockStore();
  await createCanonicalSession(store, 'owner', {
    operationId: 'op-start',
    sessionId: 'sess-1',
    status: 'active',
  });

  const conflict = await mutateCanonicalSession(store, 'owner', 'sess-1', {
    operationId: 'op-stale',
    action: 'pause',
    expectedRevision: 999, // Stale!
  });

  assert.equal(conflict.status, 409);
  assert.equal((conflict.body as any).currentRevision, 1);
});

test('conflict resolution: newer start supersedes older session, while older start loses', async () => {
  const {store} = createMockStore();
  const t1 = 1000000;
  const t2 = 2000000;

  // Session 1 starts at t1
  await createCanonicalSession(store, 'owner', {
    operationId: 'op-1',
    sessionId: 'sess-1',
    status: 'active',
    startTime: t1,
  }, t1);

  // Session 2 starts at t2 (> t1) -> should supersede Session 1
  const res2 = await createCanonicalSession(store, 'owner', {
    operationId: 'op-2',
    sessionId: 'sess-2',
    status: 'active',
    startTime: t2,
  }, t2);

  assert.equal(res2.status, 201);
  assert.equal((res2.body as any).supersededSessionId, 'sess-1');

  // Session 3 tries to start with startTime t1 (< t2) -> should LOSE conflict
  const res3 = await createCanonicalSession(store, 'owner', {
    operationId: 'op-3',
    sessionId: 'sess-3',
    status: 'active',
    startTime: t1,
  }, t2);

  assert.equal(res3.status, 409);
  assert.equal((res3.body as any).loser, 'sess-3');
});

test('finish atomically projects canonical session into user history without duplicates', async () => {
  const {store, docs} = createMockStore();
  docs.set('users/owner', {sessions: [{id: 'existing-old', durationSeconds: 500}]});

  await createCanonicalSession(store, 'owner', {
    operationId: 'op-1',
    sessionId: 'canonical-xyz',
    subjectId: 'chem',
    subjectName: 'Chemistry',
    status: 'active',
    startTime: 1000000,
  }, 1000000);

  await mutateCanonicalSession(store, 'owner', 'canonical-xyz', {
    operationId: 'op-finish',
    action: 'finish',
    expectedRevision: 1,
  }, 1060000);

  const user = docs.get('users/owner') as any;
  assert.equal(user.sessions.length, 2);
  assert.equal(user.sessions[0].id, 'canonical-xyz'); // Canonical ID preserved
  assert.equal(user.sessions[0].durationSeconds, 60);

  // Finish retry returns cached receipt and leaves sessions array length 2
  await mutateCanonicalSession(store, 'owner', 'canonical-xyz', {
    operationId: 'op-finish',
    action: 'finish',
  }, 1060000);
  assert.equal((docs.get('users/owner') as any).sessions.length, 2);
});

test('createCanonicalPlan creates planned sessions and projects tasks atomically', async () => {
  const {store, docs} = createMockStore();
  docs.set('users/owner', {tasks: [{id: 't-existing', text: 'Existing task'}]});

  const res = await (await import('../worker/personal-sessions.ts')).createCanonicalPlan(store, 'owner', {
    operationId: 'op-plan-1',
    plans: [{
      id: 'plan-1',
      subjectId: 'physics',
      subjectName: 'Physics',
      topicTitle: 'Optics PYQs',
      date: '2026-10-12',
      startTime: '14:00',
      endTime: '15:00',
      plannedDurationSeconds: 3600,
    }],
  }, 1000000);

  assert.equal(res.status, 201);
  const user = docs.get('users/owner') as any;
  assert.equal(user.tasks.length, 2);
  assert.equal(user.tasks[0].id, 'task-plan-1');
  assert.equal(user.tasks[0].subjectId, 'physics');
  assert.ok(docs.has('users/owner/personal_sessions/plan-1'));
});

test('getSyncState returns 304 unchanged when revision matches and 200 with new active session when changed', async () => {
  const {store} = createMockStore();
  const {getSyncState} = await import('../worker/personal-sessions.ts');

  // No active session initially
  const initial = await getSyncState(store, 'owner', 0);
  assert.equal(initial.unchanged, true);

  // Start active session
  await createCanonicalSession(store, 'owner', {
    operationId: 'op-1',
    sessionId: 'sess-sync',
    status: 'active',
  }, 1000000);

  // Sync with old revision 0 -> unchanged is false, returns active session
  const updated = await getSyncState(store, 'owner', 0);
  assert.equal(updated.unchanged, false);
  assert.ok(updated.revision > 0);
  assert.equal(updated.activeSession?.id, 'sess-sync');

  // Sync with matching revision 1 -> unchanged is true
  const matching = await getSyncState(store, 'owner', updated.revision);
  assert.equal(matching.unchanged, true);
});
