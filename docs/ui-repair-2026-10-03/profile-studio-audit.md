# Profile Studio and shared layout repair — 3 October 2026

## Fixed

- Profile editor repeated portrait choices and scattered related appearance controls across one long form. Identity, Signature and Study & Privacy now have separate sections with a shared draft and persistent live preview. The other profile panels hide during editing.
- Four simple engraved icon portraits have been replaced with 512px scalable illustrated scenes with gentle independent animation and reduced-motion fallbacks. Collections pair them with full-resolution illustrated banners. Existing character portraits, personal media links, individual aura/frame/atmosphere controls and reset remain available.
- The preview uses the same VipMedia, RankingBackdrop, IdentityTags and appearance classes as groups/rankings. It shows the actual draft portrait and banner. Sample time/message content is illustrative, not the account's actual activity.
- Collection selection reflects the full coordinated signature rather than just a matching cover. Choosing another portrait or changing a frame no longer misleadingly labels the full edition as selected.
- iPad preview names were squeezed by the trailing message text. Preview rows now use a bounded two-column grid with the message/time on a separate line. Long names wrap without horizontal scrolling.
- All normal workspace panels use the same 18px blur material on desktop and WebKit. Nested panels and stats no longer reapply that blur. Theme colors are preserved; transparency is not replaced with solid fills. Reduced-transparency preferences have an opaque fallback.
- The shared page reset removed Help & Feedback's empty-state padding. Empty states now explicitly retain responsive padding, bounded copy widths, wrapping, heading spacing and button clearance. This also covers ranking, admin, ticket conversation and integrity empty states.
- Empty display names and weekly targets outside 0–168 hours now block saving with a readable error. The primary exam stays read-only and synced from Goals.
- Form fields have 46px minimum touch height, a properly sized bio textarea, focus outlines and selected-state indicators. Save/cancel remain available in a sticky action strip. Draft cancellation restores the saved profile on reopening.

## Verification

- Real React components in the isolated `tests/profile-studio-preview.html` fixture. It does not initialize Firebase or write production data.
- Native WebKit browser at desktop 1440×1000, iPad landscape 1024×768 and portrait 834×1194. Verified viewport geometry and horizontal overflow, not just resized screenshots.
- All six palettes: blue, sage, sand, lavender, rose and charcoal. Shared empty states retained their padding and 18px blur with zero page overflow.
- Exercised collection selection and loaded artwork, individual controls, name wrapping, live draft updates, cancellation, numeric validation and a successful local save. Photo/media validation still checks decoded assets before saving.
- 125 tracked app tests pass, including full-size banner availability and safe SVG/reduced-motion checks. Production build succeeds. Lint exits successfully with existing warnings in other parts of the app; this is not a claim that all warnings or all application bugs are resolved.

## References and boundaries

Applied ui-styling, ui-ux-pro-max and design-system guidance while preserving Sanctra's established fonts, palettes and quiet glass styling. [Linear's profile documentation](https://linear.app/docs/profile) informed the separation of everyday identity fields from account details. [Apple's Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass) was consulted as a material reference, rather than copying native-only visual effects.

This pass addresses the reported profile, shared spacing and excess-blur defects. It does not certify the entire application as release-ready. Physical iPad hardware, its display accessibility settings and the owner's authenticated cloud-save round trip require device/account testing; the isolated fixture verifies the editor and local save callback without modifying the owner's account. Existing backend rules and ranking logic were not changed by this UI pass.
