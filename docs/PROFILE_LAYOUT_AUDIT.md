# Profile layout audit — October 7, 2026

Profile-only CSS fixes preserve the existing styling and behavior:

- Mobile editor controls precede the live preview instead of being pushed below it.
- Structural editor columns no longer apply their own backdrop blur or background, removing rectangular patches inside the parent panel.
- Study-details action keeps its width and moves to a new header row when necessary.
- Long names, bios, status, group names and exam text wrap within their columns.
- Membership badges wrap alongside headings; narrow stat cells and save actions remain contained.

Verified in the real ProfileView preview at 1280px and 390px: summary, Identity, Signature, Study & privacy, Free and admin/Plus states; long unbroken display name; city edit/save; no horizontal overflow. TypeScript/Vite production build passed. Preview state was local only; production account persistence was not changed or tested.

Test on Sanctra: open Profile → Edit profile on a phone, confirm the section controls come first, switch all three sections, then cancel. Open Edit details, save a city and check wrapping. On desktop, confirm the editor controls and live preview remain side by side. Study details and exam goals stay below the editor.

Screenshots: [desktop](profile-audit-2026-10-07/desktop.jpg), [mobile](profile-audit-2026-10-07/mobile.jpg).

Additional iPad viewport verification: 820×1180 portrait, 1180×820 landscape, and 1024×1366 portrait. Identity, Signature and Study & privacy controls were exercised; no horizontal overflow was found. Portrait 820px stacks controls before preview, larger widths retain two columns. These are browser viewport checks, not physical-device Safari verification. [Portrait capture](profile-audit-2026-10-07/ipad-portrait.jpg), [landscape capture](profile-audit-2026-10-07/ipad-landscape.jpg).
