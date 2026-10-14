Previous profile build deployed first, then profile spacing and browser chrome fixes deployed to Firebase Hosting studyapp-4137d on October 8, 2026.

Profile cards now have 24px section gaps (20px on phones). Public collection cards use two columns, one on phones. At 1024px measured24px gap, two446px columns and no horizontal overflow. Evidence: ../profile-personalization-2026-10-08/ipad-spacing-fixed.png.

Theme colour and boot canvas now follow loaded appearance settings. Apple standalone status bar explicitly uses neutral black. Physical iPad status-bar appearance still needs owner confirmation.

YouTube embeds now request inline controls. Proposed visible player was removed before publishing at owner's instruction. Existing hidden playback is retained; no claim of iPad playback success. Official YouTube API exposes an embedded player, not direct audio-only streams. User choice requested: in-app direct audio links plus external YouTube, or investigate hidden playback. No extraction/proxy service added.

Production build passed; 11 focused tests passed. Firebase release complete; deployed metadata verified over HTTPS.

Follow-up: inspected groupstudytimer.com/timer in signed-in Chrome. Their focusAudioPlayer is a persistent 1px offscreen YouTube IFrame API player (enablejsapi=1), controlled through custom UI. Actual hidden video was unmuted and playing; their Pause button paused it. This is desktop evidence, not iPad evidence.

Replaced Sanctra's remounted autoplay iframe with one preloaded IFrame API player, privacy-enhanced host, playsinline=1, origin protection, custom Play/Pause/Stop, real state/error handling and linked volume. Player stays offscreen and survives closing the panel. No audio extraction/proxy. It has a 200px internal viewport to meet the documented API minimum, without occupying UI space. API loads only after opening Focus Audio. Playback-blocked event and ten-second timeout offer a Play retry.

Chrome verified official embeddable sample M7lc1UVf-VE actually playing (readyState4, pausedfalse, currentTime43s); Pause and resume worked, closing the panel preserved playback, Stop stopped it. A tested live-stream link rejected embedding and now displays a clear error. Physical iPad testing remains necessary. Screenshot: hidden-api-player-check.png.

16 focused tests passed; production build passed. Firebase Hosting deployment complete; custom-domain HTML references index-B2b9gBiL.js; the full bundle on studyapp-4137d.web.app contains the API integration and retry hint. The custom-domain bundle download was unusually slow and was stopped after HTML verification.
