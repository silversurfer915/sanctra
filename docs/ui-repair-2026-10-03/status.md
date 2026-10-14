# Integrated UI repair — 2026-10-03

Deployed to Firebase Hosting and Firestore rules (studyapp-4137d). Integrated existing Gemini working-tree edits with Codex repairs.

Verified: build succeeds; 102 unit tests pass; 33 Firestore emulator tests passed. Local desktop browser confirms all six theme selections use translucent shared glass. Illustrated Blue Mist has no sidebar border/shadow. Timer header has no backdrop filter; other screens acquire 18px blur only once their scroll container moves beyond 8px. iPad viewport calendar opens above when needed and remains within viewport.

Repairs include atomic admin revocation retaining independent paid/trial subscription, truthful Plus feature descriptions, calendar stacking, primary-goal duplicate display, ticket notification badge, modal layout, quieter avatar animations, motion wallpaper selection, shared form controls, and recorded nature audio with source credits.

Remaining verification: physical iPad Safari, Plus-only motion theme runtime on owner account, and audible nature playback. Local automated browser audio clicks did not establish playing state (including generated brown noise), so audible playback and persistence must not be claimed verified. No production role or membership mutations were used for testing.

Screenshots here are local viewport checks, not physical-device proof. Phone work is deferred per user request.
