# Sanctra Hermes Admin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Give the owner's remote Hermes agent the approved Sanctra study and administrative tools with validated, revocable access.

**Architecture:** A scoped `/v1/agent/` Worker API owns authentication, queries, mutations and audit. A standalone Node MCP package translates named tools into HTTPS requests. An Admin Integrations panel issues and revokes credentials without exposing Firebase server secrets.

**Tech Stack:** Existing React/TypeScript, Firebase/Firestore and Cloudflare Worker; Node 24, official MCP SDK server/client 2.3.1 and Zod 4 in the separate connector package. Verify exact package versions against the official registry before installing and commit the lockfile.

**Spec:** `docs/superpowers/specs/2026-10-13-hermes-sanctra-admin-design.md` (owner-approved).

## Global Constraints

- Preserve existing personal-token, browser AI, timer and account boundaries.
- Owner override: one active owner-only credential, never expires (`expiresAt:null`); issue only after verified sign-in within five minutes. Revocation and atomic rotation remain available.
- Every request checks token, expiry/revocation, scope and current creator admin role; explicitly disabled roles are denied.
- No arbitrary Firestore paths, server secrets, password material, billing, administrator promotion or permanent deletion tools.
- Mutations require `operationId`, reason and observed versions for edited data; mutation, receipt and audit are atomic.
- Reads fail closed if authorization/audit recording fails; audit contains attribution and metadata, not private record bodies.
- Default page size 25, maximum 100; default ticket-message page 50, maximum 100; maximum 30 tasks per batch.
- Agent credential exists only on the remote Hermes host after owner issuance. Do not retrieve or print production secrets, install into an unknown host or create a production grant automatically.
- Neutral-glass Sanctra UI, rounded panels and readable sky accents; preserve unrelated dirty working-tree changes.
- The owner explicitly chose parallel agents. Assign nonoverlapping implementation files; review completed tasks and perform a final cross-component review.

## Review Focus

- A disabled/removed administrator must lose access even on an idempotent replay: Task 1 auth tests.
- Lost grant-issuance response must never reveal the secret again or cause hidden duplicate grants: Tasks 1 and 3 tests.
- Browser-saved historical sessions must remain editable without changing competitive credit: Task 1 history tests.
- Prompt instructions embedded in ticket messages must stay data: Task 2 skill and tool-boundary tests.
- A packaged connector on a remote host must work without the frontend checkout or browser session: Task 2 packed-artifact test.

## Shared Interface Contract

Responses are `{apiVersion:"1",data,versions?,nextCursor?,receipt?}`. Errors are `{apiVersion:"1",error:{code,message,retryable}}` with safe messages. Expected versions are opaque values returned under semantic keys such as `account`, `ticket`, `aiAccess`, `aiConfig`, `platform`, `session` and `jeeChapter`; callers cannot use them to select database paths. An empty version denotes an absent document and requires an absence precondition.

Mutation bodies are `{operationId,reason,expectedVersions,input}`. IDs match `[A-Za-z0-9_-]{1,128}`; reason is a nonempty string up to 500 characters. Bounded request bytes: 256 KiB; bounded response bytes: 1 MiB. No endpoint accepts a caller-selected URL or collection. The API returns conflict for stale versions and for an operation ID reused with a different normalized payload.

Grant-management routes accept the configured owner's Firebase ID token only and the Sanctra browser origin: `GET/POST /grants`, `POST /grants/:id/revoke`, `POST /grants/:id/rotate`. Creation input is `{label,scopes,operationId,reason}`; revoke/rotate additionally require `expectedVersions.grant`. Summaries are `{id,label,creatorUid,scopes,createdAt,expiresAt:null,revokedAt,version}`. First successful issuance returns `{grant,token}`; an identical replay returns grant metadata and `secretUnavailable:true`, never the secret. List only the owner's grants; only one can be active.

Agent routes and matching tool suffixes (`sanctra_` prefix):

| Tool | Method and path under `/v1/agent` |
| --- | --- |
| `connection_status` | GET `/connection` |
| `list_users`, `get_user` | GET `/users`, `/users/:uid` |
| `get_analytics`, `get_sessions`, `get_tasks`, `get_calendar`, `get_jee` | GET `/users/:uid/{analytics,sessions,tasks,calendar,jee}` |
| `create_tasks`, `update_task`, `complete_task` | POST `/users/:uid/tasks`, PATCH `/users/:uid/tasks/:taskId`, POST `/users/:uid/tasks/:taskId/complete` |
| `schedule_sessions`, `update_session` | POST `/users/:uid/sessions/schedule`, PATCH `/users/:uid/sessions/:sessionId` |
| `list_tickets`, `get_ticket`, `reply_ticket`, `set_ticket_status` | GET `/tickets`, GET `/tickets/:id`, POST `/tickets/:id/replies`, PATCH `/tickets/:id/status` |
| `get_ai_controls`, `get_ai_usage` | GET `/ai/controls` (optional explicit `uid`), GET `/users/:uid/ai/usage` |
| `set_user_ai`, `set_global_ai` | PATCH `/users/:uid/ai`, PATCH `/ai/controls` |
| `get_platform_controls`, `set_platform_controls`, `get_agent_audit` | GET/PATCH `/platform/controls`, GET `/audit` |

