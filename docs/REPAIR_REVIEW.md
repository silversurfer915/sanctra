# Sanctra existing feature repairs

This records checkpoint 6541433. It was subsequently deployed to sanctrastudy.live. See `GEMINI_HANDOFF.md` for the newer local group/inbox work, current deployment status and remaining checks.

Review locally at http://127.0.0.1:5173/. Branch: codex/existing-feature-repair.

## Scope and deployment

This frontend checkpoint has now been deployed to sanctrastudy.live. The approved backend setup is live: Firestore Standard in Mumbai (asia-south1), deletion protection enabled, anonymous and existing Google authentication enabled, prototype rules deployed, and six missing official rooms created without overwriting records. No existing account or study records were reset.

## Changes

- Timer fits the viewport, menu hides completely, header is smaller. Paused/running drafts, break restoration, save failures, mode changes and keyboard shortcuts preserve unfinished focus.
- Groups have public/personal listings, exact invitation lookup, private join validation, honest connection status, retained rankings with expiring presence, chat echo deduplication and local preview updates.
- Analytics shows monthly totals, daily goals, subject breakdown, consistency calendar, estimated hourly distribution and editable session history. Cross-midnight sessions are allocated across local dates.
- Account caches are isolated by UID. Failed cloud reads cannot overwrite account data. Local guest upgrades merge records by ID, with existing account records winning collisions.
- Landing page received modest nature imagery and muted styling. Exam preset names and date guidance were clarified without changing saved exam goals.
- Six wallpapers now use versioned WebP images, 86–91% smaller, with small selection thumbnails. Immutable caching applies to these versioned assets after frontend deployment. Original images and preset IDs remain intact.

## Verification

- 15 unit tests passed, including timer recovery, keyboard handling, cloud merge behavior, room privacy/presence/chat, analytics allocation and exam calendar dates.
- Five Firestore emulator tests passed: account isolation, room visibility/ownership, private invitations, presence ownership and chat impersonation/immutability.
- Isolated live SDK checks passed for account privacy, private invitations, presence and chat. Only the temporary verification accounts and room were removed afterward.
- Desktop and mobile timer checks confirmed no document scrolling and fully hidden sidebar. A paused 39-second draft survived refresh exactly. Local room chat updated visibly. Monthly report retained the existing 25-minute study record.
- TypeScript/Vite build passed. Lint exits successfully with warnings. Production JS bundle remains large (about 316 KB gzip).

## Remaining release checks

The in-app browser's live anonymous authentication request encountered a network error, despite successful live SDK tests from Node. Verify normal browser Google sign-in/account linking and two-browser room behavior before broadly shipping. Local development intentionally uses local data unless VITE_CONNECT_LIVE_FIREBASE=true.

The Firestore rules are prototype rules. They enforce owner-only account access, immutable sender identity, restricted private room listing and invitation checks. Review them before broadly sharing the app. Private room IDs act as invitation capabilities; do not publish private invitation links.

Review screenshots are in the ignored artifacts directory. Frontend deployment is a separate step after review; retain the existing Firebase project and IDs to preserve data.
