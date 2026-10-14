## October 2 Community and identity release — deployed

Hosting and Firestore rules uploaded to studyapp-4137d / sanctrastudy.live. Production bundle index-DyR4QRxw.js and stylesheet index-CsbAeI1_.css. Full themed Profile, intention onboarding, optional global/per-exam competitive rankings, private ticket support, separate owner Admin with all public/private groups and paginated complete chat inspection, rich announcement studio and operational feature controls. Required moderation reason/audit; group deletion retains records. 35 unit + 20 rules tests passed before upload. Production Profile and release assets verified; announcement release-2026-10-02-community-and-identity published and read back. User then requested immediate upload with no further checking; upload was already complete.

Planned pricing exactly as requested: ₹59/month, ₹159/year, limited ₹150/year early-user offer. Billing and paid entitlements remain unimplemented; no fake active subscriptions. Read docs/COMMUNITY_RELEASE.md, docs/SANCTRA_PLUS_PLAN.md and docs/ANNOUNCEMENT_COMMUNITY_OCT_02.md. Ranking totals are client-reported and UTC-scoped; no anti-cheat claim. No production fixture accounts/groups/tickets created. Existing records preserved.

## October 2 Groups and timer-only release

Groups is now live, replacing the construction gate. Read `docs/GROUPS_RELEASE.md` for lifecycle, roles, live presence/leaderboards, data boundaries and validation. Support stays locked. The centered Timer only view is available beside timer controls. Production rules and Hosting deployed, bundle `index-2wHHe_ck.js`. TypeScript/build, 31 unit tests and 15 emulator tests pass. Existing user/group data preserved; no production test groups/messages/sessions created.

## Task countdown, flowing light, new scenes — October 2, 2026

Published `index-CH2Bq50w.js`. Focus on task immediately starts custom countdown: remaining slot seconds if current, full duration if early, expired slot rejected; untimed focus uses count-up. Existing unfinished focus autosaves before switching; same running task is idempotent. Coordinated Golden Reading Nook / Rose Garden Terrace / Moonlit Library assets and thumbnails added. Charcoal-library palette precedence fixed. Abstract artwork stays stationary; two independent soft-light fields animate background positions/opacities in 23s/31s loops, no artwork camera motion; reduced-motion honored. Build + 27 tests pass. Production theme chooser and Moonlit Library verified; computed abstract artwork animation is none, light animation active. Announcement `release-2026-10-02-focus-and-scenes` published through existing verified owner, read back and visible in Inbox. Exact announcement source in docs/ANNOUNCEMENT_OCT_02.md, planned features explicitly distinguished.

## Clearer analytics and scheduled tasks — October 2, 2026

Live bundle `index-C7FOUCoj.js`. Replaced date pills/hour bars with labeled area charts, cumulative hourly focus, seven-column calendar, today goal ring, and explicit goal-days ring. Active days replaces ambiguous consistency ratio. Timed tasks add optional HH:mm start/end on their own dueDate, editable topic/date/subject/slot, date picker, Focus action, timer current/next task bar. No today incomplete timed tasks means no schedule bar; tomorrow tasks excluded until tomorrow. End is exclusive; overlaps choose earliest start then creation order. Slots must end after start on the same date. Bar refreshes every 15 seconds. Focus selects subject and adds task topic to saved notes; timer start stays explicit and tasks never auto-start the timer. Existing data untouched. Build and 26 tests pass. Sample-only no-storage preview verified chart values, focus action, completed-task disappearance, narrow layout. Production startup/analytics verified; guest has no real sessions/tasks. Temporary QA files removed.

## Analytics engine — October 2, 2026

Published `index-CI4Q6GCI.js`. New day/week/month local-calendar ranges, previous-period navigation/comparison, subject-wide filtering, clickable daily detail, average/median/longest sessions, active-day averages, goal consistency, strongest day, peak hour, subject and timer-mode breakdowns. Session history adds inclusive date-range filters, search, complete start/end dates and times, focus vs elapsed duration, full multiline notes, pagination and delete confirmation. Existing records preserved. Daily/hourly focus is proportionally estimated over wall intervals because pauses have no timestamps. Cross-boundary sessions count as overlapping records; history shows full duration. Comparisons use the full prior period (not equal elapsed portions). TypeScript/build pass and 23 unit tests pass; live day/week/month navigation and history controls verified with an empty guest record.

