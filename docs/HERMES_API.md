# Sanctra Hermes API v1

Base URL: `https://api.sanctrastudy.live/v1/agent`. Production access is **owner-only**: the creator must equal the server's `PERSONAL_OWNER_UID` and have a current, enabled administrator record. A removed or disabled role blocks reads, writes and receipt replay. Personal tokens never authenticate this API.

The owner's 13 October instruction supersedes the original expiry design: exactly one active Hermes connection; newly issued credentials **never expire** (`expiresAt:null`). Revocation and atomic rotation remain available. Historical finite expirations, if present, remain enforced. Grant creation is interactive, never an agent tool.

## Transport and responses

Use `Authorization: Bearer TOKEN`. Agent server clients omit Origin. Browser requests must match the configured Sanctra origin. Grant management requires that exact browser origin plus a cryptographically verified Firebase ID token. CORS does not authenticate a request.

Successful response: `{ "apiVersion":"1", "data":..., "versions"?:{...}, "nextCursor"?:string|null, "receipt"?:{ "operationId":string,"replayed":boolean } }`.

Errors: `{ "apiVersion":"1", "error":{ "code":string,"message":string,"retryable":boolean } }`. Codes: `unauthenticated` (401), `expired` (401, legacy grants), `reauthentication_required` (401), `forbidden` (403), `validation` (400 or 413), `missing` (404), `conflict` (409), `rate_limited` (429), `unavailable` (503). Upstream payloads and credential material are never returned in errors. An unavailable write may already have committed: intentionally retry the **same** operation ID and unchanged body to learn its receipt; never generate another ID automatically.

Bodies are streamed with a 256 KiB limit. Responses are limited to 1 MiB; request a smaller page if needed. Maximum 60 successful operations per grant per minute, with the configured edge rate limit applied additionally. Authorization, target reads, mutations, receipts and audit share one mandatory Firestore transaction. A failed audit prevents release of read data and rolls back mutations. Firestore transaction contention is retried up to four attempts, rechecking authorization and expected versions.

Every mutation uses:

```json
{
  "operationId": "hermes-example-001",
  "reason": "Correct the saved study note",
  "expectedVersions": { "account": "observed-update-time", "session": "" },
  "input": { "notes": "Reviewed motion graphs" }
}
```

Identifiers and operation IDs match `[A-Za-z0-9_-]{1,128}`; reason is nonblank and at most 500 characters. Expected versions are opaque Firestore versions returned by the corresponding reads. An empty string explicitly means the document was absent. Reused operation IDs are scoped to a grant and a canonical, key-sorted payload hash; different input returns conflict. Replays recheck current owner/admin/grant authority before returning the original result. Mutation results return committed versions for study/profile writes. Use those versions or reload before an unrelated later edit. Atomic batches reuse one observed account version.

Read lists normally return `data.items`. Page size defaults to 25 (ticket messages 50), maximum 100; pass `limit` and opaque `cursor`. Follow `nextCursor` until null/absent, including empty filtered pages. Cursors bind target, filters and sort; array-backed study cursors also bind the account version. Documents sort by ID ascending. These are paginated reads, not snapshot exports. Unknown/duplicate query keys and unknown write fields are rejected.

## Owner grant management

Management uses the Firebase token, never an agent credential. New issuance/rotation requires sign-in within five minutes (`auth_time`); token refresh alone does not satisfy this requirement.

| Method | Route                | Input/result                                                                                               |
| --- | --- | --- | --- |
| GET    | `/grants`            | `limit,cursor`; returns `data.grants` for the signed-in owner only; exhausted `nextCursor` is omitted      |
| POST   | `/grants`            | `{operationId,reason,label,scopes}`; label 1–100 characters, explicit nonempty unique approved scopes      |
| POST   | `/grants/:id/revoke` | `{operationId,reason,expectedVersions:{grant}}`                                                            |
| POST   | `/grants/:id/rotate` | `{operationId,reason,expectedVersions:{grant},label?,scopes?}`; omitted label/scopes retain the old values |

