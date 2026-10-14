# Group Study Timer feature reference

Inspected the signed-in UI at https://groupstudytimer.com/timer on 1 October 2026. This is an observation of the exposed UI, not a verification of the service's backend behavior. The site includes hidden dialogs in its accessibility snapshots, so visible screenshots and working signed-in navigation were used to resolve the login state. No study sessions, tasks, profile settings, group membership, or messages were changed.

## Feature inventory

| Area | Observed functionality |
| --- | --- |
| Timer | Free count-up; 25-minute focus/5-minute break; 50-minute focus/10-minute break; 60- and 120-minute countdowns; custom duration; start/pause, reset, save session, fullscreen, Space shortcut |
| Home metrics | Subject count, today's study duration, current streak, this week's study duration, motivational quote, stats sharing entry point |
| Streak | Rules explicitly say at least one hour per day; missing a day resets the streak |
| Focus audio | Lofi, deep focus, binaural, rain, piano, anime, coding, white-noise presets; search/link and saved tabs; volume, mute, loop, previous/next, speed controls |
| Wallpapers | Static presets; upload JPG/PNG/WebP up to 10 MB; fill-screen and fit-without-crop; premium motion presets; GIF upload up to 5 MB; direct HTTPS GIF/MP4 links |
| Analytics | Year/month filters, daily-goal progress, total hours, session count, average duration, productivity score, daily average, goal achievement, best streak, subject pie/bar charts, hourly pattern, weekly/monthly trends, daily activity calendar, recent sessions grouped by day, Add Session entry point |
| AI | AI Analysis entry point in analytics; AI tutor/chat listed in premium privileges. Outputs and underlying quality were not exercised |
| Planner | Dated tasks; date/week navigation; month selector; Today, Backlog, Unscheduled lists; completion/deletion controls; exam countdown |
| Groups | Existing group switcher, member/online counts, group description, pin/bookmark, live rankings for today/yesterday/week/month, current study subject/status, rank movement, anti-cheat labels |
| Group chat | Group rules, invite entry point, older-message pagination, replies, mentions, system activity messages, emoji/GIF control, attachments, voice message control, send control |
| Global rankings | Today/yesterday/week tabs, live/reset indicator, personal standing, rank targets, positions gained, fair-play/anti-cheat rules entry point |
| Profile | Display/avatar editing entry point; study-group count; current/best streak; active days; weekly goal; student/exam profile; animated avatar presets/custom URL; joined-group list; support and reset/log-out controls |
| Syllabus | Selector includes JEE, NEET, SAT, IELTS, A-levels, ACT, IGCSE, CBSE, custom syllabus. Custom entry advertises subjects/modules/chapter checklists; tracker detail pages were not inspected |
| Other navigation | Communities, Inbox, Blog, Support. Communities was opened but its contents did not appear in the captured state; deeper workflows remain unverified |

## What this means for Sanctra

The reference's central workflow is timer → subject/session record → daily/weekly progress → analytics. Planning and groups support that workflow. Features worth retaining are the clear mode choices, visible elapsed time, short primary controls, subject tagging, day-based history, date-based tasks, and quietly visible peer presence.

Sanctra already contains timer modes, subjects, goals, session history/manual sessions, dated tasks/exam goals, profile/settings, analytics with a productivity score/hourly pattern/activity heatmap, and a groups UI. These observations come from the current local source and may change while Gemini continues work. Functional completeness, especially cloud sync and real group presence, must be checked at handover; visual similarity does not establish working parity.

The local source does not currently expose an equivalent ambient-audio library, separate global-ranking/community/inbox flows, full syllabus tracker, or motion-wallpaper system. Those are separate feature projects, beyond the requested UI/background polish. Group source currently supplies seeded/in-memory members and local room discovery, so real multi-user behavior remains a core gap.

## UI direction for the handover

- Use the reference for capability coverage and interaction structure, while giving Sanctra its own calm sanctuary identity.
- Put one focal timer and a clear start/pause action at the center. Make save/reset secondary and visibly distinguish focus from break.
- Use muted sage, evergreen, warm cream, natural photography, restrained frosted surfaces, and gentle spacing. The reference's saturated multi-color controls and luminous ring can be toned down.
- Keep wallpaper visible enough to set the mood, with reliable text contrast and a dimness control. Use the generated forest nook and rainy lake as locally served images.
- Give preset wallpapers meaningful names, a clear selected state, and mobile-safe crops. Reserve motion backgrounds for a later scoped feature with reduced-motion support.
- Keep audio optional and collapsible if added; avoid autoplay.
- Prefer useful progress and consistency information over crowding the focus screen with competition. Place detailed rankings/chat on their own screens.
- Check mobile drawer behavior, modal scroll/focus, keyboard shortcuts, countdown/break states, empty states, and refresh recovery before calling the UI complete.

## Suggested work order after Gemini finishes

1. Recheck the final code and existing bug findings, focusing on timer accuracy and account ownership.
2. Integrate the selected logo and optimized local backgrounds.
3. Improve the landing hero, typography, palette, and primary calls to action.
4. Polish timer, navigation, cards, modals, and mobile layouts as one coherent system.
5. Verify desktop/mobile flows and report any remaining functional gaps separately.

The user's current handover instruction is to wait until Gemini finishes before implementing these UI changes.
