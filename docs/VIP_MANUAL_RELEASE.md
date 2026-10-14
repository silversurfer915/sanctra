# Manual VIP membership — isolated branch

Owner direction, 2 October 2026: no payment gateway. Members open a private support ticket, the owner replies with UPI/payment instructions, verifies payment outside the app, and manually activates membership.

Prices: ₹59 for 30 days, ₹159 for 365 days, ₹99 for the limited early-user first year. No automatic debit or automatic renewal. Renewal is another support conversation and owner activation. No UPI account or payment credentials have been invented or stored in source.

The ticket admin panel can activate, extend or revoke Plus. The platform member controls can also grant access directly. Active renewals add the plan period after the existing expiry; expired or revoked memberships start at activation time. The browser cannot grant itself membership: Firestore admin checks protect writes.

Grant/revoke actions create immutable membership audit records. Manual grants do not fabricate paid invoices. A support grant checks that the ticket belongs to the target member. Profile and ticket benefits use effective status and expiry rather than the raw isPlus flag.

Integration hold: this work is in the separate sanctra-vip worktree. Do not merge or deploy until Gemini's fixes are finished and the user authorizes integration. Merge narrowly and recheck current UI/rules before any future release. Firestore rules are not deployed.

Implemented perks: HTTPS-linked animated avatars with static/initial fallback; profile auras, frames and custom image/video scene; three exclusive scenic wallpapers, flowing light animation and a personal MP4/WebM wallpaper; custom invitation codes with collision protection; 500 group messages per UTC day versus 250 free, counted atomically across devices; priority ticket eligibility enforced by Firestore. Reduced-motion preferences disable animated media. Membership expiry is checked centrally and removes active benefits without a reload. Media is linked, not uploaded or hosted by Sanctra.

Local validation: production TypeScript/build passed, 77 unit tests passed, and 25 Firestore emulator tests passed. Desktop profile save and invalid-media validation checked in the local-only fixture, plus mobile wallpaper controls at 390px with no horizontal page overflow. To inspect locally, start Vite in this worktree and open `/tests/vip-preview.html`; it uses dummy membership and no Firebase initialization or live writes. This fixture is not part of the production build.

Remaining integration work: reconcile owner access permissions and profile/settings changes with Gemini's current branch, expose membership audit in Admin, add explicit grant/revoke confirmation, and verify the complete owner-ticket activation journey on the integrated build. Group creation counts retain the existing client-side quota check; daily message caps and custom-code eligibility are rules-enforced. Existing gateway utility/tests are legacy, unused by this manual flow. The previously proposed early-offer end date and refund/renewal policy in the old payment specification are not user-approved terms; revisit them before presenting any launch terms.