Summary: `{id,label,creatorUid,scopes,createdAt,expiresAt:null,revokedAt:null|string,version}`. Times are ISO strings. First successful create/rotate returns HTTP 201 with `data:{grant,token}`. Token format is `sanctra_agent_<22 character random ID>.<43 character random secret>`. Only its SHA-256 secret hash persists. Token examples must use fake values; do not put a live token in a URL, source file or report.

Issuance receipts contain the grant ID and payload hash, **never** plaintext credentials. Same-operation replay returns metadata with `secretUnavailable:true`. If a response is lost, list grants and revoke the uncertain grant before reissuing. A second active issuance returns conflict. Rotation revokes the old credential and replaces the owner slot in one transaction. A stale management version returns conflict. Manage only your own grants; the API does not promote admins or widen personal-token privileges.

## All 24 tool routes

Tool names have the `sanctra_` prefix. All user routes require an explicit UID.

| Tool suffix           | Method/path                               | Scope            | Input or query                                                                            |
| --- | --- | --- | --- |
| connection_status     | GET `/connection`                         | valid connection | no input                                                                                  |
| list_users            | GET `/users`                              | users:read       | page, optional `search` (1–200 chars)                                                     |
| get_user              | GET `/users/:uid`                         | users:read       | no input                                                                                  |
| get_analytics         | GET `/users/:uid/analytics`               | study:read       | date range                                                                                |
| get_sessions          | GET `/users/:uid/sessions`                | study:read       | page, range, optional `status`                                                            |
| get_tasks | GET `/users/:uid/tasks` | study:read | page, range, `completed=true` or `completed=false` |
| get_calendar | GET `/users/:uid/calendar` | study:read | page, range, `source=planner` or `source=jee` |
| get_jee               | GET `/users/:uid/jee`                     | study:read       | page, optional `kind`                                                                     |
| create_tasks          | POST `/users/:uid/tasks`                  | study:write      | `{tasks:[task...]}`, version `account`                                                    |
| update_task           | PATCH `/users/:uid/tasks/:taskId`         | study:write      | partial task, version `account`                                                           |
| complete_task         | POST `/users/:uid/tasks/:taskId/complete` | study:write      | `{completed:boolean,completeJeeChapter?:boolean}`, `account` and conditional `jeeChapter` |
| schedule_sessions     | POST `/users/:uid/sessions/schedule`      | study:write      | `{sessions:[scheduled...]}`, version `account`                                            |
| update_session        | PATCH `/users/:uid/sessions/:sessionId`   | study:write      | session patch, versions `account`, `session`, conditional `jeeChapter`                    |
| list_tickets          | GET `/tickets`                            | support:read     | page, optional `ownerUid`, `status`                                                       |
| get_ticket            | GET `/tickets/:id`                        | support:read     | message page; returns `data.ticket`, `data.items`, `versions.ticket`                      |
| reply_ticket          | POST `/tickets/:id/replies`               | support:write    | `{text}`, version `ticket`                                                                |
| set_ticket_status     | PATCH `/tickets/:id/status`               | support:write    | `{status}`, version `ticket`                                                              |
| get_ai_controls       | GET `/ai/controls`                        | ai:read          | optional `uid`; returns config, optional access, `aiConfig`/`aiAccess` versions           |
| get_ai_usage          | GET `/users/:uid/ai/usage`                | ai:read          | page                                                                                      |
| set_user_ai           | PATCH `/users/:uid/ai`                    | ai:write         | AI user patch, version `aiAccess`                                                         |
| set_global_ai         | PATCH `/ai/controls`                      | ai:write         | AI global patch, version `aiConfig`                                                       |
| get_platform_controls | GET `/platform/controls`                  | platform:read    | no input; version `platform`                                                              |
| set_platform_controls | PATCH `/platform/controls`                | platform:write   | platform patch, version `platform`                                                        |
| get_agent_audit       | GET `/audit`                              | audit:read       | page; current owner's records only                                                        |

