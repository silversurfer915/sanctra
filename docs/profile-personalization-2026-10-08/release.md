# Profile personalization · 8 October 2026

This is an ordinary extension of Sanctra's existing profile editor. It preserves the dark, dynamic glass interface and existing account settings rather than introducing a new visual world. `DESIGN.md` and `.impeccable/design.json` remain unchanged. No deployment is recorded by this release note.

## Delivered scope

- Five new illustrated companions—Book Owl, Fern Fox, Copper Koi, Luna Moth, and Scarf Cat—have their own looping GIF and still WebP assets in `public/avatars/motion/`. These portrait illustrations are separate from the existing landing and timer artwork.
- The Portrait section offers their still portraits, the account photo when available, initials, and a personal HTTPS photo link. Plus members can choose the five animated portraits or preview a direct HTTPS GIF, MP4, or WebM link before saving. Existing illustrated portrait presets remain available under “More illustrated portraits.”
- A single shared Plus ring replaces the visible frame/effect chooser. The same restrained sage-and-paper ring is used by the profile, collection previews, and ranking identity; its orbit takes 18 seconds. Existing stored frame/effect settings are not rewritten by profile saving.
- The editor has About you, Portrait, Style, and Study & privacy sections with a live identity preview. The preview includes group and ranking contexts, while existing banners and collection art remain available.
- Study details stay immediately below the editor and save independently. Status, class/grade/year, stream/field, and study setup have inclusive choices, a “Prefer not to say” option, and custom entries. Country suggestions and free-text city entry remain available. Grade choices span primary school, Classes 1–12, international school qualifications, diploma/undergraduate/postgraduate years, doctoral research, and other stages.

Implementation scope: `ProfileView`, `ProfilePortraitPicker`, `StudyDetails`, `ProfileCollections`, `RankingIdentity`, `VipMedia`, the `profilePortraits` and `studyDetailsOptions` utilities, and profile-only `profile-layout.css` / `signature-ring.css`.

## Comparison with the incumbent system

| Existing design decision | Extension behavior |
| --- | --- |
| Forest ink, forest surface, paper text, sage accent, muted sage | Uses the existing `--sanctra-*` variables for text, selection, focus, borders, and the ring; existing dynamic themes continue to supply their colors. |
| Playfair Display headings and Inter body/metrics | Keeps inherited typography. Portrait captions are compact 11px labels, supporting copy is 13px with 1.65 line height; no additional font family is introduced. |
| Translucent glass panels with restrained frosted borders | Keeps the outer editor and study-details glass. Structural editor columns are transparent rather than adding another glass layer. |
| Soft corners and calm exponential easing | Portrait tiles use 10px image corners, 12px controls, and the incumbent `cubic-bezier(.22,1,.36,1)` hover easing. |
| Responsive whitespace and keyboard focus | Desktop pairs the controls with a preview; below 1000px they stack. Below 640px navigation becomes two columns and motion portraits become three columns. Selects and principal mobile controls have at least 44px height. Portrait buttons expose selection through `aria-pressed` and use a visible sage focus outline. |

The inherited named rules—the Rarity of Sage, No-Pure-Gray, and Single-Elevation rules—are not rewritten or expanded by this change. The new ring is a profile identity treatment, not a mandate for ambient animation across the app.

## Data and motion behavior

Study details remain strings in the existing settings map. Values such as `12th`, `School Student`, `PCM`, and `Enrolled in Coaching` stay valid; an unmatched value opens as a custom entry instead of being silently replaced by a predefined choice. Saving trims text and limits each field to 80 characters. Profile saving updates existing settings fields without adding a new account schema or discarding legacy frame/effect fields.

For included GIFs, reduced motion displays the matching WebP companion. For custom animated media it displays the member's still portrait, or initials if no usable still image exists. Media failures fall back to the still portrait; the ring stops animating under reduced motion, and portrait hover movement is disabled. Video playback also responds to page visibility.

Custom media is **link based; there is no upload flow**. A supplied animated URL must use HTTPS, point to GIF/MP4/WebM media, and pass the existing media checks before it can be previewed and saved. External hosting availability and browser playback support affect display; external hosts receive display requests. A still screenshot does not prove animation playback or reduced-motion behavior.

## Evidence and validation

- Inspected source: all scoped components and utilities, both profile-only stylesheets, `PRODUCT.md`, `DESIGN.md`, and the existing token definitions in `src/styles-sanctra.css` / `src/index.css`.
- [Desktop portrait editor](desktop-portraits.png): 1274 × 2158 capture with the five distinct companions, portrait navigation, side-by-side editor/preview, preserved banner, and study details below.
- [Mobile portrait editor](mobile-portraits.png): 390 × 3400 capture with two-column navigation, stacked preview, three-column motion choices, selected owl appearing in the profile and community previews, and preserved legacy study details. These are local preview-harness captures, not production screenshots.
- Implementation handoff reports 10 targeted tests passing and a production build passing. The personalization tests inspect GIF headers and loop metadata, independent WebP fallbacks, legacy/custom study values, broad grade/country coverage, and secure animated-link validation. The final build and all 10 targeted tests passed after the navigation and disclosure-icon fixes. The independent review scored its disclosure-icon finding resolved (ship at that scope).

## Existing drift not canonized

`DESIGN.md` records a fixed forest palette and glass formulas, while the incumbent app supports dynamic themes and adjustable glass clarity; the screenshot evidence uses the existing blue theme. Existing uppercase preview/detail labels also remain visible despite the documenter craft-floor guidance against adding kickers. These inherited differences are reported rather than promoted into new design-system rules or repaired outside this profile extension.
