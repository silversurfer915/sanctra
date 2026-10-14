# Community and profile release — 4 October 2026

Delivered:
- Global rankings: top three, member search, Today/Week/Month controls, personal rank and next-place progress. Ranking totals continue to use the existing server-validated public projection.
- Plus+ banners, avatar frames, scenes and aura effects render in leading cards, ordinary global rows, personal summary and group rows. Shared identity components retain entitlement checks.
- Group room headers show total joined members and currently active members from live presence.
- Invite dialog shows the code before explicit Copy code, Copy link or Share actions; Escape, focus trap, manual-copy fallback and error feedback included.
- Appearance contains a saved 0–24 px Glass clarity control. The setting reaches shared panels, inputs, sidebar, dialogs and controls; wallpaper dimness remains separate. Reduced-transparency preferences and the clear timer header are preserved.
- Tasks contains task overview, a compact primary exam countdown, calendar and task list. Exam goal editing moved into Profile, using the same saved goals and custom calendar control.
- Profile now includes optional private country, city, status, class/year, stream and study setup fields.

Verification:
- Strict TypeScript and production build passed for the release snapshot.
- 127 automated regression tests passed, including account settings persistence and blur bounds.
- Browser checks at 1440×1000 and 834×1112: ranking periods, search including podium members, readable Plus+ banners, animated aura CSS, no horizontal overflow, explicit invite-code copy, profile details save, exam date edits updating Tasks, and slider endpoints changing panel blur to 0px and 24px.
- Browser review used sample data with actual presentation components. A physical iPad/Safari and a signed-in production group were not used for this round.
- Firebase Hosting release completed; custom-domain HTML references the exact new release bundle.

The release snapshot contains this UI work and the previously committed AI integration. Concurrent Gemini edits to aiLogic.ts, firebase.ts and the new appCheck.ts remain in the working tree and were not included or overwritten.
