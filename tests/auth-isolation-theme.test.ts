import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_PALETTES,
  getThemeName,
  DEFAULT_SUBJECTS,
  DEFAULT_USER_SETTINGS,
  getSessions,
  saveSession,
  getTasks,
  saveTasks,
  getSubjects,
  saveSubjects,
  getUserSettings,
  saveUserSettings,
  getTimerDraft,
  saveTimerDraft,
  clearTimerDraft,
  clearTasks,
  resetSubjects,
  resetUserSettings,
  purgeSharedDeviceState,
  persistAccountCache,
  getAccountCache,
} from '../src/utils/storage.ts';
import type { StudySession, Subject, TaskItem, TimerDraft, UserSettings } from '../src/types/index.ts';

// In-memory mock for localStorage
function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] || null;
    },
  };
}

test('Theme Palettes: all preset themes reflect distinct palettes without green fallbacks on non-green themes', () => {
  const themes = ['sand', 'blue', 'lavender', 'rose', 'charcoal', 'sage'] as const;

  for (const theme of themes) {
    const palette = THEME_PALETTES[theme];
    assert.ok(palette, `Palette for ${theme} should exist`);
    assert.ok(palette.accent.startsWith('#'), `${theme} accent should be a hex color`);
    assert.ok(palette.surface.startsWith('#'), `${theme} surface should be a hex color`);
    assert.ok(palette.ink.startsWith('#'), `${theme} ink should be a hex color`);
  }

  // Verify non-green presets do not have sage/emerald green accents
  assert.equal(THEME_PALETTES.sand.accent, '#e8c7ad');
  assert.equal(THEME_PALETTES.sand.surface, '#292b33');
  assert.notEqual(THEME_PALETTES.sand.accent, THEME_PALETTES.sage.accent);

  assert.equal(THEME_PALETTES.blue.accent, '#b8d4ea');
  assert.equal(THEME_PALETTES.blue.surface, '#292b33');
  assert.notEqual(THEME_PALETTES.blue.accent, THEME_PALETTES.sage.accent);

  assert.equal(THEME_PALETTES.lavender.accent, '#d0c2eb');
  assert.equal(THEME_PALETTES.lavender.surface, '#292b33');
  assert.notEqual(THEME_PALETTES.lavender.accent, THEME_PALETTES.sage.accent);

  assert.equal(THEME_PALETTES.rose.accent, '#e6bdce');
  assert.equal(THEME_PALETTES.rose.surface, '#292b33');
  assert.notEqual(THEME_PALETTES.rose.accent, THEME_PALETTES.sage.accent);

  assert.equal(THEME_PALETTES.charcoal.accent, '#d0c8e4');
  assert.equal(THEME_PALETTES.charcoal.surface, '#292b33');
  assert.notEqual(THEME_PALETTES.charcoal.accent, THEME_PALETTES.sage.accent);

  assert.equal(THEME_PALETTES.sage.accent, '#bdd7c9');
  assert.equal(THEME_PALETTES.sage.surface, '#292b33');

  // Verify wallpaper IDs map to correct theme names
  assert.equal(getThemeName('wp-abstract-warm'), 'sand');
  assert.equal(getThemeName('wp-theme-blue'), 'blue');
  assert.equal(getThemeName('wp-theme-lavender'), 'lavender');
  assert.equal(getThemeName('wp-art-rose-terrace'), 'rose');
  assert.equal(getThemeName('wp-art-charcoal-library'), 'charcoal');
  assert.equal(getThemeName('wp-abstract-sage'), 'sage');
});

