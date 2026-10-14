# JEE Track integration — 11 October 2026

## Reference and evidence

Read-only signed-in exploration of https://www.jeetrack.in/ covered dashboard, Mains, Advanced, comparison, hours, tasks, backlog, syllabus, practice and AI. Publicly delivered JavaScript was independently inspected with the reverse-engineer-anything CLI; the source code and artwork are not reused in Sanctra.

REA evidence: `ev_b4e5342ecf880775cb8cab97edb1e9198ebf17219af65dcbfb9500f516e921ad`; artifact digest `2e827cae4a4481635cce982915ce50227fd158071f0a19599ea1518a96acf7e3`. Local evidence is under `outputs/jeetrack-reference/`. Static analysis cannot establish provider credentials, every backend operation or notification delivery.

## Implemented workflows

- Opt-in account preference under Settings → Preferences; hidden JEE navigation when off, retained records when disabled, independent admin pause.
- Empty account defaults, individual private Firestore records, account-scoped offline pending writes, retry and visible synchronization status. No automatic import of shared-device legacy records.
- Mains and Advanced mock CRUD, full/partial scope, Advanced paper filters, actual maximum marks, score/percentage trends, subject and distribution comparisons, upcoming mock CRUD.
- Theory/practice/revision tracking, class/subject/chemistry filters, custom chapters, direct chapter focus and practice logging.
- Explicit question counts, personal weekly goals, daily/range distributions and practice history CRUD.
- Priority backlogs with date-based clearing streaks and CRUD.
- Shared Sanctra planner tasks; no second task store. New tasks inherit the current workspace.
- Saved Sanctra timer sessions carry subject/chapter/activity metadata through timer drafts and active-session takeover. JEE hours derive once from each saved session's focused duration. No practice question count is inferred from time. Manual hours stay explicitly manual and do not grant leaderboard credit.
- Profile/goals and personal exam planning dates; no guessed official dates or fabricated rank/percentile.
- Validated JSON backup/restore and printable real scorecards using the browser Save PDF facility.
- Authenticated factual coaching through Sanctra's existing gateway and shared allowance. Structured output is checked; plans prefill the existing AI planner for explicit review rather than silently creating tasks.

## Curriculum basis

The 92 preparation chapters are a practical topic map, not a claim of 92 official syllabus chapters. Verified missing experimental skills, states of matter and environmental chemistry were added with stable IDs; prior chapter IDs/progress are preserved. Official scope: [NTA Main 2026](https://jeemain.nta.nic.in/document/syllabus-2026/) and [Advanced 2026](https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf). Users should check published scope for their target year.

## Deliberate boundaries

No unsupported percentile/rank predictor, readiness claim, scheduled email or push toggle is shipped. Existing Sanctra account, appearance, inbox and timer systems retain authority. The reference's optional notifications are not represented as working without backend delivery.

## Verification and release gate

Pure data/coaching tests, gateway integration with mocked provider, owner isolation and record validation in the Firestore emulator, and isolated browser CRUD/reload checks are available. Production authentication, real provider credentials and two-device synchronization must be reported separately from these checks. Keep the platform pause until those live checks pass.
