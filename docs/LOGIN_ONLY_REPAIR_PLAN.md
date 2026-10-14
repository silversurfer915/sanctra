Task DYX-001
Goal: Require a registered login for every workspace route.
Files: App.tsx, AuthModal.tsx, firebase.ts, firestore.rules.
Action: Remove guest creation and entry buttons, reject restored anonymous sessions, and deny anonymous database access.
Why: The workspace should be accessible only through Google or email sign-in.
Verification: Auth flow checks, rules emulator and build.
Expected result: Landing previews remain local examples; every workspace entry opens sign-in.

Task DYX-002
Goal: Keep only image and video wallpapers.
Files: storage.ts, ScenicWallpaper.tsx, SettingsModal.tsx, types/index.ts.
Action: Remove abstract presets and their animation setting; map old preferences to matching illustrated scenery.
Why: Existing preferences should migrate without changing study records.
Verification: Migration tests and settings review.
Expected result: Every available wallpaper has an image, with optional video.

Task DYX-003
Goal: Match sign-in to the selected landing scene and refine the timer preview.
Files: LandingView.tsx, landing.css, AuthModal.tsx, styles-sanctra.css.
Action: Share the selected scene palette, use a smaller glass preview and coherent controls.
Why: The public page should reflect the actual workspace style.
Verification: Desktop and iPad-sized browser checks of interactions and appearance.
Expected result: Readable, consistent preview and authentication UI.

Task DYX-004
Goal: Publish and explain the verified release.
Files: release announcement and repair report.
Action: Run checks, deploy, verify the live page and publish the in-app update notice.
Why: Users need the released changes and refresh guidance.
Verification: Hosting response and exact announcement readback.
Expected result: Changes are live and the update appears once per user.

Status: DYX-001 through DYX-004 completed, verified and released.

Follow-up: Integrate the existing Gemini engine as a side chat and align the landing timer and sign-in wordmark with the workspace.