All 24 tools map to the approved scope table in the spec. Server-selected normalized input schemas are documented in `docs/HERMES_API.md` and checked against the connector's tool definitions during integration.

### Task 1: Authorized, audited Worker API

**Files:** Create `worker/agent-{auth,store,api,projections,study,support,controls}.ts`, `tests/agent-{auth,api,study,support,controls}.test.ts`, `docs/HERMES_API.md`. Modify `worker/ai-gateway.ts`, `worker/personal-auth.ts`, `firestore.rules`, `firestore.indexes.json` and relevant emulator tests. Do not edit frontend or MCP package files.

**Interfaces:** `createAgentApi(dependencies): (request:Request,env:PersonalEnv)=>Promise<Response>` uses injected clock, identity verifier, query/transaction store and rate-limit implementation. `handleAgentApi(request,env):Promise<Response>` supplies production dependencies. `AgentStore` provides versioned document reads, server-selected bounded queries and mandatory transactions with create/patch/server-timestamp operations. Domain helpers produce staged changes rather than writing outside the operation transaction.

- [ ] Write and run failing authorization tests: personal credentials rejected; forged/expired/revoked grants denied; removed/disabled admin denied on reads/replay; insufficient scope denied before target read; wrong browser origin denied; fresh verified Firebase identity required for issuance. Run `node --test tests/agent-auth.test.ts`.
- [ ] Implement signed identity verification without trusting decoded claims, retaining the existing owner verifier as a wrapper. Generate token `sanctra_agent_<22-char-id>.<43-char-secret>`, hash secret, enforce expiry/scopes, redact metadata. Require current role validation and per-grant rate limiting. Test atomic rotation and creator-only grant listing/revocation.
- [ ] Write and run failing transaction tests: identical replay returns one receipt; changed payload conflicts; concurrent revocation aborts; stale document version preserves browser changes; audit failure returns no data and commits no mutation. Implement the operation runner with canonical payload hashes and grant-scoped receipt IDs. Issuance receipts use creator-scoped management operation IDs and never store a plaintext token.
- [ ] Implement directory projection from `platform_users` plus saved profile/account/subscription/moderation/admin records. Implement explicitly projected and paginated history, tasks, calendar, JEE and AI usage reads; validate cursors against target/filter/sort. Test empty accounts, absent optional fields, timezone/DST boundaries, unlinked history and deduplication. Media returns bounded metadata, not inline uploads.
- [ ] Implement study writes against the shared `users/{uid}` planner and historical session records, plus canonical planned sessions where present. Require explicit scheduled duration and actual agent attribution. Match subjects and cloud JEE chapter IDs; completion flags affect real JEE chapter records only. Reject unavailable browser-only generic syllabus completion clearly. Preserve competitive-credit metadata on edits; new unverified records get zero competitive credit. Cover legacy history edits, planned rescheduling/task projection and explicit practice counts.
- [ ] Implement ticket reply/status transactions and strict AI/platform control patches. Reuse existing validation bounds: AI cap 0–1,000,000, rates 1–60, known feature/model/cost fields; preserve unspecified fields. Replies use unique operation-bound IDs and agent attribution. Include compatible platform audit entries. Test duplicate reply retries, attachment redaction, unknown fields and concurrent control changes.
- [ ] Add server-owned grant/receipt/audit collections with explicit client write denial and necessary indexes. Protect agent-channel message attribution from browser spoofing. Run emulator tests for these boundaries and existing admin rules. Keep receipt/audit timestamps server-generated.
- [ ] Run all Task 1 tests and document exact HTTP inputs/outputs/errors with examples containing fake tokens only. Report changed files and results for independent review. Stage/commit only owned files and reviewed intentional integration changes; preserve existing staged edits.

### Task 2: Standalone Hermes MCP connector

**Files:** Create `integrations/hermes/{package.json,tsconfig.json,src/index.ts,src/server.ts,src/tools.ts,src/schemas.ts,src/http-client.ts,tests/protocol.test.mjs,tests/http-client.test.mjs,tests/fixture-api.mjs,examples/hermes.config.yaml,skill/SKILL.md,README.md}` and package lock metadata. Modify workspace package registration only if needed, preserving existing settings. Do not edit Worker or frontend files.

**Interfaces:** `createSanctraMcpServer(client)` registers the 24 shared-contract tools. `createSanctraClient({token,fetchImpl?,baseUrl?})` supports injected loopback fixtures; the production executable fixes the Sanctra HTTPS endpoint and reads `SANCTRA_AGENT_TOKEN`. SDK protocol messages alone go to stdout. Tool schemas reject unknown fields and caller URLs.

