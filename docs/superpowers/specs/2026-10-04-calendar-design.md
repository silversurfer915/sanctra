# Sanctra Calendar — proposed design

Status: research and design complete; awaiting design review before implementation.

## Outcome

Add Calendar to the main navigation. It is the place to see and arrange existing Tasks, personal events and exam dates together. Selecting any date exposes its full agenda and editable details. Use Sanctra's existing glass clarity, theme colours, quiet typography and controls. Tasks remain the task-management view; exam configuration remains in Edit profile.

## Reference ideas and approach

TickTick: month/week views, date selection, arranging undated tasks, dragging tasks to dates and time slots. Todoist: events and time-blocked tasks coexist, with all-day items clearly separated from timed items. Adopt these interaction patterns, not their branding or screen design.

Options considered:
1. Calendar feed: simple, but read-only and cannot satisfy two-way sync.
2. Browser-only Calendar API: works while the app is open, but cannot reliably sync offline changes or keep credentials server-side.
3. Native calendar plus server-backed Google synchronization: recommended. A useful calendar independent of Google, with a durable sync service.

## Calendar interface

- New Calendar menu beside Tasks; month view by default. Month, Week and Agenda switches; Today, previous/next, month/year selector, timezone label and Add action.
- Desktop: a wide calendar and compact selected-day agenda. Mobile: calendar above the selected-day list, with Agenda as a practical narrow-screen view.
- Month: Monday-first calendar, adjoining-month dates subdued, today outlined, selected date accented. Up to three short item previews and a '+N more' button; selecting a date or overflow opens every item for that day.
- Week: 24-hour scrollable time grid, separate all-day row, overlapping blocks side by side, current-time indicator. Scroll initially near current time rather than hiding early/late events.
- Agenda: grouped chronological list over the visible range. Date navigation retains the selected date across view changes.
- Each item shows a task/event/exam icon and label as well as colour. Filters for Tasks, Events, Exams and completed tasks. Empty dates have a direct Add action.
- Selecting a task opens its editor with title, date, times and subject; complete/uncomplete, reschedule and Focus use the existing task actions. Calendar and Tasks update together immediately.
- Event editor: title, notes, location, all-day or start/end, timezone and daily/weekly recurrence with optional end date. Editable existing events; explicit series-versus-occurrence choice for recurring edits.
- Exam item: target date and countdown; opens the existing exam editor in profile. Changing a date updates the same goal, not a duplicate.
- Compact Arrange tasks drawer for undated tasks and overdue tasks. Drag to a day or time slot, or use a keyboard/touch date-and-time picker. Dragging never silently completes a task.
- Overlap warning before saving conflicting study tasks; events may overlap and show visibly. Undo for moves and local deletes. All controls keyboard-accessible; arrows move date selection, Enter opens it, Escape closes details.

## Native data and persistence

Keep Tasks and ExamGoals as sources of truth; derive their calendar entries rather than copying them into a second task list. Scope entries to the signed-in account and active desk using belongsToWorkspace.

Add CalendarEvent records: id, workspaceId, title, notes, location, start/end (instants for timed events), startDate/endDateExclusive for all-day events, IANA timezone, recurrence, recurrence exceptions, createdAt, updatedAt, revision and tombstone. All-day date strings must never be converted through UTC midnight.

Extend account cache and cloud persistence deliberately: resolveAccountData currently knows only sessions, subjects, tasks and examGoals. Add calendarEvents with migration defaults, account-switch isolation, realtime updates, export/import support and explicit Firestore owner rules. Do not replace unrelated account arrays during sync.

Use shared date utilities and an independent calendar projection module for month ranges, day membership, overnight spans, recurrence expansion, sorting and week positioning. Stable IDs permit links from Google events to their original task/goal/event.

## Google Calendar: real two-way synchronization

Connect Google Calendar is separate from Sanctra sign-in. A user explicitly grants calendar access, selects calendars to display and writable calendars to synchronize. Show the actual connected account, calendar names, permission status, last sync, pending changes and actionable errors. Read-only shared calendars remain view-only.