Date range: optional `from`/`to` inclusive `YYYY-MM-DD` and `timezone` (IANA). Calendar defaults to the current date through the next 30 days in the saved timezone, falling back to Asia/Kolkata; maximum 366 days. DST gaps and ambiguous local scheduling times are rejected. Saved timestamped history is filtered in the requested timezone; time-of-day-unknown records retain their recorded date.

## Study input schemas and fidelity

Task: `{text:string(1..500),dueDate:YYYY-MM-DD|"",subjectId?,workspaceId?,startTime?:HH:mm,endTime?:HH:mm,jee?}`. Create accepts 1–30 tasks. Update accepts a nonempty partial task. Completion is separate and never adds study time. Saved subject/workspace IDs must exist. A recognized physics/chemistry/maths subject cannot contradict a JEE tag.

JEE tag: `{subject:"physics"|"chemistry"|"maths",chapterId:integer(1..100000),kind:"lecture"|"practice"|"revision"|"mockAnalysis",questions?:integer(1..10000)}`. Question counts require practice and are only recorded when explicitly supplied. Chapter IDs are validated against the full canonical syllabus (including chapters without progress records), or an existing custom cloud chapter. The full catalogue endpoint provides authoritative IDs.

Scheduled session: `{subjectId,date,startTime,plannedDurationSeconds:integer(1..86400),timezone?,title?:string(1..500),notes?:string(0..5000),jee?}`. Accepts 1–30 sessions. Duration and local start time are mandatory. Split plans crossing local midnight into separate daily sessions; the shared planner stores same-day time ranges. Writes shared `users/{uid}.tasks` and `personal_sessions` together, attributed to the real owner/grant with `source:"agent"`. Actual duration and competitive credit start at zero. A plan is not a completed study session.

Session patch: `{notes?,subjectId?,date?,startTime?:epochMilliseconds,durationSeconds?:integer(0..86400),scheduledStart?:ISOInstantWithOffset,plannedDurationSeconds?,completeJeeChapter?:boolean,jee?}`. Active timers cannot be edited. Historical sessions use actual time fields; planned sessions use scheduling fields and cannot be completed by inventing elapsed time. Rescheduling updates the shared planner task. Historical browser records remain editable even without a canonical document (`session:""`); competitive-credit fields are preserved, including the implicit original duration of legacy records.

Explicit `completeJeeChapter:true` updates the corresponding canonical/custom chapter with its `jeeChapter` version. Lecture marks theory, practice marks practice. Generic browser-only syllabus completion is unavailable and rejected explicitly. No inferred question totals, test marks, percentiles or competitive credit are created.

`get_sessions` defaults to saved completed history (deduplicated by ID), including unlinked records and per-item account/canonical session versions. `status=planned|active|abandoned` pages the canonical collection instead; date filtering applies to the current canonical page, and `filterScope` states this. `status=completed` is saved history. Follow the cursor even if a canonical page contains no matches.

`get_calendar` exposes **two independently paginated sources**: default `planner` projects shared tasks and saved calendar events through the browser's recurrence/timezone implementation; `jee` projects saved mock schedules and dated unfinished backlogs through the existing JEE calendar helper. Request and combine **both sources** for the complete shared calendar. JEE record pages may be empty after filtering, while still returning a next cursor. `source`, `filterScope` and `range` make this explicit. No browser-only unsynced data is available.

JEE kinds: `chapter`, `tests`, `upcoming`, `backlogs`, `practiceLogs`, `hours`, `preference`. All return explicit field projections and per-record versions. Profile/exam-date preferences and test chapter mistakes are projected with nested allowlists. Missing cloud records remain absent. Analytics reports saved-history duration/session counts and unlinked counts; it does not treat planned work as studied time.