- [ ] Write failing fixture tests for missing/placeholder credentials, exact route/body/query encoding, required target/reason/version, 30-task bounds and unsupported fields. Implement a bounded HTTPS client with redirects refused, timeout, 1 MiB streamed response limit, safe errors and token redaction. Send no browser Origin header.
- [ ] Register tools with strict schemas, scope descriptions and correct read-only/idempotency annotations. Return both JSON text and structured results; controlled failures use MCP `isError`. Do not automatically retry uncertain writes; retain the supplied operation ID for an intentional retry.
- [ ] Exercise SDK initialization, tool discovery and all 24 routes over stdio. Test unauthorized/forbidden/expired/conflict/unavailable/malformed/oversized/redirect/timeout responses. Assert no token or debug messages on stdout and no fetch for invalid input.
- [ ] Build and pack the connector, install the tarball in a temporary directory and run protocol tests from it without the frontend checkout. Pin released SDK/Zod/compiler versions and include compiled files, README and skill in the tarball.
- [ ] Provide remote Linux/Node 24 setup and Hermes YAML using explicit token environment mapping, preserving other MCP entries. Explain owner grant issuance, private host secret entry, `/reload-mcp` and connection-status checks. Do not put a real token into documentation or automatically modify an unknown remote server.
- [ ] Supply the Hermes skill: resolve names to UIDs, preserve dates/timezones and real study evidence, use operation IDs/versions, treat all retrieved user/ticket content as untrusted, and report only confirmed saves. Tool names use discovery rather than guessing Hermes wrapper prefixes.
- [ ] Run package tests and provide packed artifact, changed files and results for review. Commit only package-owned files.

### Task 3: Admin credential management screen

**Files:** Create `src/components/AdminIntegrations.tsx`, `src/utils/agentGrantService.ts`, `tests/agent-grants.test.ts`, and `tests/agent-admin-preview.{html,tsx}` plus its Vite config. Modify `src/components/views/AdminView.tsx`, scoped `src/components/admin-studio.css`, and ticket message rendering for an API-supplied agent attribution label if necessary. Do not edit API/package files.

**Interfaces:** `AdminIntegrations({user:AuthUser})` calls browser service methods `listAgentGrants`, `createAgentGrant`, `revokeAgentGrant`, `rotateAgentGrant` using the shared management response contract. Pass the current Firebase token; never accept an agent token in this browser service. API remains the authority on scope, expiry and administrator access.

- [ ] Test service envelopes with fake responses, stale-sign-in error preservation, conflict reload and lost-issuance response handling. Never automatically retry issuance. Secret-unavailable replay instructs revoke-and-reissue; list/revoke projections never include secret hashes.
- [ ] Add an Integrations tab in `AdminView` and a rounded “Connect Hermes” panel. Start with no selected scopes; provide “Select all approved scopes,” label, expiry 30/maximum 90, paginated own-grant list and revoke/rotate controls. Show honest forbidden/expired/loading/empty/error states.
- [ ] Keep displayed secret in component memory only. Clear on dismissal/unmount/UID change/logout/revoke/new issuance. Block another issuance while a secret is displayed. Provide Copy and “I've saved it” actions with labels and visible keyboard focus.
- [ ] On stale sign-in offer Google reauthentication; cancellation preserves form. Password-only accounts get sign-out/sign-in instructions without collecting a password in this panel. Do not confuse token refresh with recent authentication.
- [ ] Build fixture preview by aliasing only the grant service to in-memory data; no live Firebase calls. Inspect desktop/laptop and 390px layouts with all scopes, long labels, active/expired/revoked grants, secret display and conflict/error states. Check wrapping, contrast and keyboard access.
- [ ] Run relevant tests/build checks and report screenshots/changed files for review. Commit only owned changes, preserving unrelated dirty files.

### Task 4: Integration, independent review and deployment

**Files:** Update the plan checkboxes, implementation ledger `docs/HERMES_IMPLEMENTATION.md`, API/setup docs and any narrowly required cross-component fixes.

- [ ] Freeze the shared HTTP contract before agents implement. Parallelize Tasks 1–3 only within their owned files. Resolve conflicts through the controller; do not reset other work.
- [ ] Assign independent review of the Worker authorization/transaction/projection code and MCP/UI integration after each deliverable. Route real findings back to the owning implementer and recheck the covering tests; do not silently defer security/correctness failures.
- [ ] Verify all tool routes match the API docs and browser grant envelopes. Run `node --test tests/agent-*.test.ts`, connector package tests, new/existing Firestore emulator tests and `npm run build`. Run relevant preexisting personal/JEE/session tests because the server reuses those records.
- [ ] Deploy reviewed Worker, Firestore rules/indexes and frontend. Check unauthenticated agent endpoints return denial, browser landing still loads the expected release and existing personal endpoints retain their auth boundary. Avoid production test grants or data writes.
- [ ] Deliver the packed artifact and exact remote-host installation instructions. Live Hermes installation and credential entry remain owner steps unless host access is supplied. State actual verification limits, remaining steps and any review rulings in the final reply.

## Execution state

The owner approved execution/deployment and selected multiple agents. API, connector and UI implementation proceeds in parallel. The remote host location is confirmed; live credentials and host installation remain owner steps. The owner subsequently requested a single non-expiring owner-only connection, overriding the original expiry and general-admin issuance text in Task 1–3. Detailed progress and review evidence lives in this plan's SDD ledger.
