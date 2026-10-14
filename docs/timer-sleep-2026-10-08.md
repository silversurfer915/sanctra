# Server timer and sleep recovery — 2026-10-08

Normal ranked timers now use an authenticated `/timer` endpoint in the existing
Sanctra worker. The browser sends session identity, running/paused state, device
and timezone; it does not send elapsed seconds. The worker verifies the Firebase
identity, reads the active-session owner and previous server timestamp, and
atomically settles the private clock and public ranking in a Firestore transaction.
No Gemini generation, AI allowance reservation or AI feature switch is involved.

Normal background/sleep intervals receive elapsed server credit on reconnection.
Strict-mode foreground pause/resume continues through the existing timer state
transitions. Countdown deadlines, the three-hour continuous-stretch cap and device
takeover remain enforced. New server-managed clock records reject client advances,
including attempts to remove their server-managed marker. Score deletion and admin
reviews remain supported.

Automatic legacy flags clear on an owned clock refresh, but explicit admin reviews
and confirmed decisions are preserved. A still-active legacy clock can settle its
pending elapsed interval. Already-discarded credit on a stopped legacy clock is not
reconstructed from editable personal-history records. The original 34m/21m mismatch
has not been verified or backfilled.

Validation: 31 focused timer, cap and manual-validation tests passed. Seven targeted
Firestore emulator tests passed, including client-write rejection, score removal,
and admin review. Production build and worker bundle succeeded. Physical laptop
sleep was simulated through time gaps in regression tests; no live study session
was created or stopped for testing.

Deployment: worker version c2392edc-a66a-451a-b85d-eb0c54e9d767; Firebase hosting and
Firestore rules released to studyapp-4137d. Deployed main bundle index-Bg5dkXOo.js
matches the local tested build byte-for-byte on Firebase hosting; the custom-domain
browser loads the same entry. The live `/timer` endpoint returns 401 without auth.

User test: reload sanctrastudy.live, start a normal count-up session with strict mode
off, let the laptop sleep for five minutes, wake and save. Ranking credit should
include the sleeping interval without an automatic review flag. Test strict mode
separately: leaving the foreground should pause that session's ranked clock.
