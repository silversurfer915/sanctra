# Sanctra AI gateway
Free Cloudflare Worker deployment; no Firebase Functions or Blaze dependency.

Set GEMINI_API_KEY as a Worker secret, then deploy from this directory using Wrangler. Set VITE_AI_GATEWAY_URL to the resulting HTTPS Worker URL and rebuild Hosting. Never place the Gemini key in a VITE variable.

The gateway allows only the configured Sanctra origin, authenticates Firebase users through Firestore, reserves one atomic ai_days allowance before requesting Gemini, and rejects off-topic instructions before reserving. Firestore rules determine the current 3/12 entitlement and UTC day. Errors do not expose provider responses. Each accepted request attempt counts; retries and regeneration are messages too. Apply/Undo and local Insights cost no messages.

The local scope check is conservative and the server system instruction constrains output. Natural language classification is not a perfect semantic guarantee; adversarial text containing scheduling terms can pass the check, but cannot exceed the enforced daily allowance through this gateway. The legacy Firebase AI Logic browser API was disabled for studyapp-4137d after live gateway verification. The server Gemini API remains enabled. Legacy ai-demo / live SDK tests no longer represent the production path.

Deployment verified: https://api.sanctrastudy.live. Live Plan and Chat decrement the same counter; a blocked teaching request leaves it unchanged. Quota increments use Firestore document-version preconditions and retry conflicts, avoiding beginTransaction permissions that reject Firebase user tokens.
