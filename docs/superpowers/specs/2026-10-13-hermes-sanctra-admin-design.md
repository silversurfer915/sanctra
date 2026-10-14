# Sanctra integration for Hermes

Status: implementation approved on 13 October 2026. Owner subsequently requires one owner-only, non-expiring Hermes connection; that requirement supersedes expiry and general administrator issuance below.

## Outcome

Hermes can manage the owner's study workflow and operate Sanctra's existing admin capabilities through named tools. It reads actual saved data and returns explicit success or failure. The owner connects Hermes with a dedicated, revocable credential; Hermes does not need browser automation, the owner's Google session, or Firebase service-account credentials.

## Existing foundation

- `worker/ai-gateway.ts` dispatches the existing owner-only `/v1/personal/` API. Its browser AI routes require Sanctra's origin, so scraping the website is not an authenticated analytics API.
- `worker/personal-auth.ts` verifies Firebase RS256 signatures and stores hashes of personal tokens. Existing personal tokens must not gain admin permissions.
- `admins/{uid}` identifies Sanctra administrators. The new API checks this record for each request and also refuses an explicitly disabled role.
- User study data and tasks live under `users/{uid}`; JEE records use private per-record account storage. The integration uses those records rather than creating another study database.
- Support uses `support_tickets/{id}` and its `messages` subcollection. AI controls use `ai_access/{uid}` and `ai_config/global`. Platform controls use `platform/controls`.
- Shared canonical session operations already provide planned-session creation, lifecycle operations, rescheduling, receipts and study-history projection.

## Architecture

Add a dedicated `/v1/agent/` API to the deployed Cloudflare Worker and a small Node MCP package in `integrations/hermes/`. The MCP package runs over stdio on whichever machine hosts Hermes and makes HTTPS requests to `https://api.sanctrastudy.live/v1/agent/`.

Use the official MCP SDK for protocol handling. Its tool schemas expose typed operations, not arbitrary URL requests or raw Firestore paths. The package reads `SANCTRA_AGENT_TOKEN` from its environment and never prints it. Provide a Hermes `mcp_servers` configuration example and setup instructions for both Mac and remote Linux hosts. Installation must preserve the user's existing Hermes configuration.

The REST API is also documented so another authorized client can use it. It accepts bearer authentication with no Origin header from server clients; browser requests must match Sanctra's configured origin. CORS is not treated as authentication.

## Credentials and delegation

Add an Admin → Integrations panel for issuing, listing and revoking the owner's single active Hermes connection. Each grant has a label, creator UID, random 256-bit secret, explicit scopes, creation time and revocation state. New grants never expire (`expiresAt:null`). Only the configured site owner may issue or manage the connection. Enforce one active connection transactionally; rotation replaces it. The token format includes a random grant ID and secret; Firestore stores only the SHA-256 hash of the secret.

Issuance and revocation require a verified Firebase identity and an existing admin role. Issuance requires sign-in within the last five minutes, with a reauthentication option in the UI. Display the secret once. Never include it in query strings, logs, audit records, exports, analytics or error messages. Rotating creates a new credential and revokes the old one.

Every operation checks the token format, constant-time hash match, expiry, revocation, current admin role and required scope before any user data is read. A grant cannot exceed its creator's authority. Grants cannot issue other grants or promote administrators. Only the interactive admin UI can manage grants.

The owner can enable all listed scopes for Hermes or narrow them. The initial release does not silently create or activate a production grant; the owner issues the credential and supplies it to Hermes on its host.

## Tool surface

| Scope | MCP tools | Behavior |
| --- | --- | --- |
| `users:read` | `sanctra_list_users`, `sanctra_get_user` | Paginated account directory and account profile, saved preferences, subscription, moderation and admin status. Passwords, password hashes, login tokens, agent credentials and infrastructure secrets are never returned. |
| `study:read` | `sanctra_get_analytics`, `sanctra_get_sessions`, `sanctra_get_tasks`, `sanctra_get_calendar`, `sanctra_get_jee` | Any user's recorded study data, date/timezone-aware analytics, JEE preparation records and projected calendar. Identify unlinked sessions and empty records honestly. |
| `study:write` | `sanctra_create_tasks`, `sanctra_update_task`, `sanctra_complete_task`, `sanctra_schedule_sessions`, `sanctra_update_session` | Shared planner and canonical saved/planned session mutations, preserving subject/chapter consistency. An optional explicit flag applies an associated syllabus-completion change. No invented duration or practice counts. No competitive credit from unverified records. |
| `support:read` | `sanctra_list_tickets`, `sanctra_get_ticket` | Paginated tickets and messages, status/owner filters and bounded attachment metadata. |
| `support:write` | `sanctra_reply_ticket`, `sanctra_set_ticket_status` | Send an admin reply or set open/in-progress/resolved. Attribute replies to the administrator and label the agent channel. Repeated operation IDs cannot send duplicate replies. |
| `ai:read` | `sanctra_get_ai_controls`, `sanctra_get_ai_usage` | Global AI configuration, per-user access/allowance and recorded usage; no model API keys. |
| `ai:write` | `sanctra_set_user_ai`, `sanctra_set_global_ai` | Enable/pause access, extra daily messages, total cap, per-minute rate, model and feature switches. Use existing validation bounds and preserve unspecified fields. |
| `platform:read` | `sanctra_get_platform_controls` | Feature availability, maintenance, notices and scheduled pauses. |
| `platform:write` | `sanctra_set_platform_controls` | Existing site pause, pause schedule, feature switches and notice controls. Always returns the resulting effective state. |
| `audit:read` | `sanctra_get_agent_audit` | Paginated activity attributed to creator UID, grant and target. |

