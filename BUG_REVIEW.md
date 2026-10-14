# Bug review — 1 October 2026

Reviewed the current working tree, including ongoing Gemini changes. No application source was changed by this review. Build initially failed in the unfinished group-room feature; a later build passed after concurrent changes. Lint exits successfully with warnings. No automated test script exists.

## High priority

1. **Running timer recovery double-counts elapsed time.** `src/App.tsx:405–415` persists `accumulatedSeconds: totalActiveSeconds` together with the original `runningSince`. Restoration at lines 327–330 adds the whole segment again. Example: a fresh timer running for 10 seconds saves accumulated=10 and runningSince=start; immediate restoration computes 10+10=20. Save accumulated prior segments separately, or move the persisted timestamp forward when saving a total.

2. **Taking a Pomodoro break discards the completed focus block.** `src/App.tsx:572–578` resets the accumulated focus time before saving a session. Neither the completion path nor the break path persists that block. After a completed focus session, choosing Take Break leaves history unchanged and clears the only duration used by Save Session. Preserve or save the focus block before resetting for break.

3. **User data can cross account boundaries.** `src/App.tsx:223–263` does not clear local state on sign-out, ignores empty remote arrays and null exam goals, and uploads the existing local state for a new account. Account B can inherit account A's sessions/tasks/subjects on the same browser. Empty remote state must be authoritative; local caches need per-user ownership and explicit guest migration.

4. **Auth subscription repeatedly reloads cloud data after state changes.** `handleUserChange` depends on sessions/subjects/tasks/settings/examGoal and is a dependency of the subscription effect (`src/App.tsx:269–288`). Updating any dependency subscribes again. The initial auth callback loads cloud arrays and updates these same dependencies, causing further subscriptions and loads and potentially overwriting local edits with stale data. Keep auth subscription stable and load by UID changes.

## UI and timer flow

5. **Space inside a modal starts the background timer.** Reproduced in browser: open Customize Timer, focus Close modal, press Space. Modal stays open and underlying status changes from Idle to Focusing. `src/components/TimerDial.tsx:33–47` ignores inputs but intercepts buttons and modal controls. Suspend the shortcut while a dialog is open and preserve native button keyboard behavior.

6. **Save reports success for zero study time.** Reproduced: select 25m Pomodoro without starting, click Save Session, then Save. The modal displays 00:00:00, closes, and fires confetti, while `handleSaveSession` returns without saving. `TimerDial.tsx:253` checks countdown display rather than elapsed study time; `SaveSessionModal.tsx:30–44` celebrates before validating persistence.

7. **Local guest is logged out on refresh.** Reproduced in the current Firebase configuration: anonymous login returns admin-restricted-operation, local fallback opens the app, but reload returns to the landing page. `src/utils/firebase.ts:380–382` clears the stored fallback user whenever Firebase reports no user. Local-only guest sessions need their own restoration logic.

8. **Paused breaks resume as focus and break completion leaves Start inert.** `src/App.tsx:464–470` changes a break to generic paused; the paused branch at 460–463 resumes as running, using the focus target. After break-complete, the Start button remains visible, but `handleToggleStart` has no branch for that status. Code-traced; full-length Pomodoro not run in browser.

9. **Room chat stops showing new messages after 50.** `src/utils/groupsService.ts:582` queries ascending timestamp with limit(50), so it keeps the oldest 50. Sending later messages updates a cache but does not notify the view; only the Firestore snapshot updates rendered messages. Use the latest window and an explicit local subscriber update. Code-traced; no messages sent to real rooms.

10. **Group presence and room discovery are demo/local data.** `getGroupMembers` supplies seed peers and in-memory state; it never subscribes to actual remote members. `getAllStudyGroups` reads constants and localStorage, even though custom room creation writes Firestore. Newly created public/private rooms cannot be discovered across devices through this code. Present seeded people as examples until real presence/discovery is implemented.

## Validation limits

- Browser inspected at default width and 390×844 mobile width; timer and timer mode modal fit the tested mobile viewport.
- Guest entry, zero-duration save, modal keyboard behavior, and guest refresh were exercised.
- Account-boundary/cloud-loop and long Pomodoro issues were traced through source; real-account switching and full-duration sessions were not executed.
- Source files changed concurrently during review. Revalidate locations and findings before fixing.
