# Audio, attachments, ticket alerts and iPad refinement

Live YouTube search now returns embeddable music results inside Focus Audio, with Play and Save actions. The connected project has YouTube Data API enabled and a browser key restricted to that service and Sanctra origins. Linked playback uses a persistent visible official player, rather than a hidden audio-only embed. Ambient volume controls are explicitly labeled Ambience.

Group and support messages accept one JPEG/PNG/WebP image, converted to metadata-free bounded JPEG before saving under the existing private message permissions. Message thumbnails open a lightbox. New/open tickets have a persistent admin bell and dismissible queue notification outside the admin panel. Ticket queries select the most recently updated 200 records; the required owner/query index is deployed. The bell covers the loaded queue, not an unlimited historical ticket count.

Profile atmospheres use subtle champagne, constellation and jade materials instead of opaque colorful washes. Timer digits size against the dial width, including landscape iPad. Support replies align according to the current sender.

Validation: build; 106 unit tests; 35 emulator rules tests, including attachment validation and group/ticket privacy. Isolated real-component iPad preview verified live search, saving, official playback continuing with panel closed, image preparation and lightbox Escape. Production ticket delivery and physical iPad Safari are not yet directly verified.

Follow-up: at the user’s explicit request, removed the visible linked-video MiniPlayer and restored independently mounted hidden playback. Browser verification showed unpaused playback advancing from 1.49s to 25.30s after closing Focus Audio; Stop removed the playback iframe. This uses the prior hidden-embed behavior rather than the visible-player approach described above. Build passes.

Compact control refinement: single-line 44px glass pill, one keyboard-accessible icon/title button, full title tooltip, and transparent 42px Stop target. Removed the header subtitle and decorative pictographic title characters that rendered as missing-glyph boxes. iPad 1024px actual Header preview verified 254px control width, no horizontal overflow, and Stop resetting the header. Build passes; background playback behavior is unchanged.
