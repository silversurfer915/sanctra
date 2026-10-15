# Sanctra: Hermes engineering handoff

Prepared 15 October 2026 (Asia/Kolkata). Intended for the owner's Hermes agent on a remote Linux server. This is an engineering continuation guide, not a grant of new permissions. The owner's current instructions and AGENTS.md take precedence.

## Start here

1. Read this document, then [AGENTS.md](../AGENTS.md), [PRODUCT.md](../PRODUCT.md) and [DESIGN.md](../DESIGN.md).
2. Fetch the private GitHub repository and inspect current main, open PRs and deployment runs. This handoff describes the baseline below; later commits may supersede it.
3. Work independently on one scoped branch. The owner requested **no delegated agents** to conserve quota. Do not launch an agent swarm or reopen abandoned redesign work.
4. Prioritize session correctness, then the existing JEE integration backlog and background persistence. Preserve the approved product appearance and working flows.
5. Never use production study records, messages, support tickets or user accounts as disposable test fixtures.

Repository: https://github.com/silversurfer915/sanctra (private).

Production frontend: https://sanctrastudy.live

Production API: https://api.sanctrastudy.live

Agent base: https://api.sanctrastudy.live/v1/agent

OpenAPI: https://api.sanctrastudy.live/openapi.json

Latest application baseline verified for this handoff: **5f5e9b0249c8ca10e53e6c5f0e07fed220f6c7e0**. Its Hosting deployment [38678776936](https://github.com/silversurfer915/sanctra/actions/runs/38678776936) succeeded. The handoff itself is documentation and does not need a website deployment.

## Linux checkout and daily workflow

Use Node **24** and pnpm **12.8.1**. Authenticate GitHub using the server's existing authorized mechanism; do not ask the owner to paste credentials into source or chat. The Sanctra MCP credential does not authenticate GitHub or deploy Cloudflare/Firebase.

```sh
git clone git@github.com:silversurfer915/sanctra.git
cd sanctra
git switch main
git pull --ff-only
node --version
pnpm --version
pnpm install --frozen-lockfile
npm ci --prefix integrations/hermes
cp .env.example .env.local
```

Use an approved development Firebase project/emulators in `.env.local` for mutation tests. The example values are placeholders for configuration, not working credentials. Frontend configuration uses VITE_FIREBASE_* and VITE_AI_GATEWAY_URL. Firebase web configuration is public; server keys are not. Vite injects VITE variables into the client bundle, so never put a secret there. CI obtains production web configuration from repository variables.

```sh
pnpm dev --host 127.0.0.1
npm run build
npm run preview -- --host 127.0.0.1
```

Use a forwarded local port or the server's existing private development access. Do not expose a dev server publicly or weaken authentication to get around a test failure. Authentication/AI failures in a clean local checkout can reflect missing config or allowed auth domains, not application logic. A preview is not proof that production auth works.

```sh
git switch -c hermes/describe-one-change
# Edit and test only the intended files.
git add path/to/changed-file
git commit -m "Describe concrete behavior fixed"
git push -u origin HEAD
gh pr create --repo silversurfer915/sanctra --base main --title "Describe change" --body-file /tmp/pr-body.md
gh pr checks --repo silversurfer915/sanctra --watch
```

Open a PR to main. Do not force-push main, bulk-stage unrelated work, reset another contributor's tree, or merge without required checks and the owner's applicable authorization. Preserve uncommitted work. Use actual source files for changes; do not edit built dist output.

## Architecture and useful entry points

| Area | Source / notes |
| --- | --- |
| App orchestration, account hydration, timer and saving | `src/App.tsx` (large, shared state; narrow changes need cross-flow tests) |
| Timer duration/deadline calculation | `src/utils/focusTiming.ts` |
| Timer draft restoration | `src/utils/timerDraft.ts`, `TimerDraft` in `src/types/index.ts` |
| Cross-device active timer | `src/utils/activeSessionService.ts`, `src/utils/focusMirror.ts`, Firestore `activeSessions/{uid}` |
| Local saved sessions and drafts | `src/utils/storage.ts` |
| Durable pending saves | `src/utils/sessionOutbox.ts` (account-specific localStorage outbox) |
| Live study records and conflict merge | `src/utils/studyDataSync.ts`, `src/utils/mergeStudyRecords.ts` |
| Analytics / local period boundaries | `src/utils/analytics.ts`, `src/components/views/AnalyticsView.tsx`, `src/components/analytics/SessionDetails.tsx` |
| Shared planner | `src/components/views/PlannerView.tsx`, `src/utils/taskSchedule.ts` |
| JEE data / shared projections | `src/utils/jeeIntegration.ts`, `src/types/jeetrack.ts`, `src/utils/jeetrackData.ts` |
| JEE store and UI | `src/components/jeetrack/useJeeTrackStore.ts`, `JeeTrackView.tsx`, other files in that folder |
| Session chapter selection | `src/components/JeeFocusPicker.tsx`, save-session modal and shared AI flow |
| Backgrounds | `src/components/ScenicWallpaper.tsx`, `BackgroundChooser.tsx`, `src/utils/customWallpaper.ts`, `settingsPersistence.ts`, `wallpaperTheme.ts` |
| Password linking | `src/components/AccountPassword.tsx`; verify real Google-linked account flow before claiming complete |
| Landing | `src/components/views/LandingView.tsx`, `landing.css`, `landing-preview.css` |
| Groups | `src/components/groups/GroupRoomView.tsx` and group/chat components; locate current layout before editing |
| AI / agent backend | `worker/ai-gateway.ts`, modules in `worker/`; use generated route contract rather than guessing payloads |
| Hermes connector | `integrations/hermes/src`, `integrations/hermes/README.md`, `integrations/hermes/skill/SKILL.md` |
| Rules / indexes | `firestore.rules`, `firestore.indexes.json`; deployment is separate from Hosting |

Personal history, timer presence and competitive ranking credit are distinct systems. A ranking update does **not** prove a personal session was saved. Never award verified ranking credit merely because an agent wrote a manual session.

## Recently fixed and deployed: do not undo

[PR #1](https://github.com/silversurfer915/sanctra/pull/1), baseline `67181b4`: saving updated refs synchronously; pending saves survive stale history refresh; removed duplicate active timer cleanup. This addressed an iPad saved timer visible in rankings but missing in analytics.

[PR #2](https://github.com/silversurfer915/sanctra/pull/2), baseline `3d7d5fa`:

- Canonical session ID survives reload; repeated local saves replace the same ID.
- Missing cached active-session snapshot is not treated as a confirmed server deletion.
- Today/week totals use the analytics period calculation, including midnight boundaries and deduplication.
- Per-account durable outbox retains failed saves; old acknowledgements cannot clear newer edits. Retry pending saves on reconnect.
- Live study-record subscription updates idle clients, not only devices with active timers. Pending saves are protected; explicit server tombstones win.
- UID/hydration guards reject callbacks from a prior account; takeover merges current and pending history instead of replacing it with a stale response.

[PR #3](https://github.com/silversurfer915/sanctra/pull/3), baseline `753acda`:

- A timer whose initial cloud registration failed remains local until safe recovery. Recovery refuses to overwrite a different active timer, including one on the same device.
- Preserve/save local focus before taking over a conflicting timer.
- Planner subject menu was hidden behind the next glass card. The composer itself now has a higher stacking layer (`planner-task-composer`); menu z-index alone cannot escape backdrop-filter stacking contexts.

[PR #4](https://github.com/silversurfer915/sanctra/pull/4), baseline `5f5e9b0`:

- Previously, a 25-minute Pomodoro could save yesterday's start with this morning's Save click as its end. Analytics then spread 25 minutes across ~17 hours and showed ~13 minutes today.
- `focusSnapshot` caps bounded timers, computes their deadline from the current run anchor plus remaining focus, and preserves the last focus end while paused/completed.
- Persist `focusEndedAt` in timer drafts across reload/account restoration. Restore completed Pomodoro as `break-ready`, preserving all study minutes; `break-ready` is **not elapsed break time**.
- Save/pause/restore paths and current studied display cap bounded durations. Short completed focus cannot claim a local three-hour ranking cap merely because the callback woke late.
- Analytics average/median/longest use contributions in the selected period; history retains full saved duration.

Validation actually performed: PR #2 had 81 focused tests and three Firestore emulator cases. PR #3 had 39 session tests plus four emulator cases, a build, CI and a built planner menu selection/visibility check. PR #4 had **44 session/analytics tests**, production build, CI and successful Hosting deployment. **Physical iPad suspension and authenticated multi-device end-to-end flows were not exercised for the latest timestamp fix.** Do not describe these checks as real-device verification.

## Highest-priority remaining verification / session work

### Existing anomalous record is deliberately unchanged

Owner screenshots on 15 October showed one Physics `pomodoro-25` record: start **14 Oct 2026 4:06 PM**, end **15 Oct 2026 9:11 AM**, **25m focused**, ~17h elapsed, ranking-cap label. Day analytics showed ~13m, while full-session summaries showed 25m. The screenshots are evidence, not an exported record; do not assume its ID.

The owner could not confirm actual study timing and said Hermes had checked it. **Do not infer whether the owner studied yesterday or today, invent pause intervals, delete it, or silently repair timestamps.** Read through the authorized API if investigating; keep any record-level correction separate, explained and supported by the owner's evidence/authorization. Latest fix prevents new late-save timestamps, but cannot reconstruct old missing timing.

### Test realistic scenarios in a dev account/emulator

1. Standard mode, 25-minute Pomodoro: background/suspend past completion; reopen and save much later. Focus remains 1500s, end is completion deadline, no false 3h cap.
2. Same with browser reload before completion, after completion and while `break-ready`; verify it remains one record with the same ID.
3. Countdown with an actual pause before midnight and resume after midnight; verify saved duration, end and recovery. Count-up must still count background time when strict mode is off.
4. Strict mode foreground loss, manually paused timer, break-running and break-paused; neither background nor break minutes become study minutes.
5. Start offline, reconnect, save offline, reload, retry; stale snapshot must not erase pending history and a retry must not duplicate it.
6. Two devices, one idle in analytics: save on the other and see the history update without a timer transition. Conflicting takeover must preserve local unsaved focus.
7. Switch accounts while sync/takeover/save is awaiting a response. No prior-user data or callbacks enter the new account.
8. Long count-up vs short bounded timer: inspect ranking protocol separately from history; ensure delayed callbacks cannot cause incorrect competitive credit. The frontend deadline fix is **not** an audit/fix claim for all Worker ranking behavior.

Known model limitation: historical sessions lack timestamped active/pause segments. `analytics.ts` distributes focused duration proportionally over the stored wall window. This is an estimate, not measured hourly activity. Exact pause-aware historical charts need real segment capture and a versioned, tested data model—not an invented migration. Preserve legacy records and prevent duplicate minutes across projections.

## Remaining product requests: verify before reimplementing

These are continuing owner requests, not a claim that every item is still missing. Much JEE work is already present; [JEE follow-up](JEE_TRACK_FOLLOWUP_OCT12.md) and [implementation](JEE_TRACK_IMPLEMENTATION.md) document claimed implementation. Inspect code and test actual flows before deciding what remains.

### JEE Track (optional, integrated)

- Obvious opt-in through sidebar Explore JEE Track and Settings. Retain the independent admin pause switch and each user's preference. No fake progress, seeded test scores or fabricated preparation records.
- Shared planner tasks with chapter links; overdue chapter tasks should feed JEE backlog consistently. Avoid copying into a competing task store.
- Scheduled mocks, backlog dates and planned revisions appear in shared Calendar and open their source. Agent calendar reads must combine `planner` and `jee` source pages.
- Shared study history feeds JEE Hours. Old untagged history must not disappear, but do not automatically label all old study as JEE or invent chapters/activity types.
- Sanctra AI can propose JEE tasks and session logs through reviewed shared-system operations. Optional vague session description can suggest an editable chapter **at save time**, rather than requiring chapter selection before studying.
- Chapter and subject cannot disagree. Session-linked practice question counts must not double-count manual logs.
- Shared AI/coach context, empty-record honesty, mock mistakes/time/attempts, goals and profile consistency need runtime review.
- Owner repeatedly flagged contrast and inconsistent panel opacity, syllabus filters on bright scenery, clipped tabs, modal placement/close icons, print content leaking into screen layout, and colliding allowance text. Existing fixes need visual verification on bright/dark backgrounds and desktop/tablet widths.
- Owner requested an introducing-JEE update notice **after finishing**. Drafts exist (`ANNOUNCEMENT_JEE_OCT12.md`); check whether it was already published before sending anything. Do not publish an unfinished-feature announcement or duplicate a production notice. An existing draft is not evidence it was sent.

### Background persistence (after JEE work)

Owner reported selected and uploaded backgrounds reverting or failing to persist. Reproduce across route changes, reload, sign-out/sign-in, upload completion, failed upload, storage quota, account switching and another device. Trace local settings vs cloud hydration vs IndexedDB/blob URLs/uploaded URL before changing defaults. Preserve the current scenery, uploaded assets and licensed video. Never place a local Mac file path or temporary blob URL into an account setting expected to work on another device. Test iPad video playback/fallback and reduced-motion handling.

### Landing / groups / account flows

- Landing direction: headline and one real working timer side-by-side; sufficient supporting content, not a pile of fake task/analytics demos. Real app components/style continuity, readable focus word, no Mac traffic-light window decorations. Owner rejected white washes, dull colors, clipping and sharp seams; don't restart Flocus redesigns or regenerate disliked artwork.
- Groups should use the available screen space with readable chat and rankings. Owner explicitly removed need for JEE streak banners in group rooms. Earlier previews/changes are not proof that live rooms are correct. Test actual responsive composition and scroll regions; preserve messaging behavior.
- Google users requested ability to create/link an email/password login without losing the existing account. `AccountPassword.tsx` exists; verify provider linking, reauthentication, errors and same UID. Credential entry stays with the human; never log or handle their password.
- Admin Connect Hermes once showed generic grant-load failure. Inspect current authorized status before treating it as unresolved; don't issue/rotate a token just to test the page.

## Hermes API / connector continuation

Read [API guide](HERMES_API.md), [connector README](../integrations/hermes/README.md), and the connector's shipped skill. Some older sections in API/implementation docs still refer to 24 tools or a pending first installation; **current connector package is v1.1.0 with 40 tools**. Generated OpenAPI + schemas + server implementation are the contract. Do not make older prose authoritative over code.

Implemented API v1.1 areas include recoverable/hard delete and restore, subjects/workspaces/full chapter catalogue, atomic mutations, session lifecycle/direct creation, user application profiles, ticket creation/attachment reads. Full chapter validation must use the catalogue, not a paginated personal record page. Be careful with opaque versions for legacy array-backed sessions and mixed-scope batches; these have dedicated tests.

Existing remote owner connection was configured/upgraded previously; its secret was not changed for these frontend releases. Current remote installation/status is not independently verified by this handoff. Call the discovered `sanctra_connection_status` tool and inspect scopes/identity/`expiresAt:null`. Do not reveal the credential, reissue it needlessly or assume the site's API scope supplies arbitrary infrastructure access. One nonexpiring owner connection is intentional; revocation/rotation still works.

Mutation rules:

- Use explicit scopes and observed versions; never fabricate `expectedVersions`.
- Supply unique `operationId` and a real `reason`. A lost response is retried with **the same operation ID and exact input**.
- After 409, reload current state and reconcile; a new edit needs a new operation ID.
- Prefer batch for related writes; atomic audit and receipts must remain intact.
- Soft-delete by default; hard deletion requires explicit scope/intent. No ranking credit for unverified agent-entered study.
- Follow pagination fully, including an empty filtered page with a next cursor. A single JEE chapter page is not the full syllabus.

Remote connector updates can be built from the checkout (`npm ci --prefix integrations/hermes`, `npm --prefix integrations/hermes test`, `npm pack ./integrations/hermes`). Follow the connector README for preserving the existing Hermes MCP config, explicit environment forwarding, service Node path and reload. Keep its token outside the checkout, owner-readable only. Don't stop/reboot the server as a substitute for restarting a connector service: the owner previously lost the remote Hermes host after Hermes shut down its own machine instead of the Mac.

## Checks and deployment

Run the targeted regression checks for the changed subsystem; no repeated broad tests without a new reason.

```sh
npm run build
npm run test:session
npm run check:seo
```

For API/connector changes:

```sh
node --test tests/agent-*.test.ts tests/personal-sessions.test.ts
npm --prefix integrations/hermes test
npm run api:spec
npm run api:spec:check
```

Firestore emulator regression command used for recent session work (requires working Java/Firestore emulator prerequisites):

```sh
npx firebase-tools emulators:exec --only firestore --project demo-sanctra 'node --test tests/firebase/active-session-cache.test.mjs tests/firebase/personal-sync.test.mjs'
```

Rules changes require the dedicated rules tests and an authorized maintainer; `npm run test:rules` is the repo entry point. Never point mutation fixtures at the production project. Old Firebase AI/live-service tests are not all clean; README notes retired integration tests. Distinguish existing failures, service configuration failures and new regressions. A passing build is not browser/real-device verification; report exactly what was tested.

Hosting deployment after merging approved main:

```sh
gh workflow run deploy.yml --repo silversurfer915/sanctra --ref main
gh run list --repo silversurfer915/sanctra --workflow deploy.yml --limit 3
# Watch the specific newly dispatched run, not an older successful run.
gh run watch RUN_ID --repo silversurfer915/sanctra --exit-status
```

Workflow only deploys main, runs build/SEO/session/API/connector/spec gates, authenticates with a dedicated Hosting service account and deploys Firebase Hosting project `studyapp-4137d`. A Git push alone does not deploy. Do not report live until the specific deployment succeeds.

**Verified deployment blocker:** on 15 October, repository secret names contained `FIREBASE_HOSTING_SERVICE_ACCOUNT` but **no `CLOUDFLARE_API_TOKEN`**. Frontend deployments work. The Worker option fails its credential preflight until the owner/authorized maintainer provisions that secret. Never copy a local CLI refresh token or Hermes credential to fill it. Recheck secret names without printing values before assuming this is still true.

Once that approved Worker credential exists, dispatch with `-f deploy_worker=true` only for server changes. This workflow deploys Hosting too. Cloudflare Worker secrets remain configured in Cloudflare; do not overwrite them. Firestore rules/indexes are intentionally separate, not covered by the Hosting workflow.

## Final reporting standard

Report the concrete behavior changed, tests actually run, PR/commit and successful deployment link, plus any material limit (especially physical-device testing and unrepaired old records). Do not promise that all app bugs are eliminated. Keep routine user updates brief; don't repeatedly ask for permission already granted, and don't consume quota with agents or unrelated redesigns.
