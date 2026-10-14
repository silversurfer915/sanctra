# Admin tools and construction gates — October 2, 2026

Published app and Firestore rules. Owner's existing server-provisioned `/admins/{uid}` marker is preserved; roles cannot be assigned from the client.

## Live
- Inbox: admin compose/edit announcements; Delete archives them from every inbox, with an immediate Undo. Original author and timestamp remain immutable.
- Inbox: platform directory with visible-tab heartbeat every 60 seconds and active threshold of 150 seconds. Search names or UID. Only admins can enumerate it. Local-only `guest-*` users are not Firebase accounts and cannot be listed/moderated. Directory currently capped at 1,000 enrolled accounts, ticket list at 200 and each thread at 500 messages; scalable paging is follow-up work.
- Timed restrictions (1h, 24h, 7d, 30d, custom hours), permanent account bans, required reasons, lifting restrictions, append-only moderation audit. Other admins and the acting admin cannot be restricted. Server-side expiry restores access automatically. Firestore rules block a restricted UID's usual cloud operations; app displays reason/expiry. These are UID/account restrictions, not IP/device bans or Firebase Auth disable operations. Offline cached data cannot be retroactively removed; records remain intact.
- Admin sidebar hides Support Desk. Admin Inbox has the support queue and reply/resolve/reopen UI.
- Groups component is unmounted; navigation/invites show construction notice. Existing rooms/memberships remain intact. This is an app UI gate, not a destructive database change; old clients retain normal permitted group API access unless restricted.
- Public Support Desk remains a construction notice per the user's later instruction. Persistent private ticket creation, replies and status changes are implemented in `SupportTickets` and the rules, but the public entry point is intentionally not enabled.
- Subject Tracker: themed header, selection and Add accents; explicit accessible switch; compact form; original user subject colors preserved.
- Visitor defaults: local 06:00–12:00 Blue Mist, 12:00–18:00 Lavender, otherwise Charcoal. Blue Mist fallback; saved account themes persist.

## Verification
- TypeScript and production build pass (existing bundle-size warning).
- 20 unit tests and 12 Firestore emulator tests pass.
- Rules compile in Firebase dry run and production deployment.
- Rules tests cover private data, role self-assignment denial, announcement ownership, admin-only presence enumeration, own heartbeat timestamps, restrictions/lifting/expiry, admin immunity, ticket owner/admin privacy and replies, resolved-thread denial, and immutable audit records.
- Production browser verified timer startup, both construction gates, and Subject Tracker's switch, appearance and accessible color controls. Custom domain serves `/assets/index-ILiqk1UH.js`.
- Owner-signed-in production admin controls still need the owner's visual acceptance. No real announcements were sent, accounts restricted, or records deleted during verification.

## Next session
Keep Groups and public Support locked until user explicitly authorizes reopening. Complete groups overhaul separately. To enable public tickets later, replace the construction modal body with `SupportTickets` for authenticated Firebase users; local-only guests need an actual anonymous Firebase account. Add scalable paging/rate limits and stronger moderation tooling as usage grows. Never re-provision admin ownership or reset cloud records.

Startup follow-up: do not subscribe to moderation/presence until Firebase authentication has resolved. `subscribeAdmin`, `subscribeRestriction` and presence tracker also gracefully return when cloud auth is unavailable. The initial live check caught this before final completion, and the corrected timer startup was verified on production.
