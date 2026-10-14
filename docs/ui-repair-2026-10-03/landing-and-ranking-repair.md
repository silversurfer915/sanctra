# Landing and historical ranking repair — 3 October 2026

The global ranking now includes registered public identities even when they have no new verified clock. Sidebar and presence avatars use the selected Plus identity when entitled, including animated media. These priority changes were released in e0f83a7.

The first verified-clock release excluded historical saved sessions. A one-time, atomic migration restored 4,610 seconds of current-day historical credit across two accounts, retaining new clock increments and recording each migration to prevent duplicate credit. Only saved sessions ending before the verified-clock launch were eligible. Historical credit is described accurately; it is not proof of attention. Existing server-bounded rules continue to constrain new time and prohibit users from changing the migration records.

Live checks returned all three public accounts and an hour-plus restored score. A disposable test account accepted a valid checkpoint, rejected forged time and self-clearing of integrity flags, and was removed afterward. Production owner UI login was not available in the audit browser; live ranking query checks and avatar regression tests provide the verification for those changes.

The landing page uses a native Full HD ocean clip with a blended loop, honors reduced motion, and pauses scenes outside the viewport. Quiet, coordinated section surfaces replace the conflicting image backdrops. Scenery remains in the hero, gallery and final call to action. Timer, subject, task and conversation previews work locally without writing study records. Unsupported AI and other missing-feature claims are omitted.

The build renders the actual public landing component into initial HTML, with its stylesheet, one H1, ordered headings, 915 words of crawlable content, canonical metadata, structured data, robots.txt and a homepage sitemap. Native FAQ answers are available without JavaScript. SEO checks validate these artifacts; they do not promise search ranking outcomes.

Validation: 118 application tests and 40 Firestore rules tests passed. Build, initial-HTML SEO checks and whitespace checks passed. Desktop 1440×1000 and iPad 1024×768 / 834×1194 were inspected; no horizontal overflow was detected. Timer controls, scene pause, task completion, local chat and FAQ expansion were exercised. Phone layout was excluded as requested.

Sources: [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Mixkit ocean footage and license](https://mixkit.co/free-stock-video/turquoise-ocean-background-with-foaming-waves-2091/). Video credit is also recorded in public/backgrounds/video/CREDITS.md.
