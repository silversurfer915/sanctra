> Retired October 7, 2026: the owner requested removal of Google Calendar linking, its frontend and its backend. This release note describes the former integration. Native Sanctra calendar remains available.

# Google Calendar release — October 7, 2026

Worker deployed: 8e8c921b-9f27-4ae0-aa66-b52294c86814.
Frontend deployed to Firebase Hosting; production index matches dist/index.html (index-Dvcdz8t4.js).
D1 migrations 0001 and 0002 applied to sanctra-calendar.
Google OAuth web client configured with worker callback; credentials stored only as Worker secrets.

Calendar sync now uses authenticated Firestore reads and conditional masked writes, durable mappings/cursors, account sync locking, import/export, conflict choices, role checks, and dedicated-calendar exports. Saved study sessions export as immutable calendar projections; Google changes never rewrite timer history. Sync is initiated with Sync now. Complex recurrence rules remain protected from editing in Sanctra.

Validation: 39 calendar tests passed; standalone Calendar Worker TypeScript passed; full production build passed; deployed worker health reports available=true and syncAvailable=true.
Live account roundtrip is not yet verified: user elected to complete consent and test independently.

## Test
1. Reload Sanctra. Calendar → Google Calendar → Connect; grant the calendar permissions.
2. Select calendars, then Sync now. Check imported events and dated tasks/exams in the dedicated Sanctra Google calendar.
3. Move an exported task in Google; Sync now; check its date/time in Sanctra.
4. Edit a local calendar event; Sync now; check the Google event.
5. Edit both sides before syncing; review a conflict and choose the intended version.
6. Check saved sessions exported without altering Sanctra history.

Also deployed user-approved current focus audio, settings, ranking identity, ranking note, and timer preset UI changes.
Google's client remains unverified; production verification is a separate Google approval process.