Use a separate server service rather than widening the AI gateway. It validates Firebase ID tokens, owns OAuth authorization/callback endpoints, stores encrypted refresh credentials in server-only storage and handles the durable sync queue. OAuth state is random, short-lived, one-time and bound to the authenticated Sanctra user. Tokens and secrets never enter app caches, logs or client-readable Firestore documents.

Create a dedicated Sanctra calendar for exported tasks and exam dates. Personal Google calendars can be selected for native events. Ordinary Google events import as events, not todos. Linked task/event/exam edits propagate both directions: title and time/date updates, new records and explicit deletion. Completed tasks remain visible with a completion marker; completion is managed in Sanctra because Google events have no task-completion field. Deleting an exported Google task event clears its calendar placement and unschedules the task; deleting an exam event disables that export instead of erasing the goal. These behaviours are stated in connection settings.

Maintain mappings containing account/desk/local kind/local ID/calendar ID/Google event ID, remote etag, last synchronized local revision and snapshots. Use deterministic export IDs and private extended properties to prevent duplicate import or echoes. Avoid modifying attendee lists, invitations or conferencing information when editing imported events.

Initial paginated sync stores nextSyncToken only after the final page. Incremental sync includes cancelled records; HTTP 410 invalidates the token and triggers safe reconciliation. Watch-channel callbacks enqueue incremental sync, with channel verification, expiration renewal and scheduled reconciliation for missed notices. A background queue retries transient failures and rate limits with backoff; revoked credentials show Reconnect. Offline native edits stay queued.

Conflict policy: compare both sides against the last synchronized snapshot. If both changed, surface a conflict with local/Google versions and choose which to keep; do not silently overwrite. Updates use etag preconditions. Deletions use tombstones and have a review/Undo window before remote removal. Disconnect revokes credentials, stops watchers and queues, and preserves native data and existing Google events by default.

Recurring Google events retain parent/instance identity and support single occurrence versus entire series. Native daily/weekly recurrence exports equivalently. Unsupported Google recurrence remains represented and editable through Google without rewriting the rule; each visible occurrence still appears on its date. Dates, DST changes, exclusive all-day end dates and overnight events require explicit tests.

## Required Google configuration

Calendar API enabled for the project, a web OAuth client with registered callback URL, consent-screen configuration and requested Calendar scopes. Use the minimum scopes supporting selected calendar reads and writes; account for public-app verification requirements. Existing Firebase Google sign-in and the Gemini API key do not provide Google Calendar access. Deployment needs server credentials and storage configured; each user must then complete Google consent.

## Verification and release criteria

- Real existing task and exam records visible on correct dates; each click exposes the complete selected-day list.
- Add/edit/complete/reschedule/move operations persist across reload and account switches, and update Tasks/profile immediately.
- Month boundaries, leap day, midnight, DST, overnight and recurring/all-day events correct; more-than-three items accessible; keyboard and touch paths work.
- Desktop, tablet and mobile visually match all Sanctra appearance settings, including glass clarity. No clipped text or horizontal overflow.
- Automated sync integration tests: initial/paginated/incremental sync, expired token, remote cancellations, bidirectional edits, retry idempotence, conflicts, recurrence exceptions, read-only calendars and disconnect.
- Authorized disposable calendar live test creates and edits an event from each side, verifies both results, checks a linked task time change and tests reconnect. No claim of two-way sync based only on mocked responses.
- Ship native calendar and sync in independently verifiable checkpoints. If Google configuration blocks live sync, retain the working native calendar and show honest connection status; do not label sync as working.

## Sources

- https://blog.ticktick.com/2020/11/30/ticktick-calendar-quickstart/
- https://www.todoist.com/help/articles/use-the-calendar-integration-rCqwLCt3G
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/guides/sync
- https://developers.google.com/workspace/calendar/api/guides/push