## Pastel subject palette — October 2, 2026

Published bundle `index-Ct7-XtXe.js`. Subject Tracker now offers ten soft pastel colors blended lightly with the active theme. Existing stored colors are preserved; tracker dots are softened for display. Dark selection check improves contrast. TypeScript and Vite build pass; production palette verified visually.

# Latest admin release

Admin announcement editing/archive, account restrictions with reasons/expiry, platform heartbeat directory and audit, private ticket infrastructure, construction gates, Blue Mist morning default and Subject Tracker refinement are deployed. Public Groups and Support remain locked per user. Read `docs/ADMIN_RELEASE.md` for boundaries and verification. 20 unit tests and 12 emulator tests pass. Latest custom-domain bundle `/assets/index-ILiqk1UH.js`.

# Sanctra — Gemini handoff

## October 2 deployed appearance checkpoint
The user approved and requested production upload of the premium appearance pass. **Hosting deployment succeeded**, and the custom domain was browser-verified serving `/assets/index-ILiqk1UH.js`. Six muted coordinated themes with original soft fold artwork and distinct flow directions, three illustrated scenes including Cloudside Study Desk, clearer glass, seamless fading sidebar tint, unblurred header, aligned brand/status/history controls, themed loading screen with an initial-only 1.8 second minimum, theme-matched accent utilities and logo, subtle landing motion and wobbling loading orbits, readable Google auth button, sidebar/Settings exit animations, planner alignment and working landing countdown are live. See `docs/THEMES_RELEASE.md` for scope and verification. No rules changes or data reset were performed.

Next scope requires user visual satisfaction first: reproduce and repair group exiting, owner deletion, offline-member display and remaining group functionality. Do not claim those reported issues fixed by this appearance release. Music remains coming later.

## Start here
Workspace: `/Users/ponhareeshn/Documents/StudyTimer`.
Branch: `codex/existing-feature-repair`.
Firebase project: `studyapp-4137d`. Domain: https://sanctrastudy.live/.

The user subsequently returned UI work to Codex and approved the deployed glass design and coordinated themes. Preserve the existing app structure and the restrained colors. Earlier UI ownership decisions below are historical. The new UI skills are available under `.agents/` and `/Users/ponhareeshn/.agents/skills/`. Do not blindly stage that untracked skill directory.

## What is deployed vs local

- **Hosting live:** October 2 appearance release, custom-domain script `/assets/index-ILiqk1UH.js`, from the current workspace production build. Core features below remain included.
- **Backend live:** Firestore Standard in Mumbai, deletion protection enabled, Google/anonymous auth, six official rooms, updated rules supporting persistent memberships, inbox announcements and mentions.
- **Admin live:** the existing verified owner Google account matching the configured Firebase support email has an `/admins/{uid}` marker. No client can grant this role. The owner must sign in with that account to see “Write announcement”. No announcement was sent on the user's behalf.
- **New core frontend is deployed:** persistent multiple group memberships, primary group ordering/switching, explicit leave, inbox, mention picker, read/mute preferences, layout containment/navigation fixes. Build this workspace when deploying; do not upload stale `dist` from an earlier build.

## Implemented core features

1. `/users/{uid}/community/preferences` stores joinedIds, primaryId, mutedIds, readIds. Local guests have UID-scoped local equivalents; older joined-room lists are preserved/migrated. Local guest upgrades merge membership sets while retaining the existing account's primary group.
2. “Browse groups” and “All Rooms” close the room view without leaving membership. “Leave group” explicitly removes membership and sets its member record `joined:false`; private chat access is revoked. Multiple groups can stay joined; primary remains first. Limits: 100 memberships, 100 read markers.
3. Presence is updated across joined groups while the timer is used. A write barrier prevents an already-running heartbeat from silently undoing an explicit leave. Room switching no longer marks the user as having left the group.
4. Inbox has announcements, group mentions, unread/read state, detail view, open chat, and group mute/unmute. Admin announcements are immutable and bounded by rules. No fake announcements or counts are seeded.
5. Group chat mention picker stores stable `mentionUids` alongside visible @names. Inbox queries mention-indexed messages, rather than depending on the latest 80-message chat window. Maximum 20 notified members per message; chat text remains limited to 200 characters.
6. Footer/header containment and small-screen form wrapping repaired. Mobile menu label follows the actual open state. Repeated inbox navigation to the same group reopens the intended group correctly.

