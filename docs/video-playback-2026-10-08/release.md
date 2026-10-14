# Video playback and loading release — October 8, 2026

Deployed Firebase Hosting only. Production entry: `/assets/index-BqJDvLBz.js`.

## Observed problem

The signed-in live app's Rockpool Stream player remained near one second with `readyState=2` and a tiny progressively growing buffer for minutes. The original file downloaded correctly in 2.19 seconds outside the player; its SHA-256 matched the local asset. Independent browser players could play the same file. This isolated the failing progressive playback path, but did not establish a general network or Cloudflare outage.

The previous player retried by calling `load()` and could reset its retry budget on any pointer/key event after falling back. The closed AI drawer also loaded its renderer and four Firestore subscriptions on every startup.

## Changes

- Nine curated clips re-encoded to 1280px H.264, with fast-start metadata and versioned immutable cache URLs. Rockpool Stream decreased from 27,276,069 to 3,958,202 bytes (85% smaller).
- Curated clips download completely before playback and loop from a local object URL. The poster remains visible while downloading. Partial (206), empty, failed and HTML responses are rejected. Abort/download and object URL cleanup follow the mounted player lifecycle.
- Removed automatic media reload/gesture retry cycles. Hidden-tab pause and visible/user-gesture resume remain; custom video URLs keep their original source.
- Landing ocean uses the same complete-clip playback path.
- AI drawer/renderer load on first opening. Closing it preserves conversation state but stops allowance listeners. Main startup JS decreased from roughly 1.1 MB to 657.65 KB (191.92 KB gzip); AI is a separate 453.56 KB chunk.
- No timer, auth or group logic changed. Firebase AI Logic cleanup deferred at the user's request.

## Verification

- Production build and prerender passed.
- Eight focused video/custom background tests passed, including waiting for EOF, rejecting partial/invalid responses, object URL disposal, preserving custom media and compact fast-start asset checks.
- All nine optimized clips decoded fully with FFmpeg without errors.
- Browser component preview: Rockpool Stream completed four loops with one media load, `readyState=4`, 19/19 seconds buffered. Ocean completed four loops with its whole 29.79-second clip buffered (a development hot update caused the second load).
- Live `sanctrastudy.live` serves the new entry file and immutable optimized MP4. Live MP4 SHA-256 matches local. Live landing video uses a blob URL with 10.01/10.01 seconds buffered, `readyState=4`, and is playing.
- Focused lint passed; global lint scans existing binary HLS `.ts` segments as TypeScript and fails UTF-8 parsing, alongside existing warnings.
- Full test suite: 233 tests, 226 passed, seven legacy Firebase AI Logic failures. Two expect the obsolete model `gemini-3.8-flash`; five call the disabled legacy Firebase AI API. Production chat uses the direct Gemini API via the worker.

Existing failing tests in `tests/aiLogic.test.ts`:
1. DEFAULT_AI_FIREBASE_CONFIG has valid projectId and appId
2. getAIModel returns GenerativeModel configured for Gemini 3.8 Flash
3. Firebase AI Logic generates content and passes live health check
4. Firebase AI Logic streaming yields non-empty chunks
5. breakdownStudyTopic returns valid structured modules
6. generateStudyPlanSchedule and generateAndInsertStudyTasks produce tasks with dates and times
7. analyzeStudyPacing produces cognitive pacing assessment