## User/support/control projections

The directory starts from `platform_users`, then joins the selected page's saved account, profile, subscription, moderation and admin records. Optional search filters the current directory page (`searchScope`); continue paging to resolve names. User results explicitly project saved settings/subjects and status; no password, hash, auth token, infrastructure credential or raw account dump is returned. Inline media is omitted and represented by presence/attachment metadata.

Ticket status: `open|in_progress|resolved`. Replies require text 1–5000 characters and an open/in-progress ticket; reopen before replying to a resolved ticket. The operation-bound message ID prevents duplicates. Stored attribution is `senderUid:<owner UID>`, `senderName:"Hermes · Administrator"`, `channel:"agent"`, `agentGrantId`. Browser clients cannot spoof these extra fields. Attachments return bounded metadata, never inline uploads.

AI user patch: `enabled:boolean`, `extraDaily:integer(0..1000000)`, `dailyLimit:null|integer(0..1000000)`, `requestsPerMinute:null|integer(1..60)`.

AI global patch: booleans `enabled,chatEnabled,manualEnabled,validationEnabled`; `maintenanceMessage` nonblank 1–300 characters; `model` empty or `gemini-[A-Za-z0-9._-]+`, maximum 100 characters; `requestsPerMinute` 1–60; `inputPricePerMillion,outputPricePerMillion` finite numbers 0–1000. Bounds and attribution fields follow existing browser/rules validation. Unspecified fields are preserved.

AI usage reads the actual immutable `ai_usage_events/{uid}/requests` receipts written by `worker/ai-admin.ts` alongside daily aggregates. It projects model, request/completed/failed counts, token counts and cost micros. Historical events lacking a timestamp do not receive an invented one; date filters and daily aggregates are not claimed by this paginated event endpoint.

Platform patch booleans: `groupsEnabled,supportEnabled,rankingsEnabled,maintenanceMode,syllabusEnabled,jeeTrackEnabled,sitePaused,chatEnabled,chatAttachmentsEnabled,groupCreationEnabled,announcementPopupsEnabled`. Strings: `notice` ≤300, `maintenanceMessage` ≤2000, `maintenanceEta` ≤150; `noticeType=info|warning|maintenance`. Epoch milliseconds: `pauseStartsAt,pauseEndsAt,noticeEndsAt` integers 0–4102444800000; a bounded pause must end after it starts. Returns effective site-paused state as well as saved controls. Writes compatible platform-operation audit entries atomically.

## Deployment boundaries

`agent_grants`, owner slots, rate buckets, agent/management receipts and `agent_audit` are server-only collections; direct browser reads/writes, including admin clients, are denied. Receipt/audit times use Firestore request-time transforms. The support-ticket owner/status composite index supports the only new multi-field query; single-field filters use Firestore's automatic indexes.

The API is intentionally limited to this table. There are no arbitrary database paths, URLs, billing actions, administrator promotion, password operations, permanent account deletion or live-grant creation during deployment verification.


## Version 1.1 additions (14 October)

The existing owner's non-expiring credential has been upgraded, without rotation, with `users:write` and `study:delete`. All previous scopes remain. Other grants require explicit authorization; possession of `study:write` alone does not permit deletion.

