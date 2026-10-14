# October 2 Groups and timer-only release

Implemented in `LiveGroupsView`, `liveGroups`, `groupInsights`, and `useGroupPresence`.

- Timer only hides the sidebar, header, quote, metrics, task bars, mode/subject selectors, and fullscreen action. The clock is centered in the viewport; Start/Pause, Reset, Save Session and Show interface remain. Escape restores the interface. Controls wrap within the viewport in normal and fullscreen layouts.
- Real Firestore groups only: public discovery, invitation-only circles, atomic create/join/leave with private membership preferences. Existing groups/data are preserved; static official/demo groups are not rendered.
- Owner can assign/remove up to 20 admins, edit details, and close/delete a group. Admins edit name/description and moderate chat. Members can remove their own chat messages. Owners delete rather than leaving a group ownerless.
- Group deletion is a terminal metadata tombstone: it disappears from discovery and closes all member/chat access immediately. Subcollection data is retained rather than destructively purged. Deleted memberships are removed from each member's preferences when they open Groups.
- Live member list retains joined offline users. Displays avatar/initial, status, active subject, optional status message, streak, period total, rank and movement versus previous day/week/month. Tied totals share rank; no previous activity is labeled New.
- Presence is published across all joined groups from the app, including when the timer view is open. Timer transitions, subject/profile/session changes publish immediately; active snapshots refresh every 15 seconds. Numbers tick locally every second. Closed or stale clients expire after 45 seconds. Firestore snapshots carry membership, chat, metadata and score changes without manual refresh. Network delivery has normal latency; disconnected clients show Connecting.
- Shared totals cover current and previous month, calculated from saved sessions plus unfinished focused time. Cross-midnight time is distributed proportionally across the wall interval, matching analytics. Pauses are excluded from focused duration. Totals are client-reported, like existing study records; this is a social leaderboard, not a tamper-proof competition.
- Membership limit remains 100; chat is the most recent 100 messages, max 200 characters per message. Status messages max 160, group names max 60 and descriptions max 1000 characters.
- Group chat now requires membership even for public groups. Joining is explicit; leaving revokes chat, and removing own admin role is atomic. Owner UID, group ID and creation timestamp are immutable. Group roles never grant platform admin access. Support remains under construction.

Validation: TypeScript, Vite build, 31 unit tests and 15 Firestore emulator tests pass. Two independent authenticated emulator clients verify live member and chat delivery; lifecycle tests verify atomic creation, role boundaries, private invitations, leave/rejoin, deletion closure and spoofed writes. Timer-only clock center and control bounds were checked at desktop and 390x844 width. Production Groups entry and creation form are verified. No production groups, sessions or chat messages were created for testing.

Deployed to Firebase project `studyapp-4137d`, including Firestore rules and Hosting. Latest JS: `index-2wHHe_ck.js`; CSS: `index-B2aPVQ9P.css`.
