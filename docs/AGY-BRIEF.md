# Hello agy — design brief for the Sanctra reskin

You are pairing with another agent (Hermes) on the same repo. Hermes owns
build/test/deploy and the app's wiring; **you own visual design and layout**.
Work on a branch and leave the tree clean and building.

## What Sanctra is

A calm study desk: Pomodoro / countdown / stopwatch, task planner, calendar,
analytics, study rooms. React 19 + TS + Vite + Tailwind v4, lucide icons.
Live at https://sanctrastudy.live (GitHub Pages-style static build behind a
Firebase project). Preview routes work signed out: `?view=timer`,
`?view=planner`, `?view=analytics`, `?view=calendar`.

## The direction the user asked for

**Light, fun, gamified, pixel-editorial — close to Uiverse's OVERWORLD
design system.** Not a dark app. Not glassmorphism. Not a generic
dashboard-with-sidebar.

- Warm parchment ground (`#f6ecd6`), ink text (`#231a11`), hard 2–3px ink
  rules, offset hard shadows (`4px 4px 0`), zero blur, near-zero radius.
- One chunky display face: **Pixelify Sans** (already loaded) for headings,
  numerals, labels; Inter for body copy.
- Accent set: gold `#e9b44c`, rust `#c2683a`, moss `#5f8a5a`, sky `#6aa6c9`,
  rose `#d98b8b`. Gold is the user's standing requirement — keep it as the
  primary action colour. No purple, no default Tailwind indigo/emerald.
- Gamified language: quests, stickers, tiles, little pixel landscapes,
  progress as chunky bars rather than hairlines.

## Do not just repaint the old layout

The user has rejected three reskins of the existing chrome. Change the
**composition**:

- Sidebar is already a 100px dock of square tiles — keep or replace, but do
  not go back to a list-in-a-panel.
- Header is a floating HUD card top-right. The content should not sit under a
  full-width bar.
- Focus Room is now: full-width world strip (CSS pixel sky/hills/sun) with a
  square clock console, then a 4-card stat row, then task slip + quote.
  Make it genuinely good, or rebuild it better.
- Tasks view is a two-column quest log. Calendar, Analytics, Groups still
  carry their old internal layouts — those are yours to rebuild.

## Existing style layers (import order in `src/main.tsx`)

1. `styles-sanctra.css` — the original app styles
2. `styles-studio.css` — dark studio layer (superseded)
3. `styles-overworld.css` — dark pixel layer (superseded)
4. `styles-light.css` — light parchment layer (current tokens)
5. `styles-arcade.css` — current layout layer (dock, HUD, focus room, tasks)

You may add a new file and import it last; you may also delete/rename the
superseded dark layers if you clean their imports. Keep `styles-light.css`
tokens or replace them wholesale — your call, but one source of truth.

## Hard constraints

- Keep every existing route, button, handler and aria-label working. This is
  a visual/layout pass, not a feature change. `onClick`, `aria-*`, `role`,
  inputs and keyboard focus behaviour must survive.
- Light theme. Contrast must be readable: no cream text on parchment, no
  dark-on-dark. Body text at least `#3a2f20`.
- Responsive at 390 / 820 / 1440; no horizontal overflow.
- Respect `prefers-reduced-motion`.
- Do not add dependencies. Use the icons and fonts already present.
- Do not touch `src/utils/`, Firebase config, auth, payments or data logic.

## Definition of done

```bash
npm install        # first run only
npm run build      # must pass
npm run lint       # must pass
```

Then leave the working tree committed on `design/agy` with a short message
per screen, and a `DESIGN-NOTES.md` at the repo root listing what you changed
and anything you deliberately left alone.

## How to see your work

```bash
npm run dev -- --port 5199 --host 127.0.0.1
```

Open `http://127.0.0.1:5199/?view=timer` (also `planner`, `analytics`,
`calendar`). The authenticated desk needs a login; the preview routes render
the same components signed out, which is enough for visual work.
