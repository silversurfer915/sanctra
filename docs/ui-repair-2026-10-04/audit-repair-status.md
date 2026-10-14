# October 4 audit repairs

Reviewed all three supplied audit PDFs against the current implementation.

## Repaired

- Phone header controls fit within a 390px viewport; mobile ranking badges and focus time no longer overlap.
- Inactive ranking tabs and timer Reset/Save use readable theme glass and respond to the clarity slider. Disabled timer actions explain why they are unavailable.
- Goal ring label has space inside the stroke, and zero progress has no false progress dot.
- Admin active icons, card surfaces, Plus membership badges and announcement style selector match shared controls.
- Calendar reconnects after Firebase restores authentication, provides manual retry, and strips undefined event fields before Firestore writes.
- Week view starts near the first scheduled block or 6am; sticky calendar surfaces follow the theme and blur preference. Mobile filters wrap.
- Profile preview no longer presents fabricated study time. Save controls do not cover editor help. Sidebar Profile shows its active state.
- Exam dates are formatted; task subject and announcement style controls use the app selector. Group creation, inbox summaries and premium accents use shared styling.

## Google Calendar limitation

The prior implementation had placeholder OAuth/database configuration, an undeployed worker, and a sync route using an in-memory native-data adapter. It could not provide durable two-way synchronization. The worker is now deployed and returns readable availability responses. The app disables connection while unavailable; sync/conflict mutation routes cannot falsely report success.

Actual Google sync remains unavailable until real Google OAuth configuration, a D1 binding, a production account-data adapter and durable sync processing are implemented and verified. Native calendar data is independent.

## Validation

- Release copy: 171 automated tests passed; TypeScript and production build passed.
- Firestore security rules: 50 tests passed.
- Browser checks: 390px header and ranking, clarity slider at 0/24px, zero-progress ring, week scroll position, unavailable Google connection.
- Release built independently of concurrent landing-page and AI policy edits; those changes were not included.

## Evidence

- audit-phone-controls.png
- audit-phone-ranking.png
- audit-calendar-week.png
