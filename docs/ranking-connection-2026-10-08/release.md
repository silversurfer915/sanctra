# Ranking connection recovery

The screenshot notice originated in useStudyIntegrity's generic catch: it hid HTTP server/session errors and asserted that time was counting even when server start was unconfirmed. Its periodic sync only ran while running, leaving an idle/paused failure stale until a visibility/online event.

Added bounded 5/10/20/30-second retries for transient failures independent of timer state. Retries capture the latest timer identity and status, never replay an old action. Success/account cleanup cancels retries. HTTP errors retain their server message; session conflicts do not get backoff retries. No server timer/strict-mode/credit/cap/auth logic changed.

Attached api.sanctrastudy.live to the existing sanctra-ai Worker, preserving its bindings, credentials and allowed origin. Updated local build gateway and Wrangler custom-domain configuration. No Worker code redeployment necessary. Both old and new endpoints had intermittent local TCP/TLS timeouts; changing the hostname alone is not evidence of fixing the underlying network path. No device network configuration changed.

18 focused tests and production build passed. Isolated live registered test account verified server start, paused settlement and two seconds of clear ranking credit through api.sanctrastudy.live, with a routing diagnostic to another Cloudflare edge because the local default route was intermittent. All disposable Auth/timer/integrity/ranking records cleaned up. Script scripts/server-timer-connection-smoke.mjs defaults to ordinary DNS; optional SANCTRA_SMOKE_EDGE_IP is for diagnostics only, not shipped client code.

Firebase Hosting deployment complete. Release index-WMmy0yQJ.js includes the new gateway and retry behavior. Physical user-network connectivity still needs user verification after refreshing. Repeated banner after refresh must be diagnosed by its now-specific message rather than assumed to be an anti-cheat flag.
