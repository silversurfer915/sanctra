# October 2 appearance release

Approved scope: six restrained coordinated themes (Sage, Warm Sand, Blue Mist, Lavender, Soft Rose, Charcoal), plus three illustrated scenic backgrounds. Signature themes are CSS gradients; scenes are original generated painted animation-style artwork with gentle pan/zoom. Reduced-motion users receive static scenes. Full-size WebP assets are 128–204 KB, with separate thumbnails.

Appearance colors now flow through CSS variables from saved activeWallpaperId. App surfaces are neutral glass rather than saturated green, and accents, inputs, dialogs, timer ring, consistency calendar and landing follow the chosen palette. Subject colors and danger/status semantics retain their meaning. Retired wallpaper IDs map to supported appearances without clearing records or other settings.

Sidebar content remains mounted while width/transform animates; collapsed navigation is inert and fully hidden. Settings remains mounted for its 280 ms exit, cancels delayed removal on reopen, supports Escape and backdrop close, and exits immediately for reduced motion. Calendar date controls are centered with Today underneath. Metric icons have consistent sizing. The header wordmark is hidden when the desktop sidebar already displays the brand.

Landing preview is a real timestamp-based countdown supporting pause, resume, reset and 25/50-minute choices; it writes no study records. Landing states fully free, solo meditation, focused work and relaxation; relaxing music is explicitly coming later.

Verification: TypeScript and Vite production build pass; 19 Node tests pass, including appearance migration coverage; diff check passes. Browser verification covered preview ticking/pausing, coordinated colors, theme persistence after refresh, desktop collapse to width zero, mobile menu, centered planner, 375x667 timer main clientHeight/scrollHeight both 603 and no horizontal overflow. Existing bundle-size and lint warnings remain.

Deferred by user: deeper group leave/delete/offline-member functionality overhaul, after visual review. No database reset or rules changes in this release.

## Follow-up refinement
Published a second appearance pass. All six abstracts reuse the original soft Sanctra folds with different rotations, lighting positions and gradient directions. Header frosting is removed; desktop sidebar uses a transparent fading tint with no hard divider, and mobile keeps a readable drawer tint. Glass panels catch more light. Header brand/status alignment is optically corrected; navigation/history controls are centered 36x36 flex buttons. Auth Google button has a dedicated high-contrast rule so broad background selectors cannot darken it.

Cloudside Study Desk replaces Rainy Reading Nook under the same saved appearance ID (blue palette). LoadingScreen uses the saved palette, Brand, soft folds and indeterminate progress without adding an artificial startup delay. Verified its rendered component through a temporary local preview and observed it on production reload. Custom domain serving `/assets/index-4zyToZcd.js`. TypeScript/build, 19 tests and diff check pass; existing build-size warning remains.


## Dynamic accents and startup polish
Published theme-aware emerald/green/teal utility overrides (including opacity, borders, rings, shadows and interaction states), theme-colored alpha-mask brand mark, optical wordmark alignment, subtle landing background drift, and gently wobbling loading orbits. Initial App mount keeps LoadingScreen visible for at least 1800 ms; menu and view changes do not retrigger it. Authentication can extend loading naturally. Reduced-motion preferences disable decorative animation.

TypeScript/build and all 19 tests pass. Browser verified branded loader followed by the app on production reload; custom domain serves `/assets/index-BRezACX2.js`. Only Hosting deployed; user data and backend rules remain intact.


## Landing alignment and visible motion
Theme-derived avatar fills, chart bars, preview line, task accents and companion illustration labels replace residual fixed greens. Feature copy and task illustrations are centered; closing CTA content has an explicit centered flex layout. Brand mark is optically lowered. Landing folds now sweep over 18 seconds with larger travel, rotation and scale; base lighting also moves over 18 seconds. Reduced-motion support retained. TypeScript and production build pass; browser confirmed lavender illustrations and active animation. Hosting release bundle: `/assets/index-7gf1R7jp.js`.


## Visitor defaults and wallpaper motion
Guest/signed-out defaults follow local hour: green 06:00–11:59, lavender 12:00–17:59, charcoal 18:00–05:59; update each minute. Explicit guest appearance choices override the default. Logged-in saved themes remain unchanged. Settings has a saved animated abstract wallpaper switch (default off), affecting every abstract app wallpaper; reduced-motion preferences take precedence. Landing retains independent always-on 12-second full-canvas fold motion with larger travel and scale. Residual green landing colors now derive from the palette. Footer uses equal side columns; browser measured its sentence center within 0.004px of page center. TypeScript/build and 19 tests pass. Production browser verified charcoal default and animated landing; bundle `/assets/index-D-b9uSEu.js`.


App abstract motion now matches landing-canvas-flow exactly: 12-second sweep, 85% fold intensity, and 180% moving gradient. Applies only to abstract wallpapers. Browser verified switch enabled and matching computed animation. Viewport disables pinch zoom where supported; browser accessibility zoom may override it. Production build passes.


Startup navigation no longer restores a previously saved planner/groups/inbox/analytics view. Normal domain visits and refreshes start on timer after authentication; explicit room invite navigation remains supported. TypeScript/build pass. Hosting bundle `/assets/index-nDwRiAOk.js`.


Analytics contrast: brighter axis labels, weekday labels and empty-state text; calendar dates always use paper text at medium weight. Empty calendar cells use 6.5% white. Analytics panels use 84% theme ink so scenery cannot wash out labels. Applies across all palettes. TypeScript/build pass; Hosting release `/assets/index-CQmTYoJo.js`.