## Important source files

- `src/utils/communityState.ts`: pure normalization/join/leave/order/upgrade helpers.
- `src/utils/community.ts`: local/cloud preferences; event updates.
- `src/utils/groupsService.ts`: membership presence, leave barrier, chat and mention subscriptions.
- `src/components/views/GroupsView.tsx`: join/leave/switch/primary controls, background presence.
- `src/components/groups/GroupRoomView.tsx`: mention selection and chat.
- `src/utils/inboxService.ts`, `src/components/views/InboxView.tsx`: admin announcements and inbox.
- `firestore.rules`: private account, room/member, inbox role and announcement authorization.
- `src/App.tsx`: account transfer, route/menu state, scroll containment.

## Verification completed

- 17 unit tests passed, including multi-membership ordering, explicit leave state, guest upgrades and the original timer/account/analytics tests.
- Seven Firestore emulator tests passed. New checks cover leave revoking private chat access, owner-only preferences, no self-assigned admins, and only provisioned admins publishing announcements.
- Isolated **live SDK** verification passed for cloud membership preferences, cross-account privacy, indexed mentions, leave revocation, and non-admin publishing denial, alongside original account/invite/chat checks. Temporary test users/private room were cleaned afterward; no real records were reset.
- Browser local checks: joined a second group, switcher showed primary first, both memberships survived refresh, explicit leave changed the room back to “Join group”, inbox rendered, and the planner had 375px scrollWidth at a 375px viewport with content below the header.
- TypeScript/Vite build passed. Lint exits successfully with warnings. Production bundle is still approximately 321 KB gzip; optimize later rather than claiming that warning is fixed.

## Gemini UI work requested

Use the provided screenshots and inspect groupstudytimer.com landing/groups/inbox. Produce premium, calm styling without replacing the app's structure: stylish Sanctra brand signature, impressive nature landing, tidy planner/groups/analytics/inbox, restrained button/menu/sidebar transitions, reduced-motion support, and mobile overflow/overlap checks. User explicitly deferred this to Gemini. Do not claim it is finished.

Reference parity limitations: historical Yesterday/Week/Month group rankings, rich media/voice chat and reference-only subsystems are not implemented. Current group rankings use recorded focus today. Do not invent historical group totals. No background copying from the reference is needed; existing optimized assets are available.

## Remaining release verification

- Sign in in a normal browser with the owner's Google account, verify admin composer and publish only an actual owner-approved update. The in-app browser previously hit an anonymous auth network error; direct Node live SDK tests passed. Normal-browser sign-in/linking and two-browser mention delivery still need end-to-end verification.
- Cloud memberships load on mount; cross-device preference changes are visible on refresh. Presence/chat themselves use realtime subscriptions.
- Firestore rules are prototypes; review before broadly sharing the product. Private IDs/codes act as invitation capabilities. Do not reset the database, rotate IDs, replace Firebase, or put credentials into the handoff.

## Run and upload

```sh
cd /Users/ponhareeshn/Documents/StudyTimer
pnpm test
pnpm test:rules
pnpm build
pnpm lint
pnpm deploy
```

`pnpm deploy` builds a production bundle and deploys **Hosting only** to the existing project. The latest backend rules are already deployed. After upload, verify https://sanctrastudy.live/ and the new hashed script on that domain. No data wipe/migration is needed.

For local cloud testing: `VITE_CONNECT_LIVE_FIREBASE=true pnpm dev`. Default Vite development intentionally stays local. `pnpm build && pnpm preview` also uses the live production Firebase configuration.

If rules are edited, test them before deploying:
`pnpm dlx firebase-tools deploy --only firestore:rules --project studyapp-4137d`.

Do not re-run admin provisioning unless necessary. The exact-owner script is `scripts/provision-inbox-admin.cjs`; it uses existing CLI login and refuses an unverified account. Never export or print authentication tokens/password hashes.

## Paste this to Gemini

“Read GEMINI_HANDOFF.md in /Users/ponhareeshn/Documents/StudyTimer. The tested group/inbox core commit 1cd3b65 and its rules are already live. Your local UI edits were preserved and excluded from this release. Keep all data and IDs. Finish the premium calm UI using my references, verify normal-browser owner sign-in and two-browser mentions, then build and deploy this workspace with pnpm deploy. Verify sanctrastudy.live afterward. Do not reset Firestore or overwrite existing account records.”
