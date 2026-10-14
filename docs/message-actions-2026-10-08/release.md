# Compact message actions — October 8, 2026

Replaced the persistent Reply/Copy/Remove row with a side dropdown. Desktop reveals the trigger on hover or keyboard focus; touch devices keep a 40px trigger available. Existing callbacks and removal permissions are unchanged.

The menu is anchored to the message and repositions on scroll/resize. Escape, outside-click dismissal, arrow navigation and focus restoration are supported. Copy feedback is announced to screen readers.

Verification: four group-conversation tests passed, production build passed and scoped diff whitespace checks passed. The real conversation component in an isolated browser fixture verified Reply, Copy, permission-dependent Remove, the existing removal confirmation/cancel flow, keyboard navigation and Escape. No production messages were created or deleted. At 390px, the menu stayed inside the viewport with no horizontal overflow. Evidence: menu-phone.png.

Firebase Hosting deployment completed to studyapp-4137d. Live sanctrastudy.live HTML references the matching production asset index-DpO5BC0Y.js. No backend changes were required.

Published and read back the daily update announcement release-2026-10-08-major-updates. It appears in member inboxes and once per user as a product-update popup; the popup expires after 14 days. Source: ../ANNOUNCEMENT_OCT_08.md.

User check: refresh Sanctra, hover a message and open its arrow; on touch, tap the arrow. Reply/Copy remain available, and Remove appears only where permitted.
