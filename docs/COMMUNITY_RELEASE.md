# Sanctra community and identity release — 2 October 2026

## Shipped scope

- Full-page themed Profile, including avatar presets/HTTPS URL, name, bio, status, intention, weekly goal, live memberships and real focus/streak metrics. Existing preferences/history are preserved.
- One-time intention chooser (with Choose later) for learning, deep work, meditation or competitive preparation. Rankings require explicit consent and a linked account. Unknown exam names no longer fabricate a 90-day deadline; set deadlines separately in Tasks & Goals.
- Global competitive focus rankings, all-exams/own-exam scopes, UTC day/Monday week/month, saved-focus-only totals, ties, previous-period movement, real top-three cards and fresh/offline status. At most 1,000 participant projections are read per view; totals are client-reported, not server-verified anti-cheat or exam performance scores.
- Separate Admin route, guarded by server-provisioned admins. Users/restrictions/audit, all public/private groups with members/chat and live paginated full chat history, deletion with a required moderation reason and immutable audit, message removal, support conversations, announcements studio and platform controls.
- Group deletion closes/tombstones the group immediately and retains records for owner moderation. No hard purge or role provisioning is performed.
- Support categories, private real-time threads, team replies, search, open/resolved lists and reopening. Most recent 500 messages per thread. Local-only/offline users get a connection action instead of a crash or fake ticket.
- Safe formatted announcement articles: headings, bold, lists, callouts, HTTPS links, covers, category and pin. Editor/live preview moved out of Inbox. No HTML execution.
- Operational feature pauses for groups, new tickets and rankings, plus live service notices. Timer/history remain available; existing support conversations continue during a pause. No controls are disabled by default.
- Themed sign-in/save/streak accents, focus-oriented language, updated landing copy announcing live Groups instead of stale construction messaging.
- Owner-specified planned Plus prices: ₹59/month, ₹159/year, limited early-user ₹150/year. No billing, fake subscription or user-writable paid entitlement. Additional value/sustainable feature scope in SANCTRA_PLUS_PLAN.md.

## Verification

- TypeScript build and 35 unit tests; 20 Firestore emulator access/integration tests.
- Real browser checks against isolated demo-sanctra Auth/Firestore emulator: owner private-group inspection without joining, live saved support reply, rich article preview, profile and global rankings.
- Blue Mist, Lavender and Charcoal at desktop/mobile; 390×844 checks show no horizontal overflow and no broken profile/ranking images.
- Local offline guest profile crash caught and repaired; mobile welcome dialog uses a scrollable viewport-bounded panel.
- Test fixtures are in ignored artifacts and demo-sanctra emulators only, never deployed or added to production groups/accounts.
- Firebase Hosting and rules target studyapp-4137d, verified afterward via live UI/build assets. Source checkpoint and announcement publication are recorded in GEMINI_HANDOFF.md.

## Planned, not live

Payments/entitlement verification; animated avatar uploads, paid profile scenes, bespoke interface commissioning, Plus quotas, guaranteed support SLA, music, YouTube and opt-in syllabus tracking. Global ranking totals need a trusted server pipeline before claiming anti-cheat or adding prizes. Early-offer duration and renewal treatment must be specified before payments go live.
