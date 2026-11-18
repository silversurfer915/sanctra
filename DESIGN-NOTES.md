# Sanctra Redesign Notes · Daylight Overworld Edition

## Direction & Aesthetic Foundations

Sanctra's desk has been transformed into a **light, fun, gamified, pixel-editorial** workspace inspired by the **OVERWORLD** design system:
- **Ground & Surfaces**: Warm parchment (`#f6ecd6`, `#fffaf0`, `#efe2c6`), ink text (`#231a11`), hard 2–3px ink rules (`#2a2116`), hard offset shadows (`4px 4px 0 #2a2116`), zero blur, near-zero border radius.
- **Typography**: **Pixelify Sans** for headings, numerals, stamps, and action labels; Inter for body copy.
- **Palette**: Gold (`#e9b44c`, standing primary action colour), rust (`#c2683a`), moss (`#5f8a5a`), sky (`#6aa6c9`), and rose (`#d98b8b`).
- **Composition**: Dock spine navigation of square tiles, floating HUD status card, full-width focus world strip with square clock console, and two-column quest logs.

---

## Screen Breakdown

### 1. Calendar
- **7-Tile Week Strip**: Added an interactive 7-tile week strip of chunky paper date tiles at the top of the calendar board. The current day is stamped in gold (`#e9b44c`) with a `TODAY` ink seal, showing daily quest counts. Clicking any day immediately focuses that date.
- **Day Agenda as Quest Slips**: Each entry is formatted as a quest card with a dedicated **time gutter** on the left (e.g. `09:00`, `ALL DAY`) separated by a vertical ink rule, and quest details on the right with a stamp checkbox and focus action.
- **Coloured Event Chips**: Events render as crisp paper chips using moss (`#e8f0e2`, `#5f8a5a`), sky (`#eaf3f8`, `#6aa6c9`), and rose (`#fae8e8`, `#d98b8b`) with 2px ink rules and dark ink text.
- **Killed the Old Toolbar Card Look**: Replaced glass pill navigation with chunky square parchment buttons, segmented tab bricks for Month/Week/Agenda, and paper filter tags for Tasks, Events, and Completed items.

### 2. Analytics
- **Stat Bricks Across the Top**: Relocated the four core metric cards to the top of the view in a 4-brick row (Focused Time, Sessions, Active Days, Daily Average). Each brick features a 3px ink border, 4px 4px offset shadow, Pixelify Sans numeral, and tinted paper ground (gold, sky, moss, rose).
- **Chunky CSS Bar Chart**: Replaced the SVG sparkline with a pure CSS bar chart sitting on a **3px ink baseline**. Bars are 3px-outlined blocks with offset shadows, no gradients, and no chart libraries. Hover states reveal daily durations; days achieving daily goals are highlighted.
- **Subject Legend with Square Swatches**: Upgraded the subject breakdown to a clean legend with **square swatches** (`14px x 14px`, 2px ink outline) and chunky 0-radius progress bars with 2px ink borders.
- **Goal Progress Meters**: Updated goal rings to chunky ink strokes with gold fill.

### 3. Groups
- **2-Up Room Card Grid**: Rebuilt room discovery and joined rooms into a 2-up responsive grid (`grid md:grid-cols-2 gap-5`).
- **Pixel Occupancy Meter**: Added a segmented 5-block pixel meter to each room card indicating current activity (`OCCUPANCY METER`, `3 SCHOLARS`).
- **Rhythm as a Sticker**: Displayed room timer mode (e.g., `POMODORO`, `DEEP FLOW`) as a paper sticker angled at `-1.5deg` with a 2px ink border.
- **Big JOIN Brick**: Replaced the plain link button with a full-width gold action brick (`group-join-brick`, 3px ink border, 4px shadow, Pixelify Sans label: `JOIN GROUP` or `ENTER ROOM`).

### 4. Tasks (Planner)
- **Two-Column Quest Log**: Structured task lists into a responsive two-column quest grid on tablets and desktop (single column on mobile).
- **Stamp-Style Checkboxes**: Replaced circular icons with square stamp checkboxes (`24px x 24px`, 2px ink border, 2px shadow) that turn solid gold with a bold ink checkmark `✓` when completed.
- **Subject Paper Tags**: Rendered subject badges as small paper tags with a left colour swatch border and square indicator dot.
- **Due Time Corner Stamp**: Placed time slots (`startTime – endTime` or due dates) as a paper stamp in the top-right corner of each card.
- **Clear Completed State**: Completed tasks transition to an aged parchment ground (`#efe2c6`), dashed 2px ink border, strike-through text, and a `STAMP: DONE` badge.
- **Paper Date Strip**: Day navigation upgraded to chunky paper date tiles with today stamped in gold.

### 5. Focus Room
- **Game HUD Architecture**: Maintained the world landscape strip (pixel sun, layered hills, horizon ground line) and square console, integrated into a unified HUD.
- **Inventory Strip**: The four metric cards (Subjects, Today's Progress, Streak, This Week) render as an inventory strip with distinct slot tints (Moss, Gold, Rose, Sky) and uppercase slot kickers.
- **Active Quest Card with Gold Corner Flag**: The current task slip is styled as an active quest card featuring a gold corner banner (`ACTIVE QUEST`), Pixelify Sans title, and chunky action buttons.
- **Square Clock Console**: The console sits firmly in the landscape with a 3px ink border, 8px hard drop shadow, bold Pixelify Sans numerals, and prominent gold `START / PAUSE` brick.

---

## What Was Deliberately Left Alone

1. **Core Data & Logic**: Untouched all files in `src/utils/`, data stores, Firebase authentication, Firestore rules, and real-time synchronization.
2. **Accessibility & Interactions**: Preserved all existing `onClick` handlers, `aria-*` attributes, semantic tags, and keyboard shortcuts (`t`, `m`, `w`, `a` for calendar navigation; `Escape` for modals).
3. **No New Dependencies**: Zero new packages were added; leveraged existing loaded fonts (`Pixelify Sans`, `Inter`) and `lucide-react` icons.
4. **Motion & Contrast**: All animations respect `prefers-reduced-motion`, and all text maintains high contrast against warm parchment (ink text `#231a11` / `#3a2f20`, never low-contrast cream on parchment).
5. **Responsive Integrity**: Verified no horizontal overflow across 390px (mobile), 820px (tablet), and 1440px (desktop) viewports.