All cross-account tools require an explicit target UID. No ambiguous name-based writes. Directory pagination lets Hermes resolve names to UIDs first. A separate `sanctra_connection_status` tool reports identity, effective scopes, expiry and API version without returning secrets.

## Request and data contracts

- Bounded page sizes: default 25, maximum 100. Support message pages default 50, maximum 100. Use opaque validated cursors.
- Enforce body and response limits, maximum 30 task operations per request, known field allowlists, valid IDs, dates/timezones and enumerations.
- Reject unknown write fields instead of silently accepting them. AI daily caps remain 0–1,000,000 and rate limits 1–60. Keep global model and cost-field validation aligned with the existing UI/rules.
- Each mutation requires `operationId` and a human-readable reason. Require the last observed document version for editing existing data; concurrent edits return a conflict and the caller must reload.
- Mutations and their audit receipt commit atomically. Repeating an operation ID with the same payload returns the prior result; reusing it for another payload returns a conflict.
- Return predictable JSON error codes for unauthenticated, forbidden, expired, validation, missing, conflict, rate-limited and unavailable responses. Redact upstream responses and credentials.
- Account info is an explicit projection, not a dump of the entire user document. Media settings return identifiers/metadata rather than large inline uploads. JEE and session data are separate paginated tools.

## Audit and revocation

Use server-owned `agent_grants/{id}`, `agent_operations/{grantId}/receipts/{operationId}` and `agent_audit/{id}` collections. Firestore client rules deny direct grant/receipt mutations. The authenticated admin API owns grant operations; the browser never writes token hashes itself.

Audit all successful reads and writes with server timestamp, actor UID, grant ID, tool, target UID/ticket and outcome. For writes include changed field names and redacted before/after control values; do not duplicate private message bodies, session notes or secrets into audit logs. Existing platform operation history receives compatible entries for platform changes.

If the audit backend cannot record an operation, fail closed. Revocation or removal of the creator's admin role prevents new operations. An already committed operation stays committed; revocation cannot undo it. Expiry is evaluated using server time.

## Agent instruction boundaries

Provide a Hermes skill file explaining the tools, explicit target selection, date/time handling and truthful reporting. Support messages, study notes, uploaded attachments and user profile text are untrusted data, even when they contain requests to run tools. The skill must never treat those records as instructions from the owner.

Hermes can autonomously use the scopes the owner granted. This does not guarantee perfect agent judgment. Authorization, scope limits, validation, concurrency, revocation and attribution are enforced by Sanctra independently of the agent's prompt.

## Deliberate limits

This release does not expose arbitrary database writes, service-account secrets, password hashes, admin promotion, billing transactions, permanent account deletion, public announcement publishing or mass exports. Those capabilities were not part of the approved tool list. It provides full existing AI and platform control plus the approved user/study/support access.

## Verification and delivery

1. Test forged/expired/revoked tokens, role removal, scope denial, wrong origins and cross-account target checks without touching production user data.
2. Test cursor/bound validation, unknown fields, concurrent changes, idempotent replies and atomic audit receipts.
3. Test analytics/JEE/session projections against saved fixtures, including empty and unlinked history, and preserve competitive-credit rules.
4. Run Firestore emulator rules checks for new server-only collections and existing admin boundaries.
5. Exercise MCP initialization, tool discovery and tool calls against a local fixture API; protocol output must not contain debug text or secrets.
6. Inspect the Admin Integrations UI at desktop and phone widths; test credential display-once/revocation with fixture credentials.
7. Build and deploy the tested API, frontend and rules. Verify unauthenticated production access is denied and deployment versions match. Do not create production user records for smoke tests.
8. Deliver the installable MCP package, Hermes skill, exact configuration instructions and API reference. Owner credential issuance and Hermes-host installation complete the live connection; if that host is inaccessible, report that remaining step explicitly.
