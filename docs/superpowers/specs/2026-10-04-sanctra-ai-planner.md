# Sanctra AI Planner — research and proposed design

Status: proposed for review; no implementation or deployment is included in this planning task.
Research date: 4 October 2026. Sources describe product behavior, not Structured's private implementation.

## What Structured actually does

Structured accepts text, voice and photographed/uploaded planners. It uses the existing schedule when permitted, proposes task creation and changes, and allows individual acceptance, editing, dismissal or regeneration. Its documented text limit is 2,000 characters. On iPad/Mac the AI entry is in the top-right; its help center currently says AI requires Pro and is unavailable on Structured Web. [Create tasks guide](https://help.structured.app/en/articles/331074).

The editing flow supports shifting tasks, moving unfinished work, deleting tasks, before applying changes, and status badges describing accepted or dismissed suggestions. Imported external tasks cannot be edited/deleted by AI. [Edit/delete guide](https://help.structured.app/en/articles/3320002).

Replan is separately presented as a way to revisit missed tasks; do not assume every replan action needs an AI request. [Replan](https://help.structured.app/en/articles/4526850), [planning assistance](https://structured.app/planning-assistance).

The useful reference is the interaction: instructions → proposed timeline → review → selected application. We should implement that interaction with Sanctra's own design, task model and Gemini engine, rather than reproduce Structured's branding or claim their private algorithms.

## Current Sanctra evidence

- `src/components/modals/AiStudyAssistantModal.tsx`: existing drawer has Plan, Chat, Quiz and Insights. Plan asks for structured form inputs and calls `onTasksUpdated` immediately after generation. It offers no proposal acceptance or conflict review.
- `src/App.tsx:1405`: callback prepends new tasks to the latest local list, persists and triggers cloud sync. It cannot currently apply updates/deletes. The drawer receives subjects/sessions but not tasks or exam goals.
- `src/types/index.ts:138`: TaskItem already has title (`text`), date, start/end times, category, subject/goal/workspace IDs. No subtasks or recurring-task schema exists.
- `src/utils/taskSchedule.ts`: time validation and focus duration exist. `scheduledTasksForDay` currently requires category='today', which can hide a future task when its date arrives; integration must resolve this.
- App's `spaceTasks`/`spaceSessions` currently alias all tasks/sessions. Do not assume these are already workspace-filtered.
- `src/utils/aiLogic.ts`: Gemini engine exists, but schedule JSON is cast rather than runtime validated; malformed JSON is repaired heuristically. New planner must use a separate strict parser.
- Current Insights estimates breaks from session count and imposes artificial minimum time/session counts. These are not measured study data.
- Uncommitted Gemini edits exist in aiLogic.ts, Firebase initialization, drawer and appCheck.ts; reconcile those deliberately at execution start.
- appCheck.ts currently includes a production fallback to a development provider; direct-key request fallback also exists. Neither should ship as the production planner transport.

## Proposed first release

Keep the Sanctra AI button and side drawer. Make **Plan my day** the default, with **Study tutor** as a separate mode. Existing quiz remains reachable under tutor; existing insights must stop reporting invented measurements before release.

Example: “Tomorrow, revise electrostatics for 45 minutes at 6 pm, then practise integration for an hour. Move my unfinished chemistry task to Friday.”

1. User writes instructions or picks a suggestion: Plan my evening, Replan unfinished tasks, Make room for revision.
2. Date and workspace context are visible. A toggle, off by default, lets the user include existing task titles and schedule; a separate off-by-default toggle includes exam names/deadlines. Without task context only creates are allowed, with a clear warning that conflicts cannot be checked.
3. Generate sends one bounded request. Ambiguity produces a short follow-up question, not guessed changes.
4. Result shows a local-date timeline and proposal cards marked Add, Update or Remove. Updates show before/after. Cards can be edited, selected or dismissed.
5. Nothing is saved before **Apply selected**. Application validates again against current tasks, reports stale/conflicting suggestions, and does not apply a selected group containing blocking issues.
6. Success badges show what was applied. **Open Tasks** reveals the result. **Undo** reverses this local batch only when its affected tasks still match the applied state; later edits are preserved and conflicts are reported.

Deletion is opt-in through an explicit **Allow removal suggestions** control (off by default) and each removal must be selected individually. Apply-all must not select removals automatically. Completed tasks cannot be changed in the first release.

## Global constraints

- Target desktop 1440×1000 and iPad 834×1112 and 1194×834; also test a 600px content width with sidebar present.
- Use Sanctra's blue/glass tokens and the Appearance blur setting; no neon, new gradients as wallpapers, or copied branding.
- Registered accounts only; invalidate pending requests, drafts and undo on account/workspace change.
- Use existing React 19, TypeScript strict, Firebase 12 and node:test; no new runtime dependency for core planning.
- Use Firebase AI Logic with GoogleAIBackend and model `gemini-3.8-flash`; reverify model support immediately before execution.
- No Blaze upgrade or Cloud Functions is required by this design; free-tier quotas still apply and zero-cost unlimited usage is not promised.
- Production must use App Check with reCAPTCHA Enterprise; never ship a debug token or a Gemini Developer API secret to the browser.
- Generation never writes tasks; only reviewed application uses App's persistence and cloud-sync path.
- Maximum 2,000 instruction characters, 30 operations per response, 100 context tasks, and a 31-local-day planning horizon including today.
- Maximum task title 200 characters; exact valid local dates and HH:mm times; start and end are both absent or both present with end > start, no overnight slots.
- AI can create/update/remove TaskItem records only; never alter sessions, timer totals, rankings, subscriptions, exam goals or profile identity.
- No background AI calls, automatic retry loops, raw provider error display or unsupported feature claims.

## Data and mutation decisions

Use an explicit response envelope `{version:1,summary,question?,operations}` and fixed operation kinds `create|update|delete`. Model IDs are references only to context tasks/subjects/goals; client creates proposal and new task IDs. A create/update draft contains text, dueDate (nullable for unscheduled), startTime/endTime, subjectId and goalId. IDs, completion, ownership, category and creation timestamps are assigned/preserved by deterministic client code, never supplied by the model.

Read only unfinished in-scope tasks. Scope matching uses existing `belongsToWorkspace` with legacySpaceId for old unassigned records. Up to 100 context tasks are sorted by requested local date first, then dated tasks, then undated tasks, tie by ID. Show truncation; the user narrows a date range if an intended target was omitted. Context excludes account identity, email, location, notes, group/support messages and study session raw records. Context IDs are opaque and not authorization.

A proposed date outside today..today+30, invalid calendar date, dangling ID, completed/out-of-scope target, duplicate update/delete target, unknown key, reversed slot, or unavailable goal is blocking. Overlaps are half-open intervals: 09:00–10:00 followed by 10:00–11:00 is allowed. Check the final selected schedule, excluding originals being moved or removed, against unmodified tasks. Overlap or an exact duplicate create blocks apply; edit/discard to resolve it. Without task context, warn that existing overlaps are unknown; still check selected proposals against each other.

Undated tasks have category unscheduled, dueDate='' and no times. Dated task category is 'today' for dates >= today and 'backlog' for dates < today; views must use dueDate for day placement, not assume category means the current date. No new task fields or Firestore collections are needed. Existing storage and sync sanitize/write ordinary TaskItem values.

Application reads the freshest local state. Updates/removals compare a captured canonical task fingerprint; changes since preview block that operation. Creates are deduplicated by title/date/time/subject/goal, not only random ID. Applied operation IDs are retained for the drawer lifetime to prevent double click/reapplication. Undo uses per-task before/after records, not whole-list replacement.

Existing cloud sync is not a multi-device transaction. Local stale-state checks are required, but simultaneous remote edits can still race after submission. Do not promise distributed atomicity; surface existing sync errors and verify reconciliation in staging. A transactional sync redesign is separate scope if tests expose lost updates.

## Architecture and feasibility

The model produces proposals only; it does not receive executable tools or database write access. Firebase AI Logic supports JSON response schemas. Use schema-constrained output plus independent runtime validation: schema alone cannot establish ownership, valid dates, overlaps or user intent. [Structured output](https://firebase.google.com/docs/ai-logic/generate-structured-output).

`gemini-3.8-flash` is currently documented as supported without billing required. App Check's documented web provider is reCAPTCHA Enterprise. Actual project configuration and successful authenticated production requests remain execution checks, not verified by this research. [Models](https://firebase.google.com/docs/ai-logic/models), [App Check](https://firebase.google.com/docs/ai-logic/app-check).

Use one request with 45-second UI timeout, no automatic retries, explicit Retry/Regenerate, disabled repeated submission, and stale-response discard. Network work may continue at the SDK level after timeout; ignore its results and prevent writes. Preserve typed instructions on failure. Render AI text as escaped text, not HTML.

## File boundaries

`src/features/ai-planner/types.ts`: shared request/proposal/result contracts.
`context.ts`: scope-safe, minimal local-date context.
`validation.ts`: untrusted JSON parsing, draft checks, selection conflict checks.
`service.ts`: prompt, Firebase response schema and injected transport.
`apply.ts`: pure reviewed mutation and undo against fresh state.
`PlannerPanel.tsx`: instructions, context toggles and request lifecycle.
`ProposalTimeline.tsx`: editable timeline/cards and application statuses.
`ai-planner.css`: scoped token-based responsive UI.
Existing drawer is the shell/mode switch; App owns persistence, cloud sync and navigation.

## Later independent increments (not hidden first-release requirements)

1. **Real study insights:** separate plan using measured totals, per-subject time, streaks and completion, with opt-in aggregate context. No inferred burnout diagnosis or invented breaks. In first release remove misleading existing pacing values/copy or replace with a truthful local summary until this ships.
2. **Photo timetable import:** one JPEG/PNG/WebP, max 5MB; user previews and explicitly submits it; Gemini extracts proposals into the same review pipeline. No file stored remotely by Sanctra. PDFs, document cropping/OCR tools and private-photo retention require a separate specification.
3. **Voice:** user-initiated microphone, editable transcript before Generate, with text fallback. iPad Safari compatibility must be verified; do not depend on Web Speech support as universal.
4. **Recurring tasks/subtasks/calendar imports:** require changes to the current task model; separate scope, not simulated by undocumented fields.

## Acceptance

A user can create a study evening, shift existing unfinished tasks, and individually remove selected tasks through reviewed proposals. They can edit/discard suggestions and undo their applied batch without overwriting later edits. Missing context/ambiguous input/error leaves tasks unchanged. Saved tasks are visible on the correct local day and can open the existing focus timer. All three platform dimensions and 600px content width are usable, with keyboard focus/Escape handled. Mocked tests prove the behavior; one authenticated staging request proves AI connectivity; production release requires configured App Check, no secrets/debug-provider fallback, successful build and regression checks.