| Endpoint | Scope | Behavior |
|---|---|---|
| DELETE /users/{uid}/tasks/{taskId} | study:delete | Recoverable by default; account version required. |
| DELETE /users/{uid}/sessions/{sessionId} | study:delete | Account and canonical session versions required; active timers must stop first. |
| POST /users/{uid}/tasks/{taskId}/restore | study:delete | Restore soft-deleted task and clear its tombstone. |
| POST /users/{uid}/sessions/{sessionId}/restore | study:delete | Restore history, canonical document and linked plan. |
| GET /subjects?uid= | study:read | Saved subject IDs, names, colors and workspace IDs. Defaults to grant owner. |
| GET /workspaces?uid= | study:read | Saved workspace IDs and names. Defaults to grant owner. |
| GET /syllabus/chapters?subject=&class= | study:read | Entire canonical catalogue; optional physics/chemistry/maths and 11/12 filters. No pagination. |
| POST /mutations | each operation's scope | Atomic batch of 1–30 writes, one receipt, one account version bump per account. |
| POST /users/{uid}/sessions | study:write | Record completed actual study with explicit startTime, durationSeconds and subjectId. |
| POST /users/{uid}/sessions/{id}/start | study:write | Start a planned session or resume a paused one. |
| POST /users/{uid}/sessions/{id}/stop | study:write | Pause and settle elapsed time; allows later resume. |
| POST /users/{uid}/sessions/{id}/complete | study:write | Finish an active/paused timer and save actual elapsed history. |
| PATCH /users/{uid} | users:write | Application profile displayName, dailyGoalHours, weeklyTargetHours, timezone. |
| POST /users | users:write | Provision application data for an explicit UID; expected account version must be empty. Does not create passwords or grant administrator roles. |
| POST /tickets | support:write | Create a support ticket for an existing account. |
| GET /tickets/{id}/messages/{messageId}/attachment | support:read | Return a validated image attachment, when present. |
| GET /openapi.json (gateway root) | public | OpenAPI 3.1 contract for all 40 connector operations. |

Deletion uses `input:{}`. Soft deletion removes the item from visible study arrays, archives its original payload under the account's server-owned `agent_deleted` collection, and records its `deletedAt`. Browser sync respects server tombstones. Restore uses `input:{}` and the current account version. `?hard=true` permanently purges the history/canonical document and the recovery archive, while retaining only a deletion ID to prevent stale-device resurrection. Hard deletion is not reversible. Neither deletion nor restore changes administrator roles or grants competitive credit.

Direct completed sessions use `input:{sessionId?,subjectId,startTime:epochMilliseconds,durationSeconds,notes?,jee?,workspaceId?}`. Actual end must not be in the future. These records enter Sanctra history/analytics and derived JEE views, with zero unverified ranking credit. Planned sessions still use the schedule endpoint. Lifecycle calls use `input:{}`, observed account/session versions, and the existing active timer projection. `stop` means pause, not finish; `complete` saves actual elapsed time and completes the matching planner block.

Application profile provisioning is separate from Firebase Authentication account creation; the supplied UID should belong to an already registered user. Credential/password changes remain in Firebase's authorized authentication flow.

Ticket create input is `{ownerUid,title,category,text}`, with category bug/feature/account/payment/other and the target account version. The initial message is attributed to Hermes administration. Attachments are available through the dedicated read, not embedded in paginated ticket lists.

### Atomic batch example

```json
{
  "operationId":"move-four-blocks",
  "reason":"Rearrange today's study plan",
  "expectedVersions":{"account":"observed-account-version"},
  "operations":[
    {"method":"PATCH","path":"/users/USER/tasks/TASK_A","body":{"input":{"startTime":"14:00","endTime":"15:00"}}},
    {"method":"PATCH","path":"/users/USER/tasks/TASK_B","body":{"input":{"startTime":"15:00","endTime":"16:00"}}}
  ]
}
```

The MCP tool accepts the same operations under `input.operations`. An operation's `body.expectedVersions` can override the outer versions for another account or canonical session. All versions refer to the initial transaction snapshot; operations see previous staged changes. No nested batches, grant management or reads are permitted. Any validation/scope/version error rolls back the entire batch. Replay uses the original operation ID and exact body. Returned item versions all resolve to the single final commit.

Generate the spec with `npm run api:spec`; `npm run api:spec:check` and route coverage tests prevent drift. The connector schema is the source of the machine-readable request contract; server-side semantic validation additionally checks saved IDs, record state and ownership.
