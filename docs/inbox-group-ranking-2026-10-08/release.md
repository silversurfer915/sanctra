# Rounded AI button, unread mentions and group-ranking double counting

Deployed October 8, 2026 to studyapp-4137d Firebase Hosting.
Index asset: index-Bujr9POm.js.

- AI launcher radius is now declared in eagerly loaded app CSS. Previously, its pill radius arrived only with the lazy AI planner stylesheet. Browser computed radius was 999px before first click, after lazy stylesheet load, and after page reload.
- Sidebar subscribes to unread announcements and group mentions while Inbox is unmounted. Indexed and recent messages are deduplicated by the same IDs used in Inbox. Read, mute and joined-group preferences update live from Firestore. Self mentions are excluded. Listener cleanup occurs on account changes/unmount.
- Verified group rankings use study_rankings totals directly, exactly like global rankings. Removed addition of the entire presence-session age on top of already-credited time. No timer/server integrity changes and no user-record edits were needed. Legacy historical member projection remains unchanged.

Verification: 64 Firestore emulator tests pass, including off-page mentions, read/mute/unmute/leave badge updates. Eight group insight tests pass, including 1080 credited seconds plus a 1140-second presence age remaining 1080 (18 minutes), instead of 2220 (37 minutes). Production build passes. Deployment succeeded. Header inspected before interaction and after refresh.

Test: refresh each device, inspect AI launcher before clicking, mention the other account while it is outside Inbox, open the notice and confirm badge clears. Compare Daily group and global totals; they should match after server checkpoints. No production-user messages were sent during tests.
