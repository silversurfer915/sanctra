---
name: Sanctra
description: An atmospheric study workspace with neutral glass and restrained pastel accents.
colors:
  canvas: "#17181D"
  surface: "#292B33"
  text: "#E8EEF7"
  text-muted: "#B9CBE1"
  primary: "#B8DCF5"
  blush: "#F2C3CC"
  gold: "#F3DBA7"
typography:
  display:
    fontFamily: "'Manrope Variable', Manrope, Inter, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "12px"
  panel: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
---

# Design System: Sanctra

## North Star

Preserve Sanctra's identity and approved scenery. Improve clarity, color and density within the existing interface. No competitor or abandoned redesign is an app-wide style authority.

## Color

Use neutral smoked glass with sky, blush and soft gold for purposeful distinctions. Status colors retain their meaning. Do not tint whole screens sage, purple or brown. Wallpaper palette code and scoped landing styles own their respective runtime colors; this document describes intent rather than a second theme implementation.

## Typography

Manrope Variable headlines and timer numerals; Inter Variable interface text, with Manrope and Inter fallbacks. Use readable weights, modest tracking and tabular timer/metric numerals. Long copy wraps naturally; labels and names must not collide with controls.

## Surfaces

Keep chosen backgrounds visible. Put contrast behind text and controls locally. Avoid blanket dark overlays. Preserve user profile cosmetics and existing media entitlements. Panels share consistent rounding; clipping, media and focus rings must respect it.

## Layout

Desktop group rooms show ranking/members beside a generous chat panel. Keep compact group metadata and independently scrolling lists. Tablet and phone use reachable tabs without horizontal overflow. Test actual laptop heights as well as large screens.

## Components

The chat composer has one layout owner: a flexible message area containing textarea and expression/attachment controls, plus a 44px send control. Never revive the obsolete separate tools column. Reply previews, mentions, validation and character counts must remain usable. Management controls have explicit accessible names and must not steal member-name space.

## Motion and Media

Landing uses the approved fixed illustrated meadow video behind scrolling foreground content, with its matching poster. Preserve background selection across reloads and navigation. Respect reduced motion; avoid blur-up and stretched media.

## Verification

Review the actual DOM, screenshots and interactions at desktop, tablet and phone sizes before claiming visual completion. Check long names, empty/populated states, reply/mention tools and paused features. Build success is not visual approval. JEE Track is owner-enabled and opt-in. Its desktop forms use centered native dialogs; chapter/activity selection belongs in the existing timer subject menu. Keep titles and status badges readable on bright scenery without dimming the entire wallpaper.
