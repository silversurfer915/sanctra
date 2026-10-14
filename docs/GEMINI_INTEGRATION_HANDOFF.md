# Sanctra integration handoff

Integrated workspace: `/Users/ponhareeshn/.codex/worktrees/sanctra-vip/StudyTimer`, branch `codex/vip-manual-membership`. Main workspace: `/Users/ponhareeshn/Documents/StudyTimer`. Gemini's completed changes were merged, preserving maintenance routing and removal of spaces.

## Uploaded checkpoints
- `08d9a0a`: integrated manual Sanctra Plus+ membership, customization, admin controls and ticket permissions. ₹99 early/year, ₹59/month, ₹159/year; support tickets and manual activation, no gateway.
- `91b2f47`: global day/week/month saved-study rankings, six indexes and ten offline ambient textures with saved YouTube links.
- `2f4d7ef`: timer indicator, redundant Timer only removal, guest directory separation and readable announcements.
- `62a6675`: automatic global participation, Plus+/Trial/Admin public identity, target exam dropdown and linked goal/countdown, administrator Plus+ access, delegated administration, exact trial durations and read-only account inspection.
- Final music batch: reference-inspired Focus audio cards, Search & link and Saved tabs, persistent ambient controller and visible YouTube dock outside the panel. Closing the panel keeps the player mounted. Task date label and picker centered together. Guest logout cleanup no longer blocks authentication logout.

Firebase project: `studyapp-4137d`; hosting: https://studyapp-4137d.web.app. Rules and indexes were deployed with matching client releases. Trusted migration verified three registered accounts backfilled and all six ranking indexes READY. The existing verified administrator has `canManageAdmins=true`; delegated administrators cannot escalate roles or revoke the manager.

## Data and access
Rankings use all account saved sessions, not active unsaved time. Public projections contain selected identity and aggregate totals, never email or session notes. Membership styling is expiry-aware and rules reject forged Plus+/Admin tags. Administrators can read private analytics, sessions, tasks, goals, groups and profile data; inspection does not write to the inspected account. Trials accept minutes/hours/days and protect remaining paid membership time.
Goals are the sole source of the profile exam and countdown. Profile has no exam date editor and saves never create goals. Changing the primary Goal updates the profile; duplicate legacy records with identical IDs or identical profile-generated exams are normalized. Membership revocation atomically clears the public projection, including for offline users; admins retain their role-based Plus+ access.

## Validation and limits
87 unit tests and 31 Firestore emulator rules tests passed for integrated releases; TypeScript and production build passed. Local mobile UI checks cover sound-card layout and persistent ambient/YouTube controls after panel close.
Guest logout deletes its directory presence. Inactivity cleanup after one hour runs while the admin directory watcher is open; there is no server scheduler for off-screen deletion.
YouTube uses its visible native player and controls. Search opens real YouTube search, because no search API integration is configured. Restricted or unavailable videos can fail within YouTube; lock-screen/background browser behavior is browser-dependent. Ambient sounds are generated textures rather than recorded music. Rankings are saved-time aggregates, not proof of actual studying.
Lecture playlists and the syllabus tracker remain future work.

## Useful commands
Use direct binaries because node_modules is linked: `./node_modules/.bin/tsc -b`, `./node_modules/.bin/vite build`, `node --test tests/*.test.ts`.
Rules: `firebase emulators:exec --only firestore --project demo-sanctra 'node --test tests/firebase/rules.test.mjs'`.
Deploy: `firebase deploy --only hosting --project studyapp-4137d` (include rules/indexes only when changed).
Announcement publisher: `node scripts/publish-release-announcement.cjs docs/ANNOUNCEMENT_SHARED_FOCUS.md release-2026-10-02-shared-focus`.
