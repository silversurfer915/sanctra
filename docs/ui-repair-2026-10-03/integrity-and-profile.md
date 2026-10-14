# Verified ranking clock and profile collections

Implemented October 3, 2026 without Cloud Functions or a billing upgrade.

Competitive scores now come from a Firestore Rules protected account clock. Server timestamps bound each increment; concurrent devices cannot score under an active lease. Impossible accepted timer claims earn no credit and leave a sticky review flag. Administrators can confirm or clear flags with a review note in Admin > Time integrity. Review and confirmed badges appear in rankings, group member rankings, conversations and the account profile. Confirmed accounts have zero competitive score.

Verified competitive totals start at this release. Existing saved, imported, manual and offline sessions remain in personal analytics but are not imported into competitive scores. Periods use UTC, with Monday-start weeks. Checkpoints run once a minute while active and on timer transitions. The free Firebase quota still applies. This validates elapsed time, not actual attention or studying; rejected database writes do not themselves produce an automatic flag.

Removed the distracting header Admin/Plus badge. Added four coordinated SVG identity collections with medallions, banners, frames and animated auras. Profile editing previews the actual ranking and conversation styling, validates custom media before saving, and preserves the previous appearance when a link fails. Existing character avatars remain available in a collapsed section.

Validation: 117 app tests, 39 Firestore rule tests, production build, all six competitive query indexes READY. An isolated live anonymous account verified a normal checkpoint, rejected forged totals and self-clearing, and persisted a mismatch review flag. The test account and its clock were removed afterward. Profile previews checked at 1024×768 and 834×1194 without horizontal overflow; equip/save/cancel, broken-media rejection and Plus revocation were checked. Aura rotation was observed in computed styles. Preview accounts were fixtures, not a production owner-account session.

AI planning was discussed but not implemented or advertised. Firebase AI Logic with Gemini can provide task drafts and statistical insights under its free-tier limits; generated task creation should require review and acceptance.
