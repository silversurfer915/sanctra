# Hermes integration delivery

14 October production repair: the Worker's dedicated IAM role lacked `datastore.entities.list`, so authenticated grant queries returned unavailable despite individual-document operations working. Added only that query permission to the existing custom role, preserving all other permissions and bindings. Updated provisioning to retain it. Verified the real owner's Admin → Integrations screen loads the existing active Hermes grant with “Never expires” and all ten scopes; no credential was rotated or newly issued. Proof: `outputs/hermes/grants-fixed.png`.

Deployed 14 October 2026: Cloudflare Worker version `9995ffd3-9020-4b1d-88a5-a0460d213c86`; Firebase Hosting, Firestore rules and indexes released successfully. Production landing returns 200 and serves the same `index-CPWe2yy2.js` bundle as the built artifact. Unauthenticated agent connection and existing personal analytics both return 401. No production test grant or study/support write was made.

The owner's single Hermes connection never expires. Only the configured verified owner can issue, rotate or revoke it through Admin → Integrations. Every tool request still checks current owner/admin status, scopes and revocation. No production token has been issued by this implementation.

## Delivered

- 24 named MCP tools covering saved study/JEE/planner/calendar data, user information, support tickets, AI controls and platform controls.
- Transactional Worker API with hashed credentials, single-active connection, version checks, idempotent writes and audit records. Reads fail closed if their audit cannot commit.
- Admin Integrations screen with explicit scopes, recent-sign-in recovery, one-time secret display and revocation/rotation.
- Standalone Node connector and remote setup instructions: [README](../integrations/hermes/README.md).
- API reference: [HERMES_API.md](HERMES_API.md).

## Checks

Focused final API/admin/personal/session/JEE/retirement regression run: 59 passed. Connector: 14 passed, including all 24 tools through stdio and installation from the packed artifact. Firestore emulator: 74 passed, including direct credential-write/read denial and support-agent impersonation denial. Production frontend build and standalone Worker typecheck pass. Desktop and 390px admin fixtures checked.

The broad repository suite remains imperfect: seven existing Firebase AI configuration/live-service tests fail (including disabled Firebase AI API). They are distinct from this Worker's tested Hermes routes. Build retains an existing large-chunk warning; repository lint also has existing unrelated warnings.

Final inline review added signed anonymous-identity rejection and atomic rejection of cross-midnight plans, because the shared planner stores same-day time ranges. Split overnight plans into separate daily sessions. No artificial study duration, practice count or competitive credit is added.

## Deliberate decisions

Calendar requests explicitly page `planner` and `jee` sources separately. Hermes must combine both; choosing only planner omits JEE mocks/backlogs. This avoids unbounded database scans.

The retired-branding scanner exempts only the current JEE projection module's real persisted `exam`/`coaching` field names. A broad exemption could hide retired branding and was avoided.

The owner stopped further agents to conserve quota. The remaining implementation review, final repairs and deployment were handled inline.

## Remaining owner step

Transfer the connector tarball to the server running Hermes, install it using the README, issue the permanent connection in Admin → Integrations, and place the displayed token privately in that server's Hermes environment. Merge the supplied MCP entry into the existing configuration and reload MCP. Call `sanctra_connection_status` to confirm identity/scopes and `expiresAt:null`.

No live Hermes connection is claimed until that server uses the owner's credential. Server access was not supplied; no existing remote configuration was modified.
