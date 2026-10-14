# AI admin controls

Open Admin → AI. Controls apply to new gateway requests without redeployment:

- Global availability and maintenance message, including admin accounts.
- Runtime Gemini model, with an authenticated list of available generation models.
- Chat, manual session logging and ranking validation feature switches.
- Default requests per minute per account; individual overrides.
- Member access, extra daily messages and optional total daily cap. Admins retain unlimited daily messages, but availability and rate controls still apply.
- UTC daily provider requests, failures, input/output tokens and estimated USD cost per member. No prompts or chat text are stored in telemetry.

Pricing defaults to unconfigured. Enter the provider's input/output USD prices per million tokens to enable estimates. Output accounting includes thinking tokens. These estimates are not a billing statement. Usage begins with this release; blocked requests, cached validation and model listing are excluded. Requests already running are not canceled by the kill switch.

## Test on the deployed app

1. Sign in as an admin and open Admin → AI. Load available models, choose a supported model and save. Send an AI message; check its latest model and tokens in Daily usage.
2. Switch AI availability off, set a maintenance message and save. Send a message as a member: it should show that message without using a daily message. Restore availability afterward.
3. Open a member's access settings. Set a daily cap, save and verify their remaining messages. Pause that member and confirm their requests are blocked; restore access afterward.
4. Disable manual session logging, save, and ask chat to log a past session. It must not offer an executable session addition. Restore the feature afterward.
5. Set a member's per-minute limit to 1. Their second new request in the same UTC minute should be rate limited. Reset the override afterward.

Verified with 36 focused gateway/chat/manual tests, 58 Firestore rule tests, production TypeScript/Vite build, and desktop/mobile themed UI preview.
