# Sanctra AI helper integration

The existing Gemini engine is now connected to the main app through the header’s **Sanctra AI study helper** button. The panel opens as a right-side drawer with Chat selected. Existing plan, quiz and pacing tools remain accessible in separate tabs. Generated plans use the active workspace; task insertion goes through the app’s existing state, persistence and cloud sync. Account/workspace changes remount the helper to isolate its state.

The drawer uses the selected atmosphere palette, supports Escape, focus trapping, focus restoration, backdrop closing and a persistent conversation while closed. Engine initialization failures appear in the conversation instead of leaving a permanent “Thinking” bubble. The development App Check token is no longer embedded in the production bundle.

The landing preview now uses the main timer’s hour/minute/second display, mode heading, progress ring with indicator and Customize Timer control. The subject selector and extra sentence inside the dial were removed. Sign-in uses the shared Sanctra wordmark.

## Verification
- Strict production build: passed.
- Existing unit regression suite: 126 passed.
- Gemini task conversion/storage tests: 2 passed.
- Browser: helper opens on Chat, closes and restores focus; desktop and 834px iPad viewport appearances inspected. At 834px the drawer is 480px wide with no horizontal overflow. The live landing preview runs, pauses and resets; its time readout is 173px inside a 240px ring at iPad width. Sign-in branding verified on the live deployment.
- Hosting: deployed to sanctrastudy.live.

## AI service blocker
A live engine health request returned an App Check authentication error. The existing app’s App Check configurations did not provide a production reCAPTCHA site key. The UI integration is released, but successful Gemini replies are **not verified**. Production needs a valid browser App Check provider before AI responses can be claimed working. No billing plan or security enforcement setting was changed.

This pass did not validate actual study-plan generation, quiz answers, pacing advice, a real signed-in account’s task save, or physical iPad behavior. The existing model selection and generation logic were retained for subsequent AI refinements.