test('Cache Isolation on Logout: securely persists active account data and purges shared device state', () => {
  const mockStorage = createMockLocalStorage();
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mockStorage });

  try {
    const userId = 'user-auth-123';

    // 1. Setup active user state
    const userSessions: StudySession[] = [
      { id: 'sess-1', subjectId: 'custom-sub', durationSeconds: 2700, mode: 'countup', startTime: 1000, endTime: 3700, date: '2026-10-02' },
      { id: 'sess-2', subjectId: 'custom-sub', durationSeconds: 1800, mode: 'countup', startTime: 4000, endTime: 5800, date: '2026-10-02' },
    ];
    const userSubjects: Subject[] = [
      { id: 'custom-sub', name: 'Advanced Quantum Mechanics', color: '#B7CDEA', createdAt: 500 },
    ];
    const userTasks: TaskItem[] = [
      { id: 'task-1', text: 'Chapter 4 Problems', subjectId: 'custom-sub', completed: false, dueDate: '2026-10-02', category: 'today', createdAt: 100 },
      { id: 'task-2', text: 'Midterm Review', subjectId: 'custom-sub', completed: true, dueDate: '2026-10-02', category: 'today', createdAt: 200 },
    ];
    const userDraft: TimerDraft = {
      mode: 'pomodoro-50',
      status: 'paused',
      targetSeconds: 3000,
      breakSeconds: 600,
      sessionStartTime: 1000,
      accumulatedSeconds: 1500,
      lastUpdated: 2500,
      runningSince: 2000,
      subjectId: 'custom-sub',
    };
    const userSettings: UserSettings = {
      ...DEFAULT_USER_SETTINGS,
      dailyGoalHours: 7,
      weeklyTargetHours: 42,
      activeWallpaperId: 'wp-art-rose-terrace',
      customDisplayName: 'Marie Curie',
    };

    // Save to active shared device storage
    for (const s of userSessions) saveSession(s);
    saveSubjects(userSubjects);
    saveTasks(userTasks);
    saveTimerDraft(userDraft);
    saveUserSettings(userSettings, userId);
    mockStorage.setItem('sanctra_data_owner_v1', userId);

    // Verify shared storage has user's data before logout
    assert.equal(getSessions().length, 2);
    assert.equal(getSubjects().length, 1);
    assert.equal(getTasks().length, 2);
    assert.ok(getTimerDraft());
    assert.equal(mockStorage.getItem('sanctra_data_owner_v1'), userId);

    // 2. Perform Logout: securely cache user's active data and purge shared device state
    persistAccountCache(
      userId,
      {
        sessions: userSessions,
        subjects: userSubjects,
        tasks: userTasks,
      },
      userDraft,
      userSettings
    );
    purgeSharedDeviceState();

    // 3. Verify shared device state is completely purged
    assert.deepEqual(getSessions(), [], 'Shared sessions must be empty after logout');
    assert.deepEqual(getTasks(), [], 'Shared tasks must be empty after logout');
    assert.equal(getTimerDraft(), null, 'Shared timer draft must be null after logout');
    assert.deepEqual(getSubjects(), DEFAULT_SUBJECTS, 'Shared subjects must be reset to default subjects');
    assert.equal(getUserSettings().dailyGoalHours, DEFAULT_USER_SETTINGS.dailyGoalHours, 'Shared settings must be reset');
    assert.equal(mockStorage.getItem('sanctra_data_owner_v1'), null, 'Data owner must be purged');

    // 4. Verify a new guest session starts with a completely clean slate
    const guestId = 'guest-new-456';
    const guestCache = getAccountCache(guestId);
    assert.equal(guestCache, null, 'New guest should have no existing account cache');

    // When guest initializes, it reads the purged shared state
    const guestSessions = getSessions();
    const guestTasks = getTasks();
    const guestSubjects = getSubjects();
    const guestTimer = getTimerDraft();

    assert.equal(guestSessions.length, 0, 'Guest session starts with 0 sessions');
    assert.equal(guestTasks.length, 0, 'Guest session starts with 0 tasks');
    assert.deepEqual(guestSubjects, DEFAULT_SUBJECTS, 'Guest session has clean default subjects');
    assert.equal(guestTimer, null, 'Guest session has no inherited timer draft');

    // 5. Verify logging back into the original account restores all records without data loss
    const restoredAccount = getAccountCache(userId);
    assert.ok(restoredAccount, 'Original account cache must be present');
    assert.deepEqual(restoredAccount.sessions, userSessions, 'Sessions must match original data');
    assert.deepEqual(restoredAccount.subjects, userSubjects, 'Subjects must match original data');
    assert.deepEqual(restoredAccount.tasks, userTasks, 'Tasks must match original data');

    const restoredSettings = getUserSettings(userId);
    assert.equal(restoredSettings.dailyGoalHours, 7, 'User daily goal hours restored');
    assert.equal(restoredSettings.activeWallpaperId, 'wp-art-rose-terrace', 'User wallpaper restored');
    assert.equal(restoredSettings.customDisplayName, 'Marie Curie', 'User display name restored');

    const restoredDraftRaw = mockStorage.getItem(`sanctra_account_timer_${userId}`);
    assert.ok(restoredDraftRaw, 'Timer draft must be saved in dedicated account cache');
    const restoredDraft = JSON.parse(restoredDraftRaw);
    assert.equal(restoredDraft.mode, 'pomodoro-50');
    assert.equal(restoredDraft.targetSeconds, 3000);
  } finally {
    if (prior) Object.defineProperty(globalThis, 'localStorage', prior);
    else delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  }
});
