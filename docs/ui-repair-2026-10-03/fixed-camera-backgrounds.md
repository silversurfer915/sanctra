# Fixed-camera background replacement

Completed and deployed the audio/support batch first (b8f8bcc), then replaced the five moving-viewpoint background selections with Full HD fixed-composition river, rockpool, lake, fire and waterfall footage. Added Full HD rain-on-glass. Ocean Stillness remains unchanged. Existing preset IDs keep their saved selection; new media URLs avoid stale caches.

All six replacement files have a one-second tail/head overlap baked into their cyclic sequence. The end continues into the start without reversing water or fire. Compared stationary structures across separated frames and rejected a waterfall candidate with camera movement. Sources and licenses are recorded in public/backgrounds/video/CREDITS.md.

Build and 106 unit tests pass. Actual ScenicWallpaper/VipMedia preview reports 1920x1080 playing video, and continues playing after crossing the loop boundary. iPad landscape 1024x768 and portrait 820x1180 have no horizontal overflow, and the long timer readout occupies about 55% of the dial width. Frame difference checks are in video-loop-check.json; all joins are similar to ordinary adjacent motion, with rain showing a small absolute difference. This does not guarantee every viewer will find every transition imperceptible. Physical iPad Safari remains unverified.
